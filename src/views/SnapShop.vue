<template>
  <div class="snap-shop-container p-6 max-w-6xl mx-auto bg-slate-950 min-h-screen">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-white mb-2">✨ Snap & Code Shop</h1>
      <p class="text-slate-400">Transform code snippets into beautiful, shareable postcards</p>
    </div>

    <!-- Input Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Code Editor -->
      <div class="lg:col-span-2">
        <label class="block text-sm font-semibold text-slate-300 mb-3">Code Input</label>
        <textarea
          v-model="codeInput"
          @input="onCodeChange"
          placeholder="Paste your code here... (max 64KB)"
          class="w-full h-64 p-4 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-600 resize-none"
        ></textarea>
        <p class="text-xs text-slate-500 mt-2">{{ codeInput.length }} / 65536 characters</p>
      </div>

      <!-- Settings Panel -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">Language</label>
          <select
            v-model="language"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-600"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="sql">SQL</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="bash">Bash</option>
            <option value="json">JSON</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">Title (optional)</label>
          <input
            v-model="title"
            type="text"
            placeholder="e.g., React Hook"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">Tags</label>
          <input
            v-model="tagsInput"
            type="text"
            placeholder="react,hooks,javascript"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100 text-sm focus:outline-none focus:border-indigo-600"
          />
        </div>

        <button
          @click="sendToServer"
          :disabled="!codeInput || isSending"
          class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold rounded transition"
        >
          {{ isSending ? '⏳ Saving...' : '💾 Save Snippet' }}
        </button>
      </div>
    </div>

    <!-- Theme Selection Toolbar -->
    <div class="bg-slate-900 p-4 rounded-lg border border-slate-800 mb-6">
      <p class="text-sm font-semibold text-slate-300 mb-3">Visual Themes</p>
      <div class="flex gap-3 overflow-x-auto">
        <button
          v-for="theme in themes"
          :key="theme.id"
          @click="activeTheme = theme"
          :class="[
            'px-4 py-2 rounded text-sm font-mono transition whitespace-nowrap',
            activeTheme.id === theme.id
              ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          ]"
        >
          {{ theme.name }}
        </button>
      </div>
    </div>

    <!-- Export Controls -->
    <div class="flex gap-3 mb-6">
      <button
        @click="exportPostcard"
        :disabled="!codeInput || isExporting"
        class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold rounded transition flex items-center gap-2"
      >
        {{ isExporting ? '🔄 Generating...' : '📸 Export PNG' }}
      </button>
      <button
        @click="copySVG"
        :disabled="!codeInput"
        class="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white font-semibold rounded transition flex items-center gap-2"
      >
        📋 Copy SVG
      </button>
    </div>

    <!-- Preview Container -->
    <div class="bg-slate-900 p-8 rounded-lg border border-slate-800">
      <p class="text-sm font-semibold text-slate-300 mb-4">Preview</p>
      <div
        ref="postcardRef"
        :style="{ background: activeTheme.background }"
        class="p-12 rounded-xl shadow-2xl transition-all duration-300 flex items-center justify-center min-h-[350px]"
      >
        <div
          v-if="highlightedHtml"
          :style="{ backgroundColor: activeTheme.containerBg }"
          class="w-full max-w-2xl rounded-lg overflow-hidden shadow-2xl border border-white/10 font-mono text-sm text-left"
        >
          <!-- Window Chrome Controls -->
          <div class="flex items-center gap-2 px-4 py-3 bg-black/20 border-b border-white/5">
            <div class="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div class="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div class="w-3 h-3 rounded-full bg-[#27c93f]"></div>
            <span class="text-xs text-white/40 ml-2">{{ language }}</span>
          </div>

          <!-- Rendered Code Block -->
          <pre class="p-6 overflow-x-auto select-none">
            <code
              v-html="highlightedHtml"
              :style="{ color: activeTheme.text }"
              class="prism-render"
            ></code>
          </pre>

          <!-- Footer with Watermark -->
          <div class="px-6 py-3 bg-black/20 border-t border-white/5 text-xs text-white/40">
            💚 Made with SALTEDHASH
          </div>
        </div>

        <div v-else class="text-slate-500 text-center">
          <p class="text-lg">👆 Enter code to see preview</p>
        </div>
      </div>
    </div>

    <!-- Status Messages -->
    <div v-if="statusMessage" class="mt-4 p-4 bg-emerald-900 border border-emerald-600 rounded text-emerald-100 text-sm">
      ✅ {{ statusMessage }}
    </div>
    <div v-if="errorMessage" class="mt-4 p-4 bg-red-900 border border-red-600 rounded text-red-100 text-sm">
      ❌ {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// State
const codeInput = ref('const saltedhash = true;\nconsole.log("Building tools for developers");');
const language = ref('javascript');
const title = ref('');
const tagsInput = ref('');
const highlightedHtml = ref('');
const activeTheme = ref(null);
const postcardRef = ref(null);
const isExporting = ref(false);
const isSending = ref(false);
const statusMessage = ref('');
const errorMessage = ref('');

// Theme Registry
const themes = ref([
  {
    id: 'dracula_classic',
    name: '🧛 Dracula Classic',
    background: 'linear-gradient(135deg, #282a36 0%, #44475a 100%)',
    containerBg: '#282a36',
    text: '#f8f8f2',
    accent: '#ff79c6'
  },
  {
    id: 'nord_frost',
    name: '❄️ Nord Frost',
    background: 'linear-gradient(135deg, #2e3440 0%, #4c566a 100%)',
    containerBg: '#2e3440',
    text: '#d8dee9',
    accent: '#88c0d0'
  },
  {
    id: 'cyberpunk_neon',
    name: '⚡ Cyberpunk Neon',
    background: 'linear-gradient(135deg, #f30067 0%, #2b0054 100%)',
    containerBg: '#000b19',
    text: '#00f0ff',
    accent: '#fffb00'
  },
  {
    id: 'minimal_light',
    name: '☀️ Minimal Light',
    background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
    containerBg: '#ffffff',
    text: '#1a1a1a',
    accent: '#0066cc'
  },
  {
    id: 'github_dark',
    name: '🐙 GitHub Dark',
    background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
    containerBg: '#0d1117',
    text: '#c9d1d9',
    accent: '#58a6ff'
  }
]);

// Initialize first theme
watch(
  themes,
  () => {
    if (!activeTheme.value && themes.value.length > 0) {
      activeTheme.value = themes.value[0];
    }
  },
  { immediate: true }
);

// Web Worker for background rendering
const exportWorker = new Worker(new URL('../workers/exportWorker.js', import.meta.url), {
  type: 'module'
});

/**
 * Send code to server for tokenization with PrismJS
 */
async function onCodeChange() {
  if (!codeInput.value) {
    highlightedHtml.value = '';
    return;
  }

  try {
    const response = await fetch('/api/v1/snippets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippetId: `snp_${Date.now()}`,
        userId: 'anonymous_user',
        code: codeInput.value,
        language: language.value,
        title: title.value || 'Untitled',
        tags: tagsInput.value.split(',').filter(t => t.trim()),
        isPublic: false
      })
    });

    if (!response.ok) {
      throw new Error('Failed to tokenize code');
    }

    const { data } = await response.json();
    highlightedHtml.value = data.htmlHighlight;
  } catch (error) {
    console.error('Tokenization error:', error);
    errorMessage.value = `Failed to highlight code: ${error.message}`;
    setTimeout(() => (errorMessage.value = ''), 5000);
  }
}

/**
 * Save snippet to backend
 */
async function sendToServer() {
  if (!codeInput.value) {
    errorMessage.value = 'Please enter code first';
    return;
  }

  isSending.value = true;

  try {
    const response = await fetch('/api/v1/snippets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippetId: `snp_${Date.now()}`,
        userId: 'anonymous_user',
        code: codeInput.value,
        language: language.value,
        title: title.value || 'Untitled Snippet',
        tags: tagsInput.value.split(',').filter(t => t.trim()),
        isPublic: true
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save snippet');
    }

    statusMessage.value = '✅ Snippet saved successfully!';
    setTimeout(() => (statusMessage.value = ''), 3000);
  } catch (error) {
    errorMessage.value = `Save failed: ${error.message}`;
    setTimeout(() => (errorMessage.value = ''), 5000);
  } finally {
    isSending.value = false;
  }
}

/**
 * Export postcard as PNG using Web Worker
 */
function exportPostcard() {
  if (!postcardRef.value || isExporting.value) return;
  isExporting.value = true;

  const htmlContent = postcardRef.value.outerHTML;
  const width = postcardRef.value.offsetWidth;
  const height = postcardRef.value.offsetHeight;

  exportWorker.postMessage({ htmlContent, width, height });

  exportWorker.onmessage = (e) => {
    const { blobUrl, error } = e.data;
    isExporting.value = false;

    if (error) {
      errorMessage.value = `Export failed: ${error}`;
      setTimeout(() => (errorMessage.value = ''), 5000);
      return;
    }

    // Trigger browser download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `saltedhash-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(blobUrl);
    
    statusMessage.value = '✅ PNG exported successfully!';
    setTimeout(() => (statusMessage.value = ''), 3000);
  };
}

/**
 * Copy SVG to clipboard
 */
function copySVG() {
  if (!postcardRef.value) return;

  const svgData = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${postcardRef.value.offsetWidth}" height="${postcardRef.value.offsetHeight}">
      <foreignObject width="100%" height="100%">
        ${postcardRef.value.outerHTML}
      </foreignObject>
    </svg>
  `;

  navigator.clipboard.writeText(svgData).then(() => {
    statusMessage.value = '✅ SVG copied to clipboard!';
    setTimeout(() => (statusMessage.value = ''), 3000);
  });
}

// Initialize on mount
onCodeChange();
</script>

<style scoped>
.snap-shop-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    sans-serif;
}

.prism-render {
  line-height: 1.6;
  word-break: break-word;
}

.prism-render .token {
  display: inline;
}

.prism-render .token.keyword {
  font-weight: bold;
  opacity: 0.9;
}

.prism-render .token.string {
  opacity: 0.85;
}

.prism-render .token.comment {
  font-style: italic;
  opacity: 0.7;
}

.prism-render .token.function {
  opacity: 0.9;
}

.prism-render .token.punctuation {
  opacity: 0.8;
}
</style>
