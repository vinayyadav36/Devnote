import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('authToken') || null);
  const user = ref(null);

  const isAuthenticated = computed(() => !!token.value);

  async function requestMagicLink(email) {
    const response = await fetch('/api/v1/auth/magic-link/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error('Failed to request magic link');
    }

    return await response.json();
  }

  async function verifyMagicLink(linkToken) {
    const response = await fetch('/api/v1/auth/magic-link/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: linkToken })
    });

    if (!response.ok) {
      throw new Error('Failed to verify magic link');
    }

    const data = await response.json();
    setToken(data.token);
    return data;
  }

  async function fetchCurrentUser() {
    if (!token.value) return;

    const response = await fetch('/api/v1/auth/me', {
      headers: {
        'Authorization': `******
      }
    });

    if (!response.ok) {
      logout();
      return;
    }

    const data = await response.json();
    user.value = data.data;
  }

  function setToken(newToken) {
    token.value = newToken;
    localStorage.setItem('authToken', newToken);
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('authToken');
  }

  function getAuthHeader() {
    if (!token.value) return {};
    return {
      'Authorization': `******
    };
  }

  return {
    token,
    user,
    isAuthenticated,
    requestMagicLink,
    verifyMagicLink,
    fetchCurrentUser,
    setToken,
    logout,
    getAuthHeader
  };
});
