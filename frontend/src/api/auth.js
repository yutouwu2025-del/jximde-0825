import api from './index.js'

// 用户认证相关API
export const authApi = {
  // 用户登录
  login(credentials) {
    return api.post('/auth/login', credentials)
  },

  // 用户登出
  logout() {
    return api.post('/auth/logout')
  },

  // 获取当前用户信息
  getCurrentUser() {
    return api.get('/auth/me')
  },

  // 修改密码
  changePassword(passwordData) {
    return api.post('/auth/change-password', passwordData)
  },

  // 刷新token
  refreshToken() {
    return api.post('/auth/refresh')
  }
}