<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import * as authApi from '../api/auth.js'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authApi.register(email.value, password.value)
    router.push('/login')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <form class="auth-form" @submit.prevent="handleSubmit">
      <h1>Register</h1>
      <p v-if="error" class="error">{{ error }}</p>
      <label>
        Email
        <input v-model="email" type="email" required autocomplete="email" />
      </label>
      <label>
        Password
        <input v-model="password" type="password" required minlength="8" autocomplete="new-password" />
      </label>
      <button type="submit" :disabled="loading">{{ loading ? 'Registering...' : 'Register' }}</button>
      <p class="switch">Already have an account? <router-link to="/login">Login</router-link></p>
    </form>
  </div>
</template>

<style scoped>
.auth-page { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
.auth-form { display: flex; flex-direction: column; gap: 1rem; width: 100%; max-width: 360px; padding: 2rem; border: 1px solid #ddd; border-radius: 8px; }
.auth-form h1 { margin: 0; }
.auth-form label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; }
.auth-form input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
.auth-form button { padding: 0.6rem; background: #4f46e5; color: #fff; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; }
.auth-form button:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: #dc2626; font-size: 0.875rem; margin: 0; }
.switch { font-size: 0.875rem; text-align: center; }
</style>
