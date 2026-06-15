import { api } from './client.js'

export function register(email, password) {
  return api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function login(email, password) {
  return api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout(refreshToken) {
  return api('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}
