/**
 * SALTEDHASH Theme Registry
 * CSS custom property based themes for instant switching
 * All values can be changed without breaking layout
 */

export const THEME_REGISTRY = {
  dracula_classic: {
    id: 'dracula_classic',
    name: 'Dracula Classic',
    description: 'Dark with vibrant magenta accents. Developer favorite.',
    background: 'linear-gradient(135deg, #282a36 0%, #44475a 100%)',
    containerBg: '#282a36',
    text: '#f8f8f2',
    accent: '#ff79c6',
    keywords: '#ff79c6',
    strings: '#f1fa8c',
    comments: '#6272a4',
    numbers: '#bd93f9',
    functions: '#50fa7b',
    borders: '#44475a'
  },

  nord_frost: {
    id: 'nord_frost',
    name: 'Nord Frost',
    description: 'Arctic palette with cool blues. Professional and calm.',
    background: 'linear-gradient(135deg, #2e3440 0%, #4c566a 100%)',
    containerBg: '#2e3440',
    text: '#d8dee9',
    accent: '#88c0d0',
    keywords: '#81a1c1',
    strings: '#a3be8c',
    comments: '#4c566a',
    numbers: '#b48ead',
    functions: '#8fbcbb',
    borders: '#4c566a'
  },

  cyberpunk_neon: {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    description: 'Vibrant pink and cyan. Maximum visual pop for social.',
    background: 'linear-gradient(135deg, #f30067 0%, #2b0054 100%)',
    containerBg: '#000b19',
    text: '#00f0ff',
    accent: '#fffb00',
    keywords: '#f30067',
    strings: '#00f0ff',
    comments: '#005577',
    numbers: '#ff0055',
    functions: '#fffb00',
    borders: '#f30067'
  },

  minimal_light: {
    id: 'minimal_light',
    name: 'Minimal Light',
    description: 'Clean white background. Perfect for documentation.',
    background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
    containerBg: '#ffffff',
    text: '#1a1a1a',
    accent: '#0066cc',
    keywords: '#d73a49',
    strings: '#22863a',
    comments: '#6a737d',
    numbers: '#005cc5',
    functions: '#6f42c1',
    borders: '#e1e4e8'
  },

  github_dark: {
    id: 'github_dark',
    name: 'GitHub Dark',
    description: 'Matches GitHub native dark theme. Familiar to developers.',
    background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
    containerBg: '#0d1117',
    text: '#c9d1d9',
    accent: '#58a6ff',
    keywords: '#ff7b72',
    strings: '#79c0ff',
    comments: '#8b949e',
    numbers: '#79c0ff',
    functions: '#d2a8ff',
    borders: '#30363d'
  }
};

/**
 * Get a theme by ID
 */
export function getTheme(themeId) {
  return THEME_REGISTRY[themeId] || THEME_REGISTRY.dracula_classic;
}

/**
 * Get all available themes (for theme selector UI)
 */
export function getAllThemes() {
  return Object.values(THEME_REGISTRY);
}

/**
 * Generate CSS variables string for a theme
 * Usage: inject into <style> tag or CSS-in-JS
 */
export function generateThemeCSSVariables(themeId) {
  const theme = getTheme(themeId);
  
  const cssVars = Object.entries(theme)
    .filter(([key]) => key !== 'id' && key !== 'name' && key !== 'description')
    .map(([key, value]) => `--theme-${key}: ${value};`)
    .join('\n  ');
  
  return `:root {\n  ${cssVars}\n}`;
}

/**
 * Generate inline styles object for Vue/React components
 */
export function generateThemeStyles(themeId) {
  const theme = getTheme(themeId);
  const styles = {};
  
  Object.entries(theme).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'name' && key !== 'description') {
      // Convert kebab-case to camelCase for CSS-in-JS
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      styles[`--theme${camelKey.charAt(0).toUpperCase() + camelKey.slice(1)}`] = value;
    }
  });
  
  return styles;
}

export default {
  THEME_REGISTRY,
  getTheme,
  getAllThemes,
  generateThemeCSSVariables,
  generateThemeStyles
};
