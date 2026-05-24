<template>
  <aside class="sidebar-left glass-panel">
    <div class="sidebar-section">
      <h3 class="section-title">Navigation</h3>
      
      <!-- Table Search -->
      <div class="search-box">
        <Search class="search-icon" />
        <input 
          v-model="query" 
          type="text" 
          placeholder="Filter tables..." 
          class="search-input"
        />
      </div>
      
      <!-- Tables Browser -->
      <div class="tables-browser scrollable">
        <div v-if="filteredTables.length > 0" class="tables-list">
          <button 
            v-for="t in filteredTables" 
            :key="t.id"
            class="table-list-item"
            :class="[t.color, { 'is-active': activeTableId === t.id }]"
            @click="$emit('select-table', t.id)"
            @dblclick="$emit('center-table', t.id)"
          >
            <div class="list-item-color-indicator"></div>
            <span class="list-item-name">{{ t.name }}</span>
            <span class="list-item-cols-count">{{ getColumnsCount(t.id) }} cols</span>
          </button>
        </div>
        <div v-else class="empty-list">
          No matching tables.
        </div>
      </div>
    </div>

    <!-- DB Target Schema Dialects -->
    <div class="sidebar-section border-top">
      <h3 class="section-title">SQL Dialect</h3>
      <div class="dialect-selector">
        <button 
          v-for="d in ['postgresql', 'mysql', 'sqlite']" 
          :key="d"
          class="dialect-tab"
          :class="{ 'is-active': dialect === d }"
          @click="$emit('update-dialect', d)"
        >
          {{ d === 'postgresql' ? 'Postgres' : d === 'mysql' ? 'MySQL' : 'SQLite' }}
        </button>
      </div>
    </div>

    <!-- Statistics Panel -->
    <div class="sidebar-section border-top stats-panel">
      <div class="stat-row">
        <span>Total Tables</span>
        <span class="stat-val">{{ tables.length }}</span>
      </div>
      <div class="stat-row">
        <span>Total Columns</span>
        <span class="stat-val">{{ columns.length }}</span>
      </div>
      <div class="stat-row">
        <span>Total Foreign Keys</span>
        <span class="stat-val">{{ relations.length }}</span>
      </div>
    </div>

    <!-- Sidebar footer credits -->
    <div class="sidebar-footer-credit">
      <span>All rights reserved © 2026 by SynchronizeTeams</span>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Search } from 'lucide-vue-next';

const props = defineProps({
  tables: { type: Array, required: true },
  columns: { type: Array, required: true },
  relations: { type: Array, required: true },
  activeTableId: { type: String, default: '' },
  dialect: { type: String, default: 'postgresql' }
});

defineEmits([
  'select-table', 'center-table', 'update-dialect'
]);

const query = ref('');

const filteredTables = computed(() => {
  if (!query.value) return props.tables;
  const q = query.value.toLowerCase();
  return props.tables.filter(t => t.name.toLowerCase().includes(q));
});

const getColumnsCount = (tableId) => {
  return props.columns.filter(c => c.table_id === tableId).length;
};
</script>

<style scoped>
.sidebar-left {
  width: 250px;
  height: calc(100vh - 60px);
  position: absolute;
  left: 0;
  top: 60px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  border-left: none;
  border-top: none;
  border-bottom: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  background: hsla(224, 25%, 10%, 0.85);
}

.sidebar-section {
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.border-top {
  border-top: 1px solid hsl(var(--border));
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: hsl(var(--input));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-md);
}

.search-icon {
  width: 15px;
  height: 15px;
  color: hsl(var(--muted-foreground));
}

.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: hsl(var(--foreground));
  font-size: 0.8rem;
  width: 100%;
}

/* Scrollable tables list browser */
.tables-browser {
  flex: 1;
  max-height: 250px;
  overflow-y: auto;
}

.scrollable {
  overflow-y: auto;
}

.tables-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.table-list-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.65rem;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: hsl(var(--foreground));
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.table-list-item:hover {
  background-color: hsl(var(--card-hover));
}

.table-list-item.is-active {
  background-color: hsl(var(--primary) / 0.1);
  border-color: hsl(var(--primary) / 0.3);
}

.list-item-color-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: hsl(var(--table-accent, var(--primary)));
  margin-right: 0.65rem;
}

.list-item-name {
  font-size: 0.8rem;
  font-weight: 600;
  flex: 1;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.list-item-cols-count {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
}

.empty-list {
  text-align: center;
  padding: 1.5rem 0;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  font-style: italic;
}

/* Dialect tab toggler styles */
.dialect-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  background-color: hsl(var(--input));
  padding: 3px;
  border-radius: var(--radius-md);
  border: 1px solid hsl(var(--border));
}

.dialect-tab {
  padding: 0.45rem 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  background-color: transparent;
  color: hsl(var(--muted-foreground));
  border: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  text-align: center;
}

.dialect-tab.is-active {
  background-color: hsl(var(--card));
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
}

/* Statistics row layout */
.stats-panel {
  flex: 1;
  justify-content: flex-end;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.stat-val {
  font-weight: 700;
  color: hsl(var(--foreground));
}

.sidebar-footer-credit {
  text-align: center;
  padding: 0.85rem 0.5rem;
  border-top: 1px solid hsl(var(--border) / 0.4);
  font-size: 0.65rem;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.03em;
}

.team-highlight-mini {
  font-weight: 700;
  color: hsl(var(--primary));
  text-transform: uppercase;
}
</style>
