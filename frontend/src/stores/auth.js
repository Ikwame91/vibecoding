import { reactive } from 'vue'

const storedToken = localStorage.getItem('accessToken')
const storedRefresh = localStorage.getItem('refreshToken')

export const auth = reactive({
  token: storedToken || null,
  refreshToken: storedRefresh || null,

  get isAuthenticated() {
    return !!this.token
  },

  login(accessToken, refreshToken) {
    this.token = accessToken
    this.refreshToken = refreshToken
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  },

  logout() {
    this.token = null
    this.refreshToken = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },
})
