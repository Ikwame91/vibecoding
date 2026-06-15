import { auth } from '../stores/auth.js'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function refreshAccessToken() {
  const res = await fetch('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: auth.refreshToken }),
  })
  if (!res.ok) throw new ApiError('Session expired', 401)
  const data = await res.json()
  auth.login(data.accessToken, data.refreshToken)
  return data.accessToken
}

export async function api(path, options = {}) {
  const headers = options.headers || {}

  if (auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  let res = await fetch(path, { ...options, headers })

  if (res.status === 401 && auth.refreshToken) {
    try {
      const newToken = await refreshAccessToken()
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(path, { ...options, headers })
    } catch {
      auth.logout()
      window.location.href = '/login'
      throw new ApiError('Session expired', 401)
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error || res.statusText, res.status)
  }

  if (res.status === 204) return null
  return res.json()
}
