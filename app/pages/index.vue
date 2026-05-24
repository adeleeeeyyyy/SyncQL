<template>
  <div v-if="isLoading" class="loader-screen">
    <div class="spinner-ring"></div>
    <span class="loading-text">Synchronizing session...</span>
  </div>

  <div v-else-if="!user" class="unauthorized-redirect">
    <!-- Will navigate to /login via onMounted -->
  </div>

  <div v-else class="dashboard-container animate-fade-in">
    <!-- Navbar header -->
    <header class="glass-header dashboard-header">
      <div class="header-content">
        <div class="header-logo">
          <div class="logo-box">
            <svg class="logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6C4 4.34315 7.58172 3 12 3C16.4183 3 20 4.34315 20 6M4 6C4 7.65685 7.58172 9 12 9C16.4183 9 20 7.65685 20 6M4 6V12C4 13.6569 7.58172 15 12 15C16.4183 15 20 13.6569 20 12V6M4 12V18C4 19.6569 7.58172 21 12 21C16.4183 21 20 19.6569 20 18V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="logo-title">SyncQL</span>
        </div>

        <div class="header-user">
          <div class="user-profile">
            <img :src="user.avatarUrl" alt="Avatar" class="user-avatar" />
            <div class="user-meta">
              <span class="user-name">{{ user.name }}</span>
              <span class="user-email">{{ user.email }}</span>
            </div>
          </div>
          <button class="btn btn-secondary logout-btn" @click="logout">
            <LogOut class="btn-icon" />
            Sign Out
          </button>
        </div>
      </div>
    </header>

    <!-- Main content dashboard -->
    <main class="dashboard-main-layout">
      <!-- Left sidebar for workspaces and members list -->
      <aside class="workspace-sidebar glass-panel">
        <!-- Workspace header/switcher title -->
        <div class="workspace-sidebar-header">
          <span class="sidebar-sec-title">Workspaces</span>
          <button class="btn-icon-only" @click="showCreateWorkspaceModal = true" title="Create Workspace">
            <Plus class="plus-icon-mini" />
          </button>
        </div>

        <!-- Workspaces selection List -->
        <div class="workspace-list">
          <button 
            v-for="ws in workspaces" 
            :key="ws.id"
            class="workspace-item-btn"
            :class="{ 'is-active': activeWorkspaceId === ws.id }"
            @click="selectWorkspace(ws.id)"
          >
            <div class="workspace-btn-content">
              <span class="workspace-avatar-letter">{{ ws.name.charAt(0).toUpperCase() }}</span>
              <div class="workspace-btn-meta">
                <span class="workspace-btn-name">{{ ws.name }}</span>
                <span class="workspace-btn-desc">{{ ws.diagram_count || 0 }} diagrams</span>
              </div>
            </div>
          </button>
        </div>

        <div class="workspace-sidebar-divider"></div>

        <!-- Workspace Members listing section -->
        <div class="workspace-members-section" v-if="activeWorkspaceId">
          <div class="workspace-sidebar-header">
            <span class="sidebar-sec-title">Collaborators</span>
            <button class="btn-icon-only text-primary-glow" @click="showInviteMemberModal = true" title="Invite Member">
              <Plus class="plus-icon-mini" />
            </button>
          </div>

          <div class="workspace-members-list">
            <div 
              v-for="member in workspaceMembers" 
              :key="member.id"
              class="member-item"
            >
              <img :src="member.avatar_url || '/logo.png'" class="member-avatar" alt="Avatar" />
              <div class="member-meta">
                <span class="member-name">{{ member.name }}</span>
                <span class="member-role">{{ member.role }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Right column for actual active diagrams lists -->
      <div class="dashboard-content-area">
        <div class="welcome-banner">
          <div class="banner-text">
            <h1 class="welcome-title">{{ activeWorkspaceName }}</h1>
            <p class="welcome-subtitle">Design, edit, and collaborate on structural schemas inside this workspace.</p>
          </div>
          <div class="banner-actions">
            <button class="btn btn-secondary import-btn-main" @click="showImportModal = true">
              <Sparkles class="btn-icon text-warning" />
              Import Blueprint
            </button>
            <button class="btn btn-primary create-btn" @click="showCreateModal = true">
              <Plus class="btn-icon" />
              Create Diagram
            </button>
          </div>
        </div>

        <!-- Search and Filter Panel -->
        <div class="filter-panel glass-panel">
          <div class="search-box">
            <Search class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search schemas by name..." 
              class="search-input"
            />
          </div>
          <div class="dialect-badge-legend">
            <span class="dialect-dot dot-pg">Postgres</span>
            <span class="dialect-dot dot-my">MySQL</span>
            <span class="dialect-dot dot-lit">SQLite</span>
          </div>
        </div>

        <!-- Diagram Grid -->
        <div v-if="filteredDiagrams.length > 0" class="diagram-grid">
          <div 
            v-for="diagram in filteredDiagrams" 
            :key="diagram.id" 
            class="diagram-card glass-panel"
            :class="`dialect-border-${diagram.dialect}`"
            @click="openDiagram(diagram.id)"
          >
            <div class="diagram-card-content">
              <div class="diagram-meta-top">
                <span class="dialect-badge" :class="`badge-${diagram.dialect}`">{{ diagram.dialect }}</span>
                <button class="delete-card-btn" @click.stop="confirmDelete(diagram)">
                  <Trash2 class="trash-icon" />
                </button>
              </div>
              <h3 class="diagram-name">{{ diagram.name }}</h3>
              <p class="diagram-desc">{{ diagram.description || 'No description provided.' }}</p>
              <div class="diagram-meta-bottom">
                <Calendar class="meta-icon" />
                <span>Updated {{ formatDate(diagram.updated_at) }}</span>
              </div>
            </div>
            <div class="card-arrow">
              <ArrowRight class="arrow-icon" />
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state glass-panel">
          <div class="empty-icon-box">
            <Database class="empty-icon" />
          </div>
          <h3>No schemas found</h3>
          <p>Create your first schema inside this workspace or seed a template to try visual relations!</p>
          <div class="empty-actions">
            <button class="btn btn-secondary" @click="showImportModal = true">
              <Sparkles class="btn-icon text-warning" />
              Import Blueprint
            </button>
            <button class="btn btn-primary" @click="showCreateModal = true">
              <Plus class="btn-icon" />
              Create Diagram
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Diagram Modal -->
    <div v-if="showCreateModal" class="modal-backdrop">
      <div class="modal-card glass-panel animate-fade-in">
        <div class="modal-header">
          <div class="modal-icon-title">
            <Sparkles class="modal-icon-sparkle" />
            <h2>Create New Schema</h2>
          </div>
          <button class="modal-close-btn" @click="showCreateModal = false">&times;</button>
        </div>
        
        <form @submit.prevent="handleCreateDiagram" class="modal-form">
          <div class="form-group">
            <label for="diag-name">Schema Name</label>
            <input 
              id="diag-name" 
              v-model="newDiagramForm.name" 
              type="text" 
              placeholder="e.g. E-Commerce Core Database" 
              class="input-field" 
              required
            />
          </div>

          <div class="form-group">
            <label for="diag-desc">Description</label>
            <textarea 
              id="diag-desc" 
              v-model="newDiagramForm.description" 
              placeholder="Optional notes about tables, normalization, or dialect..." 
              class="input-field textarea-field" 
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>SQL Target Dialect</label>
            <div class="dialect-radio-group">
              <label 
                v-for="dialect in ['postgresql', 'mysql', 'sqlite']" 
                :key="dialect"
                class="dialect-radio-card"
                :class="{ 'is-active': newDiagramForm.dialect === dialect }"
              >
                <input 
                  type="radio" 
                  name="dialect" 
                  :value="dialect" 
                  v-model="newDiagramForm.dialect" 
                  class="radio-input"
                />
                <span class="dialect-title">{{ dialect === 'postgresql' ? 'PostgreSQL' : dialect === 'mysql' ? 'MySQL' : 'SQLite' }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Starting Schema Template</label>
            <div class="template-select-group">
              <label 
                v-for="template in templates" 
                :key="template.id"
                class="template-card"
                :class="{ 'is-active': newDiagramForm.template === template.id }"
              >
                <input 
                  type="radio" 
                  name="template" 
                  :value="template.id" 
                  v-model="newDiagramForm.template" 
                  class="radio-input"
                />
                <div class="template-card-content">
                  <span class="template-card-icon">{{ template.icon }}</span>
                  <div class="template-card-text">
                    <span class="template-card-name">{{ template.name }}</span>
                    <span class="template-card-desc">{{ template.description }}</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showCreateModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="isCreating">
              <span v-if="isCreating" class="spinner-inline"></span>
              <span v-else>Generate Schema</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirm Delete Modal -->
    <div v-if="diagramToDelete" class="modal-backdrop">
      <div class="modal-card glass-panel animate-fade-in delete-modal">
        <h2>Delete Schema?</h2>
        <p class="delete-warning">
          Are you sure you want to delete <strong>{{ diagramToDelete.name }}</strong>?<br/>
          This action is permanent and will delete all tables, columns, and relationship models associated with it.
        </p>
        <div class="modal-actions delete-actions">
          <button class="btn btn-secondary" @click="diagramToDelete = null">Cancel</button>
          <button class="btn btn-danger" @click="handleDeleteDiagram" :disabled="isDeleting">
            <span v-if="isDeleting" class="spinner-inline"></span>
            <span v-else>Yes, Delete Schema</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Import Blueprint Modal -->
    <ImportModal 
      v-if="showImportModal" 
      @close="showImportModal = false" 
    />

    <!-- Create Workspace Modal -->
    <div v-if="showCreateWorkspaceModal" class="modal-backdrop">
      <div class="modal-card glass-panel animate-fade-in">
        <div class="modal-header">
          <div class="modal-icon-title">
            <Sparkles class="modal-icon-sparkle" />
            <h2>Create Workspace</h2>
          </div>
          <button class="modal-close-btn" @click="showCreateWorkspaceModal = false">&times;</button>
        </div>
        
        <form @submit.prevent="handleCreateWorkspace" class="modal-form">
          <div class="form-group">
            <label for="ws-name">Workspace Name</label>
            <input 
              id="ws-name" 
              v-model="newWorkspaceName" 
              type="text" 
              placeholder="e.g. SynchronizeTeams Workspace" 
              class="input-field" 
              required
            />
          </div>

          <div class="modal-buttons">
            <button type="button" class="btn btn-secondary" @click="showCreateWorkspaceModal = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="workspaceLoading">
              {{ workspaceLoading ? 'Creating...' : 'Create Workspace' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Invite Workspace Member Modal -->
    <div v-if="showInviteMemberModal" class="modal-backdrop">
      <div class="modal-card glass-panel animate-fade-in">
        <div class="modal-header">
          <div class="modal-icon-title">
            <Sparkles class="modal-icon-sparkle" />
            <h2>Invite Member</h2>
          </div>
          <button class="modal-close-btn" @click="showInviteMemberModal = false">&times;</button>
        </div>
        
        <form @submit.prevent="handleInviteMember" class="modal-form">
          <div class="form-group">
            <label for="member-username">Invited Username</label>
            <input 
              id="member-username" 
              v-model="inviteUsername" 
              type="text" 
              placeholder="Enter developer username..." 
              class="input-field" 
              required
            />
            <p class="form-hint">Type the developer name case-insensitively. They must have logged in at least once.</p>
          </div>

          <!-- Alert cards inside form -->
          <div v-if="inviteError" class="alert alert-danger animate-fade-in">
            {{ inviteError }}
          </div>
          <div v-if="inviteSuccess" class="alert alert-success animate-fade-in">
            {{ inviteSuccess }}
          </div>

          <div class="modal-buttons">
            <button type="button" class="btn btn-secondary" @click="showInviteMemberModal = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="workspaceLoading">
              {{ workspaceLoading ? 'Inviting...' : 'Send Invitation' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Footer Credits -->
    <footer class="dashboard-footer">
      <p>All rights reserved SynchronizeTeams &copy; 2026</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { 
  LogOut, Plus, Search, Trash2, Calendar, Database, 
  ArrowRight, Sparkles 
} from 'lucide-vue-next';

const { user, isLoading, fetchUser, logout } = useAuth();
const diagrams = ref([]);
const searchQuery = ref('');
const showCreateModal = ref(false);
const showImportModal = ref(false);
const isCreating = ref(false);
const isDeleting = ref(false);
const diagramToDelete = ref(null);

// Workspace States
const workspaces = ref([]);
const activeWorkspaceId = ref('');
const workspaceMembers = ref([]);
const showCreateWorkspaceModal = ref(false);
const showInviteMemberModal = ref(false);
const newWorkspaceName = ref('');
const inviteUsername = ref('');
const inviteError = ref('');
const inviteSuccess = ref('');
const workspaceLoading = ref(false);

const activeWorkspaceName = computed(() => {
  const activeWs = workspaces.value.find(w => w.id === activeWorkspaceId.value);
  return activeWs ? activeWs.name : 'Database Diagrams';
});

const newDiagramForm = ref({
  name: '',
  description: '',
  dialect: 'postgresql',
  template: 'blank'
});

const templates = [
  { id: 'blank', name: 'Blank Canvas', description: 'Start with an empty sandbox', icon: '📭' },
  { id: 'ecommerce', name: 'E-commerce Core', description: 'Includes users, orders, and order_items with relations', icon: '🛒' },
  { id: 'blog', name: 'Blog Engine / CMS', description: 'Includes users, posts, and comments schemas', icon: '📝' }
];

onMounted(async () => {
  await fetchUser();
  if (!user.value) {
    navigateTo('/login');
  } else {
    await loadWorkspaces();
    await loadDiagrams();
  }
});

const loadWorkspaces = async () => {
  try {
    const data = await $fetch('/api/workspaces');
    workspaces.value = data.workspaces || [];
    if (workspaces.value.length > 0) {
      const stored = localStorage.getItem('active_workspace_id');
      if (stored && workspaces.value.some(w => w.id === stored)) {
        activeWorkspaceId.value = stored;
      } else {
        activeWorkspaceId.value = workspaces.value[0].id;
      }
      await loadWorkspaceMembers();
    }
  } catch (e) {
    console.error('Failed to load workspaces:', e);
  }
};

const selectWorkspace = async (workspaceId) => {
  activeWorkspaceId.value = workspaceId;
  localStorage.setItem('active_workspace_id', workspaceId);
  await loadWorkspaceMembers();
  await loadDiagrams();
};

const loadWorkspaceMembers = async () => {
  if (!activeWorkspaceId.value) return;
  try {
    const data = await $fetch('/api/workspaces/members', {
      query: { workspaceId: activeWorkspaceId.value }
    });
    workspaceMembers.value = data.members || [];
  } catch (e) {
    console.error('Failed to load workspace members:', e);
  }
};

const handleCreateWorkspace = async () => {
  const name = newWorkspaceName.value.trim();
  if (!name) return;
  
  workspaceLoading.value = true;
  try {
    const data = await $fetch('/api/workspaces', {
      method: 'POST',
      body: { name }
    });
    if (data.success) {
      newWorkspaceName.value = '';
      showCreateWorkspaceModal.value = false;
      await loadWorkspaces();
      await selectWorkspace(data.workspace.id);
    }
  } catch (e) {
    console.error('Failed to create workspace:', e);
  } finally {
    workspaceLoading.value = false;
  }
};

const handleInviteMember = async () => {
  inviteError.value = '';
  inviteSuccess.value = '';
  const username = inviteUsername.value.trim();
  if (!username) return;
  
  workspaceLoading.value = true;
  try {
    const data = await $fetch('/api/workspaces/invite', {
      method: 'POST',
      body: {
        workspaceId: activeWorkspaceId.value,
        username
      }
    });
    if (data.success) {
      inviteSuccess.value = data.message;
      inviteUsername.value = '';
      await loadWorkspaceMembers();
      setTimeout(() => {
        inviteSuccess.value = '';
        showInviteMemberModal.value = false;
      }, 2000);
    }
  } catch (e) {
    inviteError.value = e.data?.statusMessage || 'Failed to invite user';
  } finally {
    workspaceLoading.value = false;
  }
};

const loadDiagrams = async () => {
  try {
    const data = await $fetch('/api/diagrams', {
      query: { workspaceId: activeWorkspaceId.value }
    });
    diagrams.value = data.diagrams || [];
  } catch (e) {
    console.error('Failed to load diagrams list:', e);
  }
};

const filteredDiagrams = computed(() => {
  if (!searchQuery.value) return diagrams.value;
  const q = searchQuery.value.toLowerCase();
  return diagrams.value.filter(d => 
    d.name.toLowerCase().includes(q) || 
    (d.description && d.description.toLowerCase().includes(q))
  );
});

const handleCreateDiagram = async () => {
  isCreating.value = true;
  try {
    const res = await $fetch('/api/diagrams', {
      method: 'POST',
      body: {
        ...newDiagramForm.value,
        workspaceId: activeWorkspaceId.value
      }
    });
    if (res.success && res.diagramId) {
      showCreateModal.value = false;
      newDiagramForm.value = { name: '', description: '', dialect: 'postgresql', template: 'blank' };
      navigateTo(`/diagram/${res.diagramId}`);
    }
  } catch (e) {
    console.error('Failed to create diagram:', e);
  } finally {
    isCreating.value = false;
  }
};

const confirmDelete = (diagram) => {
  diagramToDelete.value = diagram;
};

const handleDeleteDiagram = async () => {
  if (!diagramToDelete.value) return;
  isDeleting.value = true;
  try {
    const res = await $fetch(`/api/diagrams/${diagramToDelete.value.id}`, {
      method: 'DELETE'
    });
    if (res.success) {
      diagrams.value = diagrams.value.filter(d => d.id !== diagramToDelete.value.id);
      diagramToDelete.value = null;
    }
  } catch (e) {
    console.error('Failed to delete diagram:', e);
  } finally {
    isDeleting.value = false;
  }
};

const openDiagram = (id) => {
  navigateTo(`/diagram/${id}`);
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
</script>

<style scoped>
/* Page Layout styling */
.dashboard-footer {
  text-align: center;
  padding: 2.5rem 0 3.5rem 0;
  border-top: 1px solid hsl(var(--border) / 0.4);
  max-width: 1200px;
  margin: 2rem auto 0 auto;
}

.dashboard-footer p {
  font-size: 0.775rem;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.02em;
}

.team-highlight {
  font-weight: 700;
  color: hsl(var(--primary));
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

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

.spinner-ring {
  width: 48px;
  height: 48px;
  border: 4px solid hsl(var(--border));
  border-top-color: hsl(var(--primary));
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

.loading-text {
  font-size: 0.9rem;
  color: hsl(var(--muted-foreground));
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-container {
  min-height: 100vh;
  background-color: hsl(var(--background));
  display: flex;
  flex-direction: column;
}

.dashboard-header {
  height: 68px;
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
}

.header-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-box {
  width: 36px;
  height: 36px;
  background-color: hsl(var(--primary) / 0.15);
  border: 1px solid hsl(var(--primary) / 0.3);
  color: hsl(var(--primary));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-svg {
  width: 20px;
  height: 20px;
}

.logo-title {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid hsl(var(--border));
  background-color: hsl(var(--card));
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

.user-email {
  font-size: 0.725rem;
  color: hsl(var(--muted-foreground));
}

.logout-btn {
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
}

.btn-icon {
  width: 15px;
  height: 15px;
}

/* Dashboard main container */
.dashboard-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  flex: 1;
  width: 100%;
}

.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.5rem;
}

.welcome-title {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  margin-bottom: 0.35rem;
}

.welcome-subtitle {
  font-size: 0.95rem;
  color: hsl(var(--muted-foreground));
}

.create-btn {
  padding: 0.75rem 1.25rem;
}

/* Search bar styling */
.filter-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-lg);
  margin-bottom: 2rem;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  max-width: 480px;
}

.search-icon {
  width: 18px;
  height: 18px;
  color: hsl(var(--muted-foreground));
}

.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: hsl(var(--foreground));
  font-size: 0.9rem;
  width: 100%;
}

.dialect-badge-legend {
  display: flex;
  gap: 1.25rem;
}

.dialect-dot {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.775rem;
  color: hsl(var(--muted-foreground));
}

.dialect-dot::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-pg::before { background-color: #336791; }
.dot-my::before { background-color: #f29111; }
.dot-lit::before { background-color: #003b57; }

/* Grid systems */
.diagram-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
}

.diagram-card {
  position: relative;
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.diagram-card:hover {
  transform: translateY(-3px);
  background-color: hsl(var(--card-hover));
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

/* Dialect custom card highlight colors */
.dialect-border-postgresql { border-left: 3px solid #336791; }
.dialect-border-mysql { border-left: 3px solid #f29111; }
.dialect-border-sqlite { border-left: 3px solid #003b57; }

.diagram-card-content {
  flex: 1;
  padding-right: 1.5rem;
}

.diagram-meta-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.dialect-badge {
  font-size: 0.675rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.badge-postgresql { background-color: rgba(51, 103, 145, 0.15); color: #8cbbe3; border: 1px solid rgba(51, 103, 145, 0.3); }
.badge-mysql { background-color: rgba(242, 145, 17, 0.15); color: #ffd699; border: 1px solid rgba(242, 145, 17, 0.3); }
.badge-sqlite { background-color: rgba(0, 59, 87, 0.25); color: #76c0e6; border: 1px solid rgba(0, 59, 87, 0.4); }

.delete-card-btn {
  background: transparent;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
}

.delete-card-btn:hover {
  color: hsl(var(--destructive));
  background-color: hsl(var(--destructive) / 0.1);
}

.trash-icon {
  width: 15px;
  height: 15px;
}

.diagram-name {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.diagram-desc {
  font-size: 0.825rem;
  color: hsl(var(--muted-foreground));
  margin-bottom: 1.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.4rem;
  line-height: 1.2rem;
}

.diagram-meta-bottom {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.725rem;
  color: hsl(var(--muted-foreground));
}

.meta-icon {
  width: 12px;
  height: 12px;
}

.card-arrow {
  color: hsl(var(--muted-foreground));
  transition: transform 0.2s;
}

.diagram-card:hover .card-arrow {
  transform: translateX(3px);
  color: hsl(var(--primary));
}

.arrow-icon {
  width: 18px;
  height: 18px;
}

/* Empty design views */
.empty-state {
  text-align: center;
  padding: 5rem 2rem;
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon-box {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--muted-foreground));
  margin-bottom: 1.5rem;
}

.empty-icon {
  width: 28px;
  height: 28px;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.empty-state p {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  max-width: 380px;
  margin-bottom: 1.75rem;
}

/* Modals overlays */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.modal-card {
  width: 580px;
  max-height: 90vh;
  border-radius: var(--radius-xl);
  padding: 2rem;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.delete-modal {
  width: 420px;
  text-align: center;
  padding: 2.25rem 2rem;
}

.delete-warning {
  font-size: 0.9rem;
  color: hsl(var(--muted-foreground));
  margin: 1.25rem 0 1.75rem 0;
  line-height: 1.5;
}

.delete-actions {
  justify-content: center;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 0.85rem;
}

.modal-icon-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-icon-sparkle {
  width: 20px;
  height: 20px;
  color: hsl(var(--warning));
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: hsl(var(--muted-foreground));
  font-size: 1.75rem;
  cursor: pointer;
  line-height: 1;
}

.modal-close-btn:hover {
  color: hsl(var(--foreground));
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.textarea-field {
  resize: vertical;
}

/* Dialect grid */
.dialect-radio-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.dialect-radio-card {
  position: relative;
  padding: 0.85rem 0.5rem;
  border: 1px solid hsl(var(--border));
  background-color: hsl(var(--input));
  border-radius: var(--radius-md);
  text-align: center;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.dialect-radio-card:hover {
  background-color: hsl(var(--card-hover));
  border-color: hsl(var(--muted-foreground) / 0.4);
}

.dialect-radio-card.is-active {
  border-color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.08);
}

.radio-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

/* Templates grid selection */
.template-select-group {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.template-card {
  position: relative;
  border: 1px solid hsl(var(--border));
  background-color: hsl(var(--input));
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.template-card:hover {
  background-color: hsl(var(--card-hover));
}

.template-card.is-active {
  border-color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.06);
}

.template-card-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.template-card-icon {
  font-size: 1.5rem;
}

.template-card-text {
  display: flex;
  flex-direction: column;
}

.template-card-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.template-card-desc {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  border-top: 1px solid hsl(var(--border));
  padding-top: 1.25rem;
}

.spinner-inline {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s infinite linear;
}

.banner-actions,
.empty-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.text-warning {
  color: hsl(var(--warning));
}

/* Dashboard Main Grid Layout */
.dashboard-main-layout {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem 0;
  flex: 1;
}

/* Sidebar Workspace Panel */
.workspace-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  gap: 1.25rem;
  height: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.workspace-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.sidebar-sec-title {
  font-size: 0.775rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
}

.btn-icon-only {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-icon-only:hover {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
  border-color: hsl(var(--primary) / 0.2);
}

.plus-icon-mini {
  width: 14px;
  height: 14px;
}

.workspace-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 240px;
  overflow-y: auto;
}

.workspace-item-btn {
  background: transparent;
  border: 1px solid transparent;
  text-align: left;
  padding: 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.workspace-item-btn:hover {
  background: hsl(var(--muted) / 0.3);
}

.workspace-item-btn.is-active {
  background: hsl(var(--primary) / 0.1);
  border-color: hsl(var(--primary) / 0.25);
}

.workspace-btn-content {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.workspace-avatar-letter {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, hsl(var(--primary)), #06b6d4);
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.workspace-btn-meta {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  overflow: hidden;
}

.workspace-btn-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-btn-desc {
  font-size: 0.65rem;
  color: hsl(var(--muted-foreground));
}

.workspace-sidebar-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}

/* Collaborators/Members Section */
.workspace-members-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.workspace-members-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 240px;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.member-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  background: #1e293b;
}

.member-meta {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.member-name {
  font-size: 0.75rem;
  font-weight: 550;
  color: hsl(var(--foreground));
}

.member-role {
  font-size: 0.625rem;
  color: hsl(var(--primary));
  font-weight: 500;
  text-transform: capitalize;
}

/* Dashboard Content Right Area */
.dashboard-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}

/* Alert components inside forms */
.alert {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.775rem;
  font-weight: 500;
  margin-top: 0.5rem;
}

.alert-danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.alert-success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #34d399;
}
</style>
