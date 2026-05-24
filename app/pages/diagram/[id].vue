<template>
  <div v-if="loading" class="loader-screen">
    <div class="spinner-ring"></div>
    <span class="loading-text">Synchronizing schema & session...</span>
  </div>

  <div v-else class="diagram-workspace animate-fade-in" @keydown.space="onSpaceKeyDown" @keyup.space="onSpaceKeyUp" tabindex="0">
    <!-- Navbar header -->
    <header class="glass-header workspace-header">
      <div class="header-left">
        <button class="back-btn" @click="goHome" title="Back to Dashboard">
          <ArrowLeft class="header-icon" />
        </button>
        <div class="title-section">
          <input 
            v-model="diagram.name" 
            type="text" 
            class="diagram-title-input" 
            :disabled="myRole === 'viewer'"
            @change="updateDiagramSettings"
          />
          <span class="dialect-badge" :class="`badge-${diagram.dialect}`">{{ diagram.dialect }}</span>
          
          <!-- Cloud Saving Indicator widget -->
          <div class="save-status-indicator animate-fade-in" :class="saveStatus">
            <span class="status-dot"></span>
            <span class="status-text">{{ saveStatusText }}</span>
          </div>
        </div>
      </div>

      <!-- Collaborators Top Tray -->
      <div class="header-center">
        <div class="collaborators-list">
          <div 
            v-for="peer in collaborators" 
            :key="peer.peerId" 
            class="collaborator-avatar-box"
            :class="[peer.role]"
            :style="{ '--collab-color': peer.color }"
            :title="`${peer.name} (${peer.role.toUpperCase()}${peer.userId === user.userId ? ' - You' : ''})`"
          >
            <img :src="peer.avatarUrl" alt="Avatar" class="collab-avatar" />
            <span class="online-indicator"></span>
            <span class="role-badge-mini" :class="`role-${peer.role}`">
              {{ peer.role === 'owner' ? 'O' : (peer.role === 'editor' ? 'E' : 'V') }}
            </span>
          </div>
        </div>
        
        <button class="btn btn-secondary btn-share" @click="copyShareLink" :class="{ 'glow-success': showShareGlow }">
          <Share2 class="btn-icon" />
          {{ showShareGlow ? 'Link Copied!' : 'Invite' }}
        </button>
      </div>

      <div class="header-right">
        <!-- If guest viewer: Request access -->
        <button 
          v-if="myRole === 'viewer'" 
          class="btn btn-primary btn-request-access" 
          :class="accessRequestStatus"
          :disabled="accessRequestStatus === 'pending'"
          @click="requestEditAccess"
        >
          <span v-if="accessRequestStatus === ''">Request Edit Access</span>
          <span v-else-if="accessRequestStatus === 'pending'">Requesting Access...</span>
          <span v-else-if="accessRequestStatus === 'denied'">Access Denied</span>
        </button>
        
        <!-- If owner or approved editor: standard tools -->
        <template v-else>
          <button class="btn btn-secondary btn-export" @click="showExportModal = true">
            <Download class="btn-icon" /> Export
          </button>
          <button class="btn btn-primary btn-add-table" @click="createNewTable">
            <Plus class="btn-icon" /> Add Table
          </button>
        </template>
      </div>
    </header>

    <!-- Sidebars layouts -->
    <SidebarLeft 
      :class="{ 'is-collapsed': !isLeftSidebarOpen }"
      :tables="tables"
      :columns="columns"
      :relations="relations"
      :active-table-id="selectedTableId"
      :dialect="diagram.dialect"
      @select-table="selectElement('table', $event)"
      @center-table="centerTableOnCanvas"
      @update-dialect="updateDialect"
    />

    <!-- Left Sidebar Toggle Button -->
    <button 
      class="sidebar-toggle-btn left-toggle"
      :class="{ 'is-sidebar-closed': !isLeftSidebarOpen }"
      @click="isLeftSidebarOpen = !isLeftSidebarOpen"
      :title="isLeftSidebarOpen ? 'Collapse Navigation' : 'Expand Navigation'"
    >
      <ChevronLeft v-if="isLeftSidebarOpen" class="toggle-icon" />
      <ChevronRight v-else class="toggle-icon" />
    </button>

    <!-- Main Zoomable & Pannable Grid Canvas -->
    <div 
      ref="canvasContainer"
      class="canvas-container"
      :class="{ 'cursor-grab-mode': spacePressed, 'cursor-grabbing-mode': isPanning }"
      @mousedown="onCanvasMouseDown"
      @mousemove="onCanvasMouseMove"
      @mouseup="onCanvasMouseUp"
      @wheel="onCanvasWheel"
      @contextmenu.prevent="showContextMenu"
    >
      <div 
        class="canvas-viewport"
        :style="{
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
          transformOrigin: '0 0'
        }"
      >
        <!-- Fine Dot Grid background -->
        <div class="canvas-grid-bg"></div>

        <!-- SVG Relations Connection Lines Layer -->
        <svg class="svg-relations-layer">
          <!-- Active temporary dragging connector -->
          <path 
            v-if="activeRelationDrag"
            :d="getBezierPath(
              activeRelationDrag.portX,
              activeRelationDrag.portY,
              activeRelationDrag.currentX,
              activeRelationDrag.currentY
            )"
            class="svg-drag-line"
          />

          <!-- Persisted visual foreign keys curves -->
          <g v-for="rel in relations" :key="rel.id">
            <path 
              :d="drawRelationPath(rel)"
              class="svg-connection-path"
              :class="{ 'is-selected': selectedRelationId === rel.id }"
              @mousedown.stop
              @click.stop="selectElement('relation', rel.id)"
            />
          </g>
        </svg>

        <!-- Dynamic Tables Cards -->
        <TableCard 
          v-for="t in tables" 
          :key="t.id"
          :table="t"
          :columns="columns.filter(c => c.table_id === t.id)"
          :is-selected="selectedTableId === t.id"
          :selected-column-id="selectedColumnId"
          :zoom="scale"
          :read-only="myRole === 'viewer'"
          @select="selectElement('table', t.id)"
          @select-column="selectElement('column', $event)"
          @drag="onTableDrag"
          @drag-end="onTableDragEnd"
          @start-relation-drag="onStartRelationDrag"
        />

        <!-- Floating Collaborators smooth cursors -->
        <div 
          v-for="peer in remoteCursors" 
          :key="peer.peerId"
          class="collaborator-cursor"
          :style="{
            transform: `translate(${peer.cursor.x}px, ${peer.cursor.y}px)`,
            '--cursor-color': peer.color
          }"
        >
          <div class="collaborator-cursor-pointer"></div>
          <div class="collaborator-cursor-label">{{ peer.name }}</div>
        </div>
      </div>

      <!-- Right-Click Context Menu overlay panel -->
      <div 
        v-if="contextMenu.show" 
        class="custom-context-menu glass-panel"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <div v-if="contextMenu.type === 'canvas'">
          <button class="context-menu-item" @click="handleContextMenuAddTable">
            <Plus class="context-menu-icon" /> Add Table Here
          </button>
        </div>
        <div v-else-if="contextMenu.type === 'table'">
          <button class="context-menu-item" @click="handleContextMenuAddColumn">
            <Plus class="context-menu-icon" /> Add Column
          </button>
          <div class="context-menu-divider"></div>
          <button class="context-menu-item text-danger" @click="handleContextMenuDeleteTable">
            <Trash2 class="context-menu-icon" /> Delete Table
          </button>
        </div>
      </div>
    </div>

    <!-- Right Side Context Panel Inspector -->
    <SidebarRight 
      :class="{ 'is-collapsed': !isRightSidebarOpen }"
      :active-type="inspectorType"
      :tables="tables"
      :columns="columns"
      :relations="relations"
      :selected-table-id="selectedTableId"
      :selected-column-id="selectedColumnId"
      :selected-relation-id="selectedRelationId"
      :dialect="diagram.dialect"
      :read-only="myRole === 'viewer'"
      @update-table="handleTableUpdate"
      @update-column="handleColumnUpdate"
      @update-relation="handleRelationUpdate"
      @delete-table="handleTableDelete"
      @delete-column="handleColumnDelete"
      @delete-relation="handleRelationDelete"
      @add-column="handleColumnCreate"
      @select-table="selectElement('table', $event)"
      @select-column="selectElement('column', $event)"
      @add-relation="handleRelationCreate"
    />

    <!-- Right Sidebar Toggle Button -->
    <button 
      class="sidebar-toggle-btn right-toggle"
      :class="{ 'is-sidebar-closed': !isRightSidebarOpen }"
      @click="isRightSidebarOpen = !isRightSidebarOpen"
      :title="isRightSidebarOpen ? 'Collapse Inspector' : 'Expand Inspector'"
    >
      <ChevronRight v-if="isRightSidebarOpen" class="toggle-icon" />
      <ChevronLeft v-else class="toggle-icon" />
    </button>

    <!-- Exporter Modal panel -->
    <ExportModal 
      v-if="showExportModal"
      :tables="tables"
      :columns="columns"
      :relations="relations"
      :dialect="diagram.dialect"
      :diagram-name="diagram.name"
      @close="showExportModal = false"
    />

    <!-- Canvas Floating UI zoom controllers -->
    <div class="zoom-floating-toolbar glass-panel">
      <button class="zoom-icon-btn" @click="changeZoom(0.1)" title="Zoom In">
        <Plus class="zoom-icon" />
      </button>
      <span class="zoom-percent-label">{{ Math.round(scale * 100) }}%</span>
      <button class="zoom-icon-btn" @click="changeZoom(-0.1)" title="Zoom Out">
        <Minus class="zoom-icon" />
      </button>
      <div class="divider-v"></div>
      <button class="zoom-icon-btn" @click="resetViewport" title="Fit Screen / Reset">
        <Maximize2 class="zoom-icon" />
      </button>
    </div>

    <!-- Floating Host Approvals dialog overlay -->
    <div v-if="activeRequests.length > 0" class="floating-approvals-box glass-panel animate-slide-in">
      <div class="approvals-header">
        <span class="approval-title">Access Request</span>
        <span class="requests-count-badge">{{ activeRequests.length }} pending</span>
      </div>
      <div v-for="req in activeRequests" :key="req.peerId" class="approval-request-row">
        <div class="request-user-info">
          <span class="request-name">{{ req.name }}</span>
          <span class="request-desc">requests editor rights</span>
        </div>
        <div class="approval-actions">
          <button class="btn btn-sm btn-danger-outline" @click="denyEditAccess(req)">Deny</button>
          <button class="btn btn-sm btn-primary" @click="approveEditAccess(req)">Approve</button>
        </div>
      </div>
    </div>

    <!-- Guest overlay when pending access request -->
    <div v-if="myRole === 'viewer' && accessRequestStatus === 'pending'" class="fullscreen-access-modal animate-fade-in">
      <div class="access-modal-content glass-panel text-center">
        <div class="spinner-ring"></div>
        <h3 class="modal-title-glow">Waiting for Host Approval</h3>
        <p class="modal-desc">You are currently in Viewer mode. The host has been notified of your request to edit this canvas.</p>
      </div>
    </div>

    <!-- Beautiful Custom Web Modal for Table Deletion Confirmation -->
    <div v-if="deleteTableModal.show" class="fullscreen-access-modal animate-fade-in delete-modal-overlay">
      <div class="access-modal-content glass-panel text-center delete-modal-content">
        <h3 class="modal-title-glow text-danger-glow">Delete Table</h3>
        <p class="modal-desc">
          Are you sure you want to delete table <strong class="text-white">"{{ deleteTableModal.tableName }}"</strong>?
        </p>
        <p class="modal-sub-desc">
          This will permanently remove the table, all of its columns, and any relationships connected to it. This action cannot be undone.
        </p>
        <div class="modal-buttons">
          <button class="btn btn-secondary btn-sm" @click="deleteTableModal.show = false">
            Cancel
          </button>
          <button class="btn btn-danger btn-sm" @click="confirmTableDelete">
            Delete Table
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '~/composables/useAuth';
import { 
  ArrowLeft, Share2, Plus, Download, 
  Maximize2, ChevronLeft, ChevronRight
} from 'lucide-vue-next';

// Sidebar toggle collapsed states
const isLeftSidebarOpen = ref(true);
const isRightSidebarOpen = ref(true);

// Standard dimension configurations for canvas port calculations
const TABLE_WIDTH = 220;
const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 32;

const route = useRoute();
const { user, fetchUser } = useAuth();

// Core Diagram schema models
const loading = ref(true);
const diagram = ref({ name: 'Untitled Diagram', dialect: 'postgresql' });
const tables = ref([]);
const columns = ref([]);
const relations = ref([]);

// Active selections context state
const inspectorType = ref(''); // 'table' | 'column' | 'relation' | ''
const selectedTableId = ref('');
const selectedColumnId = ref('');
const selectedRelationId = ref('');

// Exporter state
const showExportModal = ref(false);
const showShareGlow = ref(false);

// Viewport Zooming/Panning coordinates
const scale = ref(1);
const panX = ref(100);
const panY = ref(100);
const isPanning = ref(false);
const dragStartCanvas = ref({ x: 0, y: 0 });
const spacePressed = ref(false);
const canvasContainer = ref(null);

// WebSockets Collaboration session objects
let socket = null;
const collaborators = ref([]);
const remoteCursors = computed(() => 
  collaborators.value.filter(c => c.cursor && c.userId !== user.value?.userId)
);

// Drag to connect visual guides
const activeRelationDrag = ref(null);

// Roles and Save States
const saveStatus = ref('saved'); // 'saved' | 'saving' | 'offline'
const myRole = ref('viewer'); // 'owner' | 'editor' | 'viewer'
const myPeerId = ref(null);
const latestAckId = ref(null);
const accessRequestStatus = ref(''); // '' | 'pending' | 'denied'
const activeRequests = ref([]); // hosts pending approvals list

// Context Menu reactive state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  type: '', // 'canvas' | 'table'
  targetId: null,
  canvasCoords: { x: 0, y: 0 }
});

const showContextMenu = (e) => {
  if (myRole.value === 'viewer') return;
  
  const rect = canvasContainer.value?.getBoundingClientRect();
  if (!rect) return;
  
  const screenX = e.clientX;
  const screenY = e.clientY;
  
  // Calculate relative coordinate positions for the context menu modal rendering
  const relativeX = screenX - rect.left;
  const relativeY = screenY - rect.top;
  
  // Convert screen coordinates into zoomed/panned viewport coordinates
  const canvasX = Math.round((screenX - rect.left - panX.value) / scale.value);
  const canvasY = Math.round((screenY - rect.top - panY.value) / scale.value);
  
  // Check if click was inside a table card
  const tableEl = e.target.closest('.table-card');
  if (tableEl) {
    // Find matching table object by title/id context
    const tableName = tableEl.querySelector('.table-name-text')?.textContent?.trim();
    const tableObj = tables.value.find(t => t.name === tableName);
    if (tableObj) {
      contextMenu.value = {
        show: true,
        x: relativeX,
        y: relativeY,
        type: 'table',
        targetId: tableObj.id,
        canvasCoords: { x: canvasX, y: canvasY }
      };
      return;
    }
  }
  
  // Otherwise, fallback to canvas context menu
  contextMenu.value = {
    show: true,
    x: relativeX,
    y: relativeY,
    type: 'canvas',
    targetId: null,
    canvasCoords: { x: canvasX, y: canvasY }
  };
};

const closeContextMenu = () => {
  contextMenu.value.show = false;
};

const handleContextMenuAddTable = () => {
  const { x, y } = contextMenu.value.canvasCoords;
  createNewTableAt(x, y);
  closeContextMenu();
};

const handleContextMenuAddColumn = () => {
  if (contextMenu.value.targetId) {
    handleColumnCreate(contextMenu.value.targetId);
  }
  closeContextMenu();
};

const handleContextMenuDeleteTable = () => {
  if (contextMenu.value.targetId) {
    triggerTableDelete(contextMenu.value.targetId);
  }
  closeContextMenu();
};

const createNewTableAt = (x, y) => {
  deselectAll();
  
  const presetColors = ['table-theme-violet', 'table-theme-emerald', 'table-theme-rose', 'table-theme-amber', 'table-theme-blue'];
  const randomColor = presetColors[Math.floor(Math.random() * presetColors.length)];

  const newTable = {
    id: crypto.randomUUID(),
    diagram_id: diagram.value.id,
    name: `new_table_${tables.value.length + 1}`,
    color: randomColor,
    x,
    y
  };
  
  tables.value.push(newTable);
  selectElement('table', newTable.id);
  
  sendWSEvent({
    type: 'table-create',
    table: newTable
  });
};

const saveStatusText = computed(() => {
  if (saveStatus.value === 'saving') return 'Saving...';
  if (saveStatus.value === 'offline') return 'Offline';
  return 'Cloud Synced';
});

onMounted(async () => {
  // 1. Verify User Login
  await fetchUser();
  if (!user.value) {
    navigateTo('/login');
    return;
  }
  
  // 2. Fetch diagram structure from SQLite
  await loadDiagramSchema();
  
  // 3. Connect WebSocket Sharing Session
  connectWebSocket();
  
  // Listeners for escape or deselects
  window.addEventListener('keydown', onGlobalKeyDown);
  window.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  if (socket) socket.close();
  window.removeEventListener('keydown', onGlobalKeyDown);
  window.removeEventListener('click', closeContextMenu);
});

// Diagram Loading API
const loadDiagramSchema = async () => {
  try {
    const data = await $fetch(`/api/diagrams/${route.params.id}`);
    diagram.value = data.diagram;
    tables.value = data.tables || [];
    columns.value = data.columns || [];
    relations.value = data.relations || [];
  } catch (e) {
    console.error('Failed to load diagram schema:', e);
    navigateTo('/');
  } finally {
    loading.value = false;
  }
};

// WebSocket Event Relay logic
const connectWebSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const isOwner = diagram.value.user_id === user.value.userId;
  myRole.value = isOwner ? 'owner' : 'viewer';
  
  const wsUrl = `${protocol}//${window.location.host}/ws?diagramId=${diagram.value.id}&userId=${user.value.userId}&name=${encodeURIComponent(user.value.name)}&avatarUrl=${encodeURIComponent(user.value.avatarUrl)}&role=${myRole.value}`;
  
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    saveStatus.value = 'saved';
  };
  
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    
    switch (msg.type) {
      case 'ack':
        if (msg.ackId === latestAckId.value) {
          saveStatus.value = 'saved';
        }
        break;
        
      case 'session-state':
        collaborators.value = msg.collaborators;
        // Find my peer ID in the active session list
        const me = msg.collaborators.find(c => c.userId === user.value.userId);
        if (me) {
          myPeerId.value = me.peerId;
        }
        break;
        
      case 'user-joined':
        // Avoid duplicate joined records
        if (!collaborators.value.some(c => c.peerId === msg.collaborator.peerId)) {
          collaborators.value.push(msg.collaborator);
        }
        break;
        
      case 'user-left':
        collaborators.value = collaborators.value.filter(c => c.peerId !== msg.peerId);
        activeRequests.value = activeRequests.value.filter(r => r.peerId !== msg.peerId);
        break;
        
      case 'cursor-moved':
        const peerCursor = collaborators.value.find(c => c.peerId === msg.peerId);
        if (peerCursor) peerCursor.cursor = { x: msg.x, y: msg.y };
        break;
        
      case 'table-dragged':
        const dragT = tables.value.find(t => t.id === msg.tableId);
        if (dragT) {
          dragT.x = msg.x;
          dragT.y = msg.y;
        }
        break;
        
      case 'table-moved':
        const moveT = tables.value.find(t => t.id === msg.tableId);
        if (moveT) {
          moveT.x = msg.x;
          moveT.y = msg.y;
        }
        break;
        
      case 'table-created':
        tables.value.push(msg.table);
        break;
        
      case 'table-updated':
        const updateT = tables.value.find(t => t.id === msg.tableId);
        if (updateT) {
          updateT.name = msg.name;
          updateT.color = msg.color;
        }
        break;
        
      case 'table-deleted':
        tables.value = tables.value.filter(t => t.id !== msg.tableId);
        columns.value = columns.value.filter(c => c.table_id !== msg.tableId);
        relations.value = relations.value.filter(r => r.source_table_id !== msg.tableId && r.target_table_id !== msg.tableId);
        deselectAll();
        break;
        
      case 'column-created':
        columns.value.push(msg.column);
        break;
        
      case 'column-updated':
        const index = columns.value.findIndex(c => c.id === msg.column.id);
        if (index !== -1) {
          columns.value[index] = msg.column;
        }
        break;
        
      case 'column-deleted':
        columns.value = columns.value.filter(c => c.id !== msg.columnId);
        relations.value = relations.value.filter(r => r.source_column_id !== msg.columnId && r.target_column_id !== msg.columnId);
        if (selectedColumnId.value === msg.columnId) {
          selectElement('table', msg.tableId);
        }
        break;
        
      case 'relation-created':
        relations.value.push(msg.relation);
        break;
        
      case 'relation-deleted':
        relations.value = relations.value.filter(r => r.id !== msg.relationId);
        if (selectedRelationId.value === msg.relationId) deselectAll();
        break;
        
      case 'diagram-updated':
        diagram.value.name = msg.name;
        diagram.value.dialect = msg.dialect;
        break;
        
      case 'edit-access-requested':
        // Only host (owner) displays approval popup!
        if (myRole.value === 'owner') {
          if (!activeRequests.value.some(r => r.peerId === msg.peerId)) {
            activeRequests.value.push({
              peerId: msg.peerId,
              userId: msg.userId,
              name: msg.name
            });
          }
        }
        break;
        
      case 'role-updated':
        const peerCollab = collaborators.value.find(c => c.peerId === msg.peerId);
        if (peerCollab) {
          peerCollab.role = msg.role;
        }
        if (msg.peerId === myPeerId.value) {
          myRole.value = msg.role;
          accessRequestStatus.value = '';
          showAccessModal.value = false;
        }
        break;
        
      case 'edit-access-denied':
        if (msg.peerId === myPeerId.value) {
          accessRequestStatus.value = 'denied';
        }
        break;
    }
  };
  
  socket.onclose = () => {
    console.log('WebSocket Sharing Session disconnected.');
    saveStatus.value = 'offline';
  };
  
  socket.onerror = () => {
    saveStatus.value = 'offline';
  };
};

const sendWSEvent = (payload) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const writeActions = [
      'table-move-end', 'table-create', 'table-update', 'table-delete',
      'column-create', 'column-update', 'column-delete',
      'relation-create', 'relation-delete', 'diagram-update'
    ];
    if (writeActions.includes(payload.type)) {
      const ackId = crypto.randomUUID();
      payload.ackId = ackId;
      latestAckId.value = ackId;
      saveStatus.value = 'saving';
    }
    socket.send(JSON.stringify(payload));
  }
};

// Selection router helper
const selectElement = (type, id) => {
  deselectAll();
  inspectorType.value = type;
  
  if (type === 'table') {
    selectedTableId.value = id;
  } else if (type === 'column') {
    selectedColumnId.value = id;
    const parentTableId = columns.value.find(c => c.id === id)?.table_id;
    selectedTableId.value = parentTableId || '';
  } else if (type === 'relation') {
    selectedRelationId.value = id;
  }
};

const deselectAll = () => {
  inspectorType.value = '';
  selectedTableId.value = '';
  selectedColumnId.value = '';
  selectedRelationId.value = '';
};

// Navigation layout helpers
const goHome = () => {
  navigateTo('/');
};

const copyShareLink = () => {
  navigator.clipboard.writeText(window.location.href);
  showShareGlow.value = true;
  setTimeout(() => {
    showShareGlow.value = false;
  }, 2000);
};

// Viewport calculations: dynamic Bézier curves & Port positions
const getBezierPath = (x1, y1, x2, y2) => {
  const dx = Math.abs(x2 - x1);
  const controlOffset = Math.min(dx * 0.5, 100);
  return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
};

const drawRelationPath = (rel) => {
  // Determine source and target index to calculate absolute ports mathematically
  const sourceTable = tables.value.find(t => t.id === rel.source_table_id);
  const targetTable = tables.value.find(t => t.id === rel.target_table_id);
  
  const sourceCols = columns.value.filter(c => c.table_id === rel.source_table_id);
  const targetCols = columns.value.filter(c => c.table_id === rel.target_table_id);
  
  const sIndex = sourceCols.findIndex(c => c.id === rel.source_column_id);
  const tIndex = targetCols.findIndex(c => c.id === rel.target_column_id);
  
  if (!sourceTable || !targetTable || sIndex === -1 || tIndex === -1) {
    return 'M 0 0';
  }
  
  // Ports Y height
  const sY = sourceTable.y + HEADER_HEIGHT + (sIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);
  const tY = targetTable.y + HEADER_HEIGHT + (tIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);
  
  // Decide best ports connecting sides based on relative coordinates
  let sX, tX;
  if (sourceTable.x + TABLE_WIDTH < targetTable.x) {
    sX = sourceTable.x + TABLE_WIDTH;
    tX = targetTable.x;
  } else if (targetTable.x + TABLE_WIDTH < sourceTable.x) {
    sX = sourceTable.x;
    tX = targetTable.x + TABLE_WIDTH;
  } else {
    sX = sourceTable.x + TABLE_WIDTH;
    tX = targetTable.x + TABLE_WIDTH;
  }
  
  return getBezierPath(sX, sY, tX, tY);
};

// Canvas events: Dragging tables, Panning, Zooming
const onTableDrag = (data) => {
  const table = tables.value.find(t => t.id === data.tableId);
  if (table) {
    table.x = data.x;
    table.y = data.y;
    
    // Relay dragging live coordinates
    sendWSEvent({
      type: 'table-drag',
      tableId: data.tableId,
      x: data.x,
      y: data.y
    });
  }
};

const onTableDragEnd = (data) => {
  sendWSEvent({
    type: 'table-move-end',
    tableId: data.tableId,
    x: data.x,
    y: data.y
  });
};

const onStartRelationDrag = (data) => {
  const { e, sourceTableId, sourceColumnId, portX, portY } = data;
  
  activeRelationDrag.value = {
    sourceTableId,
    sourceColumnId,
    portX,
    portY,
    currentX: portX,
    currentY: portY
  };
  
  window.addEventListener('mousemove', onRelationDragMove);
  window.addEventListener('mouseup', onRelationDragMouseUp);
};

const onRelationDragMove = (e) => {
  if (!activeRelationDrag.value || !canvasContainer.value) return;
  
  const rect = canvasContainer.value.getBoundingClientRect();
  
  // Transform client screen coordinates back to zoomed viewport canvas coordinates
  const canvasX = Math.round((e.clientX - rect.left - panX.value) / scale.value);
  const canvasY = Math.round((e.clientY - rect.top - panY.value) / scale.value);
  
  activeRelationDrag.value.currentX = canvasX;
  activeRelationDrag.value.currentY = canvasY;
};

const onRelationDragMouseUp = (e) => {
  window.removeEventListener('mousemove', onRelationDragMove);
  window.removeEventListener('mouseup', onRelationDragMouseUp);
  
  if (!activeRelationDrag.value) return;
  
  // Check if we released mouse on a valid column port
  const element = document.elementFromPoint(e.clientX, e.clientY);
  const targetColRow = element?.closest('.column-row');
  const targetTableEl = element?.closest('.table-card');
  
  if (targetColRow && targetTableEl) {
    // Find target column details by querying DOM attributes or matching properties
    const targetColName = targetColRow.querySelector('.column-name')?.textContent?.trim();
    const targetTableName = targetTableEl.querySelector('.table-name-text')?.textContent?.trim();
    
    const targetTable = tables.value.find(t => t.name === targetTableName);
    if (targetTable) {
      const targetCols = columns.value.filter(c => c.table_id === targetTable.id);
      const targetCol = targetCols.find(c => c.name === targetColName);
      
      // Avoid linking a column to itself
      if (targetCol && targetCol.id !== activeRelationDrag.value.sourceColumnId) {
        // Build Relation
        const newRel = {
          id: crypto.randomUUID(),
          source_table_id: activeRelationDrag.value.sourceTableId,
          source_column_id: activeRelationDrag.value.sourceColumnId,
          target_table_id: targetTable.id,
          target_column_id: targetCol.id,
          type: '1:N',
          on_delete: 'CASCADE',
          on_update: 'CASCADE'
        };
        
        relations.value.push(newRel);
        selectElement('relation', newRel.id);
        
        // Save to DB and broadcast
        sendWSEvent({
          type: 'relation-create',
          relation: newRel
        });
      }
    }
  }
  
  activeRelationDrag.value = null;
};

// Canvas Navigation Matrix Control (Spacebar/Middle Click pan)
const onSpaceKeyDown = (e) => {
  spacePressed.value = true;
};

const onSpaceKeyUp = (e) => {
  spacePressed.value = false;
};

const onGlobalKeyDown = (e) => {
  if (e.key === 'Escape') {
    deselectAll();
  }
};

const onCanvasMouseDown = (e) => {
  // Pan on Middle-Click OR Left-Click + Space
  if (e.button === 1 || (e.button === 0 && spacePressed.value)) {
    e.preventDefault();
    isPanning.value = true;
    dragStartCanvas.value = {
      x: e.clientX - panX.value,
      y: e.clientY - panY.value
    };
  } else if (e.button === 0) {
    // Deselect if clicking blank grid background
    if (e.target.classList.contains('canvas-grid-bg') || e.target.classList.contains('canvas-container') || e.target.tagName === 'svg') {
      deselectAll();
    }
  }
};

const onCanvasMouseMove = (e) => {
  if (isPanning.value) {
    panX.value = e.clientX - dragStartCanvas.value.x;
    panY.value = e.clientY - dragStartCanvas.value.y;
  }
  
  // Track my cursor movement and stream to peers
  if (canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    const canvasX = Math.round((e.clientX - rect.left - panX.value) / scale.value);
    const canvasY = Math.round((e.clientY - rect.top - panY.value) / scale.value);
    
    sendWSEvent({
      type: 'cursor',
      x: canvasX,
      y: canvasY
    });
  }
};

const onCanvasMouseUp = () => {
  isPanning.value = false;
};

// Zoom logic using scroll wheel
const onCanvasWheel = (e) => {
  e.preventDefault();
  
  const zoomFactor = 0.05;
  const newScale = e.deltaY < 0 ? scale.value + zoomFactor : scale.value - zoomFactor;
  
  // Clamp scale
  const clampedScale = Math.max(0.2, Math.min(2, newScale));
  
  // Anchor zoom to mouse location on screen
  if (canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const canvasMouseX = (mouseX - panX.value) / scale.value;
    const canvasMouseY = (mouseY - panY.value) / scale.value;
    
    scale.value = clampedScale;
    panX.value = mouseX - canvasMouseX * scale.value;
    panY.value = mouseY - canvasMouseY * scale.value;
  }
};

const changeZoom = (delta) => {
  const newScale = scale.value + delta;
  scale.value = Math.max(0.2, Math.min(2, newScale));
};

const resetViewport = () => {
  scale.value = 1;
  panX.value = 100;
  panY.value = 100;
};

const centerTableOnCanvas = (tableId) => {
  const table = tables.value.find(t => t.id === tableId);
  if (table && canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    scale.value = 1;
    panX.value = rect.width / 2 - TABLE_WIDTH / 2 - table.x;
    panY.value = rect.height / 2 - 100 - table.y;
    selectElement('table', tableId);
  }
};

// CRUD Event handlers for Tables / Columns / Relations
const createNewTable = () => {
  deselectAll();
  
  // Math viewport coordinates to spawn new tables in center screen
  let spawnX = 250;
  let spawnY = 150;
  
  if (canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    spawnX = Math.round((rect.width / 2 - TABLE_WIDTH / 2 - panX.value) / scale.value);
    spawnY = Math.round((rect.height / 2 - 100 - panY.value) / scale.value);
  }

  const presetColors = ['table-theme-violet', 'table-theme-emerald', 'table-theme-rose', 'table-theme-amber', 'table-theme-blue'];
  const randomColor = presetColors[Math.floor(Math.random() * presetColors.length)];

  const newTable = {
    id: crypto.randomUUID(),
    diagram_id: diagram.value.id,
    name: `new_table_${tables.value.length + 1}`,
    color: randomColor,
    x: spawnX,
    y: spawnY
  };
  
  tables.value.push(newTable);
  selectElement('table', newTable.id);
  
  // Save & Broadcast
  sendWSEvent({
    type: 'table-create',
    table: newTable
  });
};

const handleTableUpdate = (data) => {
  const table = tables.value.find(t => t.id === data.tableId);
  if (table) {
    table.name = data.name;
    table.color = data.color;
    
    sendWSEvent({
      type: 'table-update',
      tableId: data.tableId,
      name: data.name,
      color: data.color
    });
  }
};

const deleteTableModal = ref({
  show: false,
  tableId: null,
  tableName: ''
});

const triggerTableDelete = (tableId) => {
  const table = tables.value.find(t => t.id === tableId);
  if (table) {
    deleteTableModal.value = {
      show: true,
      tableId: table.id,
      tableName: table.name
    };
  }
};

const confirmTableDelete = () => {
  const tableId = deleteTableModal.value.tableId;
  if (!tableId) return;
  
  tables.value = tables.value.filter(t => t.id !== tableId);
  columns.value = columns.value.filter(c => c.table_id !== tableId);
  relations.value = relations.value.filter(r => r.source_table_id !== tableId && r.target_table_id !== tableId);
  
  deselectAll();
  
  sendWSEvent({
    type: 'table-delete',
    tableId
  });
  
  deleteTableModal.value = {
    show: false,
    tableId: null,
    tableName: ''
  };
};

const handleTableDelete = (tableId) => {
  triggerTableDelete(tableId);
};

const handleColumnCreate = (tableId) => {
  const tableCols = columns.value.filter(c => c.table_id === tableId);
  
  const newCol = {
    id: crypto.randomUUID(),
    table_id: tableId,
    name: `column_${tableCols.length + 1}`,
    type: 'INT',
    length: '',
    is_primary: 0,
    is_nullable: 1,
    is_unique: 0,
    is_unsigned: 0,
    is_auto_increment: 0,
    default_value: '',
    comment: '',
    sort_order: tableCols.length
  };
  
  columns.value.push(newCol);
  selectElement('column', newCol.id);
  
  sendWSEvent({
    type: 'column-create',
    column: newCol
  });
};

const handleColumnUpdate = (colData) => {
  const index = columns.value.findIndex(c => c.id === colData.id);
  if (index !== -1) {
    columns.value[index] = {
      ...columns.value[index],
      ...colData
    };
    
    sendWSEvent({
      type: 'column-update',
      column: columns.value[index]
    });
  }
};

const handleColumnDelete = (colId) => {
  const col = columns.value.find(c => c.id === colId);
  if (col) {
    columns.value = columns.value.filter(c => c.id !== colId);
    relations.value = relations.value.filter(r => r.source_column_id !== colId && r.target_column_id !== colId);
    
    selectElement('table', col.table_id);
    
    sendWSEvent({
      type: 'column-delete',
      columnId: colId,
      tableId: col.table_id
    });
  }
};

const handleRelationUpdate = (relData) => {
  const rel = relations.value.find(r => r.id === relData.relationId);
  if (rel) {
    rel.type = relData.type;
    rel.on_delete = relData.on_delete;
    rel.on_update = relData.on_update;
    
    sendWSEvent({
      type: 'relation-create', // WS handles updates by overwriting schema
      relation: rel
    });
  }
};

const handleRelationDelete = (relId) => {
  relations.value = relations.value.filter(r => r.id !== relId);
  deselectAll();
  
  sendWSEvent({
    type: 'relation-delete',
    relationId: relId
  });
};

const handleRelationCreate = (newRel) => {
  relations.value.push(newRel);
  selectElement('relation', newRel.id);
  
  sendWSEvent({
    type: 'relation-create',
    relation: newRel
  });
};

const updateDiagramSettings = () => {
  sendWSEvent({
    type: 'diagram-update',
    name: diagram.value.name,
    dialect: diagram.value.dialect
  });
};

const updateDialect = (newDialect) => {
  diagram.value.dialect = newDialect;
  updateDiagramSettings();
};

// Viewer request & Host approvals hooks
const requestEditAccess = () => {
  accessRequestStatus.value = 'pending';
  sendWSEvent({
    type: 'request-edit-access'
  });
};

const approveEditAccess = (req) => {
  activeRequests.value = activeRequests.value.filter(r => r.peerId !== req.peerId);
  sendWSEvent({
    type: 'grant-edit-access',
    targetPeerId: req.peerId
  });
};

const denyEditAccess = (req) => {
  activeRequests.value = activeRequests.value.filter(r => r.peerId !== req.peerId);
  sendWSEvent({
    type: 'deny-edit-access',
    targetPeerId: req.peerId
  });
};
</script>

<style scoped>
/* Custom Delete Table Modal styles */
.text-danger-glow {
  color: #ff4a5a !important;
  text-shadow: 0 0 12px rgba(255, 74, 90, 0.45);
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.modal-sub-desc {
  font-size: 0.775rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
}

.modal-buttons {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.btn-danger {
  background-color: #ff4a5a !important;
  color: #fff !important;
  border: 1px solid #ff4a5a !important;
}

.btn-danger:hover {
  background-color: #ff2b3e !important;
  border-color: #ff2b3e !important;
  box-shadow: 0 0 12px rgba(255, 74, 90, 0.4) !important;
}

/* Custom Context Menu styling */
.custom-context-menu {
  position: absolute;
  min-width: 160px;
  background: hsla(224, 25%, 12%, 0.95);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 0.35rem;
  z-index: 10000;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  backdrop-filter: blur(12px);
}

.context-menu-item {
  width: 100%;
  background: transparent;
  border: none;
  color: hsl(var(--foreground));
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.context-menu-item:hover {
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
}

.context-menu-item.text-danger:hover {
  background: hsla(0, 80%, 60%, 0.15);
  color: #ff8888;
}

.context-menu-icon {
  width: 14px;
  height: 14px;
}

.context-menu-divider {
  height: 1px;
  background-color: hsl(var(--border) / 0.4);
  margin: 0.25rem 0;
}

/* Sidebar Toggle System */
.sidebar-toggle-btn {
  position: absolute;
  top: 75px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: hsla(224, 25%, 12%, 0.9);
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.sidebar-toggle-btn:hover {
  background-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
  color: #fff;
  transform: scale(1.1);
}

.left-toggle {
  left: 236px; /* 250px left sidebar width minus overlap */
}
.left-toggle.is-sidebar-closed {
  left: 12px;
}

.right-toggle {
  right: 266px; /* 280px right sidebar width minus overlap */
}
.right-toggle.is-sidebar-closed {
  right: 12px;
}

.toggle-icon {
  width: 14px;
  height: 14px;
}

/* Main Canvas Workspace Container */
.diagram-workspace {
  width: 100vw;
  height: 100vh;
  position: relative;
  background-color: hsl(var(--background));
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.diagram-workspace:focus {
  outline: none; /* Prevent browser outline during panning space triggers */
}

/* Header bar navigation and controls */
.workspace-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.25rem;
  z-index: 100;
  position: relative;
}

.header-left,
.header-center,
.header-right {
  display: flex;
  align-items: center;
}

.header-left {
  gap: 1rem;
  flex: 1;
}

.back-btn {
  background: transparent;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0.35rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  transition: all 0.15s ease;
}

.back-btn:hover {
  color: hsl(var(--foreground));
  background-color: hsl(var(--muted));
}

.header-icon {
  width: 20px;
  height: 20px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.diagram-title-input {
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
  max-width: 240px;
  transition: all 0.15s ease;
}

.diagram-title-input:focus {
  background-color: hsl(var(--input));
  border-color: hsl(var(--border));
  cursor: text;
}

/* Badge highlight preset colors */
.dialect-badge {
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.badge-postgresql { background-color: rgba(51, 103, 145, 0.15); color: #8cbbe3; border: 1px solid rgba(51, 103, 145, 0.3); }
.badge-mysql { background-color: rgba(242, 145, 17, 0.15); color: #ffd699; border: 1px solid rgba(242, 145, 17, 0.3); }
.badge-sqlite { background-color: rgba(0, 59, 87, 0.25); color: #76c0e6; border: 1px solid rgba(0, 59, 87, 0.4); }

.header-center {
  flex: 1;
  justify-content: center;
  gap: 1.5rem;
}

/* Collaborators list avatar overlap stacks */
.collaborators-list {
  display: flex;
  align-items: center;
}

.collaborator-avatar-box {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--collab-color);
  margin-left: -8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
  cursor: help;
}

.collaborator-avatar-box:first-child {
  margin-left: 0;
}

.collaborator-avatar-box:hover {
  transform: translateY(-4px);
  z-index: 50;
}

.collab-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: hsl(var(--card));
  display: block;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: hsl(var(--success));
  border: 1.5px solid hsl(var(--background));
}

.btn-share {
  padding: 0.4rem 0.85rem;
  font-size: 0.8rem;
}

.glow-success {
  background-color: hsl(var(--success)) !important;
  color: #fff !important;
  border-color: transparent !important;
}

.header-right {
  flex: 1;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-export {
  padding: 0.5rem 1rem;
}

.btn-add-table {
  padding: 0.5rem 1rem;
}

/* Zoomable Canvas container */
.canvas-container {
  flex: 1;
  width: 100%;
  height: calc(100vh - 60px);
  position: relative;
  overflow: hidden;
}

.cursor-grab-mode {
  cursor: grab !important;
}

.cursor-grabbing-mode {
  cursor: grabbing !important;
}

.canvas-viewport {
  width: 5000px;
  height: 5000px;
  position: absolute;
  top: 0;
  left: 0;
  transform-style: preserve-3d;
  will-change: transform;
}

/* Radial dots matrix background */
.canvas-grid-bg {
  position: absolute;
  inset: 0;
  background-image: var(--canvas-grid);
  background-size: 24px 24px;
}

/* SVG Vector connector layers */
.svg-relations-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: visible;
}

/* Expose pointer clicks strictly to curves paths */
.svg-relations-layer path {
  pointer-events: stroke;
}

/* Loader indicators */
.loader-screen {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: hsl(var(--background));
  gap: 1.25rem;
}

/* Zoom floating toolbar controller */
.zoom-floating-toolbar {
  position: absolute;
  bottom: 1.5rem;
  left: 270px;
  z-index: 90;
  padding: 0.4rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.zoom-icon-btn {
  background: transparent;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0.35rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  transition: all 0.15s ease;
}

.zoom-icon-btn:hover {
  color: hsl(var(--foreground));
  background-color: hsl(var(--muted));
}

.zoom-icon {
  width: 16px;
  height: 16px;
}

.zoom-percent-label {
  font-size: 0.775rem;
  font-weight: 700;
  color: hsl(var(--muted-foreground));
  min-width: 44px;
  text-align: center;
  user-select: none;
}

.divider-v {
  width: 1px;
  height: 16px;
  background-color: hsl(var(--border));
  margin: 0 0.25rem;
}

/* Cloud Saved Status Indicator */
.save-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  background-color: hsl(var(--muted) / 0.3);
  border: 1px solid hsl(var(--border) / 0.5);
  font-size: 0.65rem;
  font-weight: 700;
  margin-left: 0.5rem;
  transition: all 0.25s ease;
}

.save-status-indicator .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: background-color 0.25s ease, box-shadow 0.25s ease;
}

.save-status-indicator.saved {
  color: hsl(142 76% 45%);
}
.save-status-indicator.saved .status-dot {
  background-color: hsl(142 76% 45%);
  box-shadow: 0 0 8px hsl(142 76% 45% / 0.5);
}

.save-status-indicator.saving {
  color: hsl(var(--warning));
}
.save-status-indicator.saving .status-dot {
  background-color: hsl(var(--warning));
  box-shadow: 0 0 8px hsl(var(--warning) / 0.5);
  animation: pulse-glow 1.5s infinite;
}

.save-status-indicator.offline {
  color: hsl(var(--destructive));
}
.save-status-indicator.offline .status-dot {
  background-color: hsl(var(--destructive));
  box-shadow: 0 0 8px hsl(var(--destructive) / 0.5);
  animation: pulse-glow 1.2s infinite;
}

@keyframes pulse-glow {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}

/* Collaboration Role Stacks */
.collaborator-avatar-box {
  position: relative;
}

.role-badge-mini {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 0.55rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid hsl(var(--background));
  color: #fff;
  z-index: 5;
}

.role-badge-mini.role-owner {
  background-color: hsl(346 84% 61%);
}

.role-badge-mini.role-editor {
  background-color: hsl(var(--primary));
}

.role-badge-mini.role-viewer {
  background-color: hsl(var(--muted-foreground));
}

/* Request Edit Access buttons */
.btn-request-access {
  font-weight: 700;
  letter-spacing: -0.01em;
  transition: all 0.2s ease;
}

.btn-request-access.pending {
  background-color: hsl(var(--muted)) !important;
  color: hsl(var(--muted-foreground)) !important;
  cursor: not-allowed;
}

.btn-request-access.denied {
  background-color: hsl(var(--destructive) / 0.2) !important;
  color: hsl(var(--destructive)) !important;
  border: 1px solid hsl(var(--destructive) / 0.4);
  cursor: not-allowed;
}

/* Floating Host Approvals dialog overlay */
.floating-approvals-box {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 320px;
  z-index: 1000;
  padding: 1rem;
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
}

.approvals-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid hsl(var(--border) / 0.5);
  padding-bottom: 0.5rem;
}

.approval-title {
  font-size: 0.85rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
}

.requests-count-badge {
  font-size: 0.65rem;
  font-weight: 700;
  background-color: hsl(var(--primary) / 0.2);
  color: hsl(var(--primary));
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.approval-request-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: hsl(var(--muted) / 0.2);
  padding: 0.65rem;
  border-radius: var(--radius-md);
  border: 1px solid hsl(var(--border) / 0.3);
}

.request-user-info {
  display: flex;
  flex-direction: column;
}

.request-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
}

.request-desc {
  font-size: 0.675rem;
  color: hsl(var(--muted-foreground));
}

.approval-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-danger-outline {
  background: transparent;
  border: 1px solid hsl(var(--destructive) / 0.4);
  color: hsl(var(--destructive));
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-danger-outline:hover {
  background-color: hsl(var(--destructive));
  color: #fff;
}

/* Guest overlay when pending access request */
.fullscreen-access-modal {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.access-modal-content {
  width: 90%;
  max-width: 440px;
  padding: 2.5rem 2rem;
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.modal-title-glow {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  text-shadow: 0 0 10px hsla(var(--primary), 0.5);
}

.modal-desc {
  font-size: 0.85rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
}
</style>
