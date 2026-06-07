import axios from 'axios'

const api = axios.create({ baseURL: '/' })

// Injecte le token Bearer sur chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Tente un refresh automatique sur 401, puis redirige vers /login
// Ne jamais intercepter les appels vers les endpoints token eux-mêmes
const TOKEN_URLS = ['/api/token/', '/api/token/refresh/']

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const isTokenEndpoint = TOKEN_URLS.some(u => original.url?.includes(u))
    if (error.response?.status === 401 && !original._retry && !isTokenEndpoint) {
      original._retry = true
      const refresh = localStorage.getItem('refresh')
      if (!refresh) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }
      try {
        const { data } = await axios.post('/api/token/refresh/', { refresh })
        localStorage.setItem('access', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export default api
