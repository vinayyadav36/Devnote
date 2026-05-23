<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-8">
        <h1 class="text-3xl font-bold text-white mb-2">⚡ SALTEDHASH</h1>
        <p class="text-slate-400 mb-8">Developer Creation Tools</p>

        <!-- Step 1: Email Entry -->
        <div v-if="step === 'email'">
          <label class="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
          <input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-indigo-600 mb-4"
          />
          <button
            @click="sendMagicLink"
            :disabled="!email || isLoading"
            class="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-semibold rounded transition"
          >
            {{ isLoading ? 'Sending...' : '📧 Send Magic Link' }}
          </button>
        </div>

        <!-- Step 2: Token Verification -->
        <div v-else-if="step === 'verify'">
          <p class="text-slate-300 mb-4">✅ Check your email for a magic link or paste the token below:</p>
          <input
            v-model="token"
            type="text"
            placeholder="Paste token here"
            class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-indigo-600 mb-4"
          />
          <button
            @click="verifyToken"
            :disabled="!token || isLoading"
            class="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold rounded transition"
          >
            {{ isLoading ? 'Verifying...' : '✓ Verify Token' }}
          </button>
          <button
            @click="step = 'email'"
            class="w-full mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded transition"
          >
            Back
          </button>
        </div>

        <!-- Success -->
        <div v-else-if="step === 'success'" class="text-center">
          <p class="text-4xl mb-4">🎉</p>
          <p class="text-slate-100 mb-4">Welcome! You're now signed in.</p>
          <p class="text-sm text-slate-400">Redirecting...</p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mt-4 p-3 bg-red-900/20 border border-red-600/50 rounded text-red-400 text-sm">
          {{ error }}
        </div>
      </div>

      <p class="text-center text-slate-500 text-xs mt-8">
        No password needed. We'll send you a secure magic link to sign in.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';

const router = useRouter();
const userStore = useUserStore();

const step = ref('email');
const email = ref('');
const token = ref('');
const isLoading = ref(false);
const error = ref('');

async function sendMagicLink() {
  if (!email.value) return;
  isLoading.value = true;
  error.value = '';

  try {
    const response = await userStore.requestMagicLink(email.value);
    // For MVP, show token from response
    if (response.magicLink) {
      token.value = response.magicLink.split('token=')[1];
    }
    step.value = 'verify';
  } catch (err) {
    error.value = 'Failed to send magic link. Please try again.';
  } finally {
    isLoading.value = false;
  }
}

async function verifyToken() {
  if (!token.value) return;
  isLoading.value = true;
  error.value = '';

  try {
    await userStore.verifyMagicLink(token.value);
    await userStore.fetchCurrentUser();
    step.value = 'success';
    setTimeout(() => router.push('/'), 1500);
  } catch (err) {
    error.value = 'Invalid or expired token. Please try again.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
input::placeholder {
  color: #64748b;
}
</style>
