<template>
  <div class="login-container">
    <!-- Animated background glowing orbs -->
    <div class="ambient-orb orb-purple"></div>
    <div class="ambient-orb orb-blue"></div>
    
    <div class="login-card glass-panel animate-fade-in">
      <div class="brand-section">
        <div class="logo-glow">
          <img src="/logo.png" alt="SyncQL Logo" class="brand-logo-img" />
        </div>
        <h1 class="brand-title">SyncQL</h1>
        <p class="brand-subtitle">Real-time Visual Database Schema Designer</p>
      </div>

      <!-- Quick Bypass / Demo Play Mode -->
      <div class="section-container guest-tray">
        <h2 class="section-title">One-Click Quick Login</h2>
        <p class="section-desc">Try collaboration features instantly with a developer persona!</p>
        
        <div class="avatar-grid">
          <button 
            v-for="persona in personas" 
            :key="persona.name"
            class="avatar-card"
            :class="{ 'is-selected': selectedPersona?.name === persona.name }"
            @click="selectAndLogin(persona)"
          >
            <img :src="persona.avatar" :alt="persona.name" class="persona-img" />
            <span class="persona-name">{{ persona.name }}</span>
            <span class="persona-role">{{ persona.role }}</span>
          </button>
        </div>
      </div>

      <div class="divider">
        <span>or connect official accounts</span>
      </div>

      <!-- Official OAuth Logins -->
      <div class="oauth-section">
        <button class="oauth-btn github-btn" @click="loginWith('github')">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          GitHub Account
        </button>

        <button class="oauth-btn google-btn" @click="loginWith('google')">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Google Account
        </button>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';

const { user, loginWithDemo, fetchUser } = useAuth();
const errorMessage = ref('');
const selectedPersona = ref(null);

const personas = [
  { name: 'Lead Architect', role: 'Database Architect', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=architect' },
  { name: 'Senior DB Dev', role: 'Query Optimizer', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=senior' },
  { name: 'Schema Designer', role: 'Visual Engineer', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=designer' },
  { name: 'Query Wizard', role: 'Performance Guru', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=wizard' }
];

onMounted(async () => {
  await fetchUser();
  if (user.value) {
    navigateTo('/');
  }
});

const selectAndLogin = async (persona) => {
  selectedPersona.value = persona;
  const success = await loginWithDemo(persona.name, persona.avatar);
  if (success) {
    navigateTo('/');
  } else {
    errorMessage.value = 'Failed to log in with guest persona.';
  }
};

const loginWith = (provider) => {
  // Direct client redirection to the backend OAuth router
  window.location.href = `/api/auth/${provider}`;
};
</script>

<style scoped>
.login-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: hsl(var(--background));
  overflow: hidden;
}

/* Glowing aesthetic orbs */
.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.3;
  z-index: 1;
}

.orb-purple {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, hsla(263, 70%, 50%, 0.8) 0%, transparent 80%);
  top: -10%;
  left: -10%;
  animation: floatOrb 20s infinite alternate ease-in-out;
}

.orb-blue {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, hsla(198, 88%, 48%, 0.8) 0%, transparent 80%);
  bottom: -15%;
  right: -10%;
  animation: floatOrb 25s infinite alternate-reverse ease-in-out;
}

@keyframes floatOrb {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(50px, 30px) scale(1.1); }
  100% { transform: translate(-20px, -50px) scale(0.9); }
}

/* Glassmorphic main login card */
.login-card {
  position: relative;
  z-index: 10;
  width: 480px;
  padding: 3rem 2.5rem;
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  text-align: center;
}

.brand-section {
  margin-bottom: 2.25rem;
}

.logo-glow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  border: 1px solid hsl(var(--primary) / 0.25);
  box-shadow: 0 0 16px 2px hsla(263, 70%, 50%, 0.2);
  margin-bottom: 1.25rem;
}

.brand-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-lg);
}

.brand-title {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  background: linear-gradient(135deg, #fff 30%, hsl(var(--primary-focus)) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
}

.brand-subtitle {
  font-size: 0.925rem;
  color: hsl(var(--muted-foreground));
}

.developer-credit {
  font-size: 0.725rem;
  color: hsl(var(--primary) / 0.85);
  margin-top: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-shadow: 0 0 10px hsla(263, 70%, 50%, 0.3);
}

/* Guest persona select layouts */
.guest-tray {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 0.25rem;
}

.section-desc {
  font-size: 0.775rem;
  color: hsl(var(--muted-foreground));
  margin-bottom: 1.25rem;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.avatar-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0.5rem;
  background-color: hsl(var(--input));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.avatar-card:hover {
  border-color: hsl(var(--primary) / 0.5);
  background-color: hsl(var(--card-hover));
  transform: translateY(-2px);
}

.avatar-card.is-selected {
  border-color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.08);
  box-shadow: 0 0 10px 1px var(--primary-glow);
}

.persona-img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid hsl(var(--border));
  background-color: hsl(var(--background));
  margin-bottom: 0.5rem;
}

.avatar-card.is-selected .persona-img {
  border-color: hsl(var(--primary));
}

.persona-name {
  font-size: 0.825rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 0.15rem;
}

.persona-role {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
}

.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.75rem 0;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: hsl(var(--border));
}

.divider::before { margin-right: 1rem; }
.divider::after { margin-left: 1rem; }

/* OAuth buttons styles */
.oauth-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid hsl(var(--border));
  transition: all 0.15s ease;
  background-color: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
}

.oauth-btn:hover {
  background-color: hsl(var(--accent));
  border-color: hsl(var(--muted-foreground) / 0.4);
}

.icon-svg {
  width: 20px;
  height: 20px;
}

.error-message {
  margin-top: 1.25rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  background-color: hsl(var(--destructive) / 0.15);
  border: 1px solid hsl(var(--destructive) / 0.3);
  color: #ffa4a4;
  font-size: 0.825rem;
}
</style>
