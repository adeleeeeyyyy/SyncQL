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
    <main class="dashboard-main">
      <div class="welcome-banner">
        <div class="banner-text">
          <h1 class="welcome-title">My Database Diagrams</h1>
          <p class="welcome-subtitle">Design, edit, and collaborate on structural schemas in real-time.</p>
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
        <p>Create your first schema or seed a pre-made template to try visual relations!</p>
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
    await loadDiagrams();
  }
});

const loadDiagrams = async () => {
  try {
    const data = await $fetch('/api/diagrams');
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
      body: newDiagramForm.value
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
</style>
