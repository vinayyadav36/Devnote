<template>
  <div class="p-6">
    <h1 class="text-4xl font-bold text-white mb-8">📊 Dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <p class="text-slate-400 text-sm">Total Snippets</p>
        <p class="text-3xl font-bold text-white">{{ stats.snippets }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <p class="text-slate-400 text-sm">Stories</p>
        <p class="text-3xl font-bold text-white">{{ stats.stories }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <p class="text-slate-400 text-sm">Exports</p>
        <p class="text-3xl font-bold text-white">{{ stats.exports }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <p class="text-slate-400 text-sm">Member Since</p>
        <p class="text-lg font-bold text-white">Today</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 class="text-xl font-bold text-white mb-4">🚀 Quick Start</h2>
        <div class="space-y-3">
          <router-link to="/snap" class="block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition text-center">
            Create Postcard
          </router-link>
          <router-link to="/stories" class="block px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded transition text-center">
            Write Story
          </router-link>
          <router-link to="/library" class="block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition text-center">
            View Library
          </router-link>
        </div>
      </div>

      <div class="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 class="text-xl font-bold text-white mb-4">📚 Welcome!</h2>
        <p class="text-slate-300 mb-4">Welcome to SALTEDHASH. Transform your code snippets into beautiful, shareable content.</p>
        <p class="text-slate-400 text-sm">Get started by creating your first code postcard or story above.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const stats = ref({
  snippets: 0,
  stories: 0,
  exports: 0
});

onMounted(() => {
  // Initialize stats
});
</script>
