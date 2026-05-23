<template>
  <div id="app" class="bg-slate-950 text-slate-100 min-h-screen">
    <!-- Navigation -->
    <nav class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-8">
          <h1 class="text-2xl font-bold text-white">⚡ SALTEDHASH</h1>
          <div v-if="isAuthenticated" class="flex gap-6 text-sm">
            <router-link to="/" class="text-slate-400 hover:text-white transition">Dashboard</router-link>
            <router-link to="/snap" class="text-slate-400 hover:text-white transition">Snap & Code</router-link>
            <router-link to="/stories" class="text-slate-400 hover:text-white transition">Stories</router-link>
            <router-link to="/library" class="text-slate-400 hover:text-white transition">Library</router-link>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span v-if="isAuthenticated" class="text-sm text-slate-400">{{ currentUser.email }}</span>
          <button
            v-if="isAuthenticated"
            @click="logout"
            class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition"
          >
            Logout
          </button>
          <router-link v-else to="/auth" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition">
            Login
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="bg-slate-900 border-t border-slate-800 mt-16 py-8 text-center text-sm text-slate-400">
      <p>💚 SALTEDHASH Developer Creation Tools | Made with passion for developers</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from './stores/userStore';

const router = useRouter();
const userStore = useUserStore();

const currentUser = computed(() => userStore.user);
const isAuthenticated = computed(() => !!userStore.token);

onMounted(async () => {
  const token = localStorage.getItem('authToken');
  if (token) {
    userStore.setToken(token);
    await userStore.fetchCurrentUser();
  }
});

function logout() {
  userStore.logout();
  router.push('/auth');
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #0f172a;
  color: #e2e8f0;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
