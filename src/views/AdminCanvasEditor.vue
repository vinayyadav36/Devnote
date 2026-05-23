<template>
  <div class="admin-canvas-editor">
    <h1>Canvas Template Editor</h1>
    <p class="subtitle">Design custom code postcard templates with live preview</p>

    <div class="editor-grid">
      <!-- Left: Template Editor -->
      <div class="editor-panel">
        <div class="section">
          <label>Template Name</label>
          <input
            v-model="template.name"
            type="text"
            placeholder="e.g., 'Developer Tutorial'"
            class="input"
          />
        </div>

        <div class="section">
          <label>Header Background</label>
          <input
            v-model="template.headerBg"
            type="color"
            class="color-picker"
          />
        </div>

        <div class="section">
          <label>Code Theme</label>
          <select v-model="template.theme" class="select">
            <option value="dracula_classic">Dracula Classic</option>
            <option value="nord_frost">Nord Frost</option>
            <option value="cyberpunk_neon">Cyberpunk Neon</option>
            <option value="minimal_light">Minimal Light</option>
            <option value="github_dark">GitHub Dark</option>
          </select>
        </div>

        <div class="section">
          <label>Padding (px)</label>
          <input
            v-model.number="template.padding"
            type="number"
            min="8"
            max="48"
            class="input"
          />
        </div>

        <div class="section">
          <label>Border Radius (px)</label>
          <input
            v-model.number="template.borderRadius"
            type="number"
            min="0"
            max="32"
            class="input"
          />
        </div>

        <div class="section">
          <label>Font Size (px)</label>
          <input
            v-model.number="template.fontSize"
            type="number"
            min="10"
            max="20"
            class="input"
          />
        </div>

        <div class="section">
          <label>Show Line Numbers</label>
          <input v-model="template.showLineNumbers" type="checkbox" />
        </div>

        <div class="section">
          <label>Max Height (px)</label>
          <input
            v-model.number="template.maxHeight"
            type="number"
            min="200"
            max="800"
            class="input"
          />
        </div>

        <div class="button-group">
          <button @click="saveTemplate" class="btn btn-primary">Save Template</button>
          <button @click="resetTemplate" class="btn btn-secondary">Reset</button>
        </div>
      </div>

      <!-- Right: Live Preview -->
      <div class="preview-panel">
        <div class="preview-header">Live Preview</div>

        <div
          class="code-postcard"
          :style="{
            borderRadius: template.borderRadius + 'px',
            padding: template.padding + 'px',
            backgroundColor: template.headerBg
          }"
        >
          <div class="postcard-header">
            <h3>Sample Code</h3>
          </div>

          <div
            class="postcard-code"
            :class="`theme-${template.theme}`"
            :style="{
              fontSize: template.fontSize + 'px',
              maxHeight: template.maxHeight + 'px'
            }"
          >
            <pre><code>{{ sampleCode }}</code></pre>
          </div>

          <div class="postcard-footer">
            <span>JavaScript</span>
            <span>{{ sampleCode.split('\n').length }} lines</span>
          </div>
        </div>

        <div class="template-json">
          <h4>Template JSON</h4>
          <pre>{{ JSON.stringify(template, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Saved Templates -->
    <div class="saved-templates">
      <h2>Saved Templates</h2>
      <div class="templates-list">
        <div v-for="t in savedTemplates" :key="t.id" class="template-card">
          <h4>{{ t.name }}</h4>
          <button @click="loadTemplate(t)" class="btn btn-small">Load</button>
          <button @click="deleteTemplate(t.id)" class="btn btn-small btn-danger">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AdminCanvasEditor',
  data() {
    return {
      template: {
        name: 'My Template',
        headerBg: '#282a36',
        theme: 'dracula_classic',
        padding: 16,
        borderRadius: 8,
        fontSize: 13,
        showLineNumbers: true,
        maxHeight: 400
      },
      savedTemplates: [],
      sampleCode: `function helloWorld() {
  console.log("SALTEDHASH");
  return true;
}`
    };
  },
  mounted() {
    this.loadSavedTemplates();
  },
  methods: {
    async saveTemplate() {
      try {
        const response = await fetch('/api/v1/admin/canvas-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.template)
        });

        if (response.ok) {
          alert('✅ Template saved!');
          this.loadSavedTemplates();
        } else {
          alert('❌ Failed to save template');
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    },
    async loadSavedTemplates() {
      try {
        const response = await fetch('/api/v1/admin/canvas-templates');
        if (response.ok) {
          const data = await response.json();
          this.savedTemplates = data.templates || [];
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    },
    loadTemplate(template) {
      this.template = { ...template };
    },
    async deleteTemplate(id) {
      if (!confirm('Delete this template?')) return;

      try {
        const response = await fetch(`/api/v1/admin/canvas-templates/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          alert('✅ Template deleted');
          this.loadSavedTemplates();
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    },
    resetTemplate() {
      this.template = {
        name: 'My Template',
        headerBg: '#282a36',
        theme: 'dracula_classic',
        padding: 16,
        borderRadius: 8,
        fontSize: 13,
        showLineNumbers: true,
        maxHeight: 400
      };
    }
  }
});
</script>

<style scoped>
.admin-canvas-editor {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  font-size: 28px;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.editor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
}

.editor-panel,
.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 600;
  font-size: 14px;
}

.input,
.select,
.color-picker {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #0066cc;
  color: white;
}

.btn-primary:hover {
  background: #0052a3;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.preview-header {
  font-weight: 600;
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.code-postcard {
  border: 1px solid #ddd;
  overflow: hidden;
}

.postcard-header {
  background: #f5f5f5;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
}

.postcard-header h3 {
  margin: 0;
  font-size: 16px;
}

.postcard-code {
  overflow-x: auto;
  padding: 1rem;
}

.postcard-footer {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f5f5f5;
  border-top: 1px solid #ddd;
  font-size: 12px;
}

.template-json {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  max-height: 300px;
}

.template-json pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}

.saved-templates {
  margin-top: 3rem;
}

.templates-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.template-card {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.template-card h4 {
  margin: 0;
  font-size: 14px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-danger {
  background: #cc0000;
  color: white;
}

.btn-danger:hover {
  background: #990000;
}

@media (max-width: 1024px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
