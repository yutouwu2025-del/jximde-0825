import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import api from '../api'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')
  const permissions = ref([])

  // 登录
  const login = async (loginForm) => {
    try {
      const response = await api.post('/auth/login', loginForm)
      const { token: newToken, user: userData } = response.data.data
      
      token.value = newToken
      user.value = userData
      permissions.value = userData.permissions || []
      
      localStorage.setItem('token', newToken)
      localStorage.setItem('user', JSON.stringify(userData))
      
      return { success: true, data: userData }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '登录失败' }
    }
  }

  // 登出
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('登出接口调用失败:', error)
    } finally {
      token.value = ''
      user.value = null
      permissions.value = []
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  // 获取当前用户信息
  const getCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me')
      user.value = response.data.data
      permissions.value = response.data.data.permissions || []
      localStorage.setItem('user', JSON.stringify(response.data.data))
      return response.data.data
    } catch (error) {
      throw error
    }
  }

  // 检查权限
  const hasPermission = (permission) => {
    if (!user.value) return false
    
    // 系统管理员拥有所有权限
    if (user.value.role === 'admin') return true
    
    return permissions.value.includes(permission)
  }

  // 根据角色获取菜单
  const getMenuItems = () => {
    if (!user.value) return []
    
    const baseMenus = [
      {
        name: 'dashboard',
        title: '工作台',
        icon: 'House',
        path: '/dashboard'
      }
    ]

    const roleMenus = {
      'user': [
        { name: 'submit-paper', title: '论文提交', icon: 'EditPen', path: '/submit-paper' },
        { name: 'my-papers', title: '我的论文', icon: 'Document', path: '/my-papers' },
        { name: 'statistics', title: '数据统计', icon: 'PieChart', path: '/statistics' },
        { name: 'import-export', title: '数据导入导出', icon: 'Upload', path: '/import-export' }
      ],
      'manager': [
        { name: 'paper-audit', title: '论文审核', icon: 'Check', path: '/paper-audit' },
        { name: 'paper-database', title: '论文数据库', icon: 'FolderOpened', path: '/paper-database' },
        { name: 'submit-paper', title: '论文提交', icon: 'EditPen', path: '/submit-paper' },
        { name: 'my-papers', title: '我的论文', icon: 'Document', path: '/my-papers' },
        { name: 'statistics', title: '数据统计', icon: 'PieChart', path: '/statistics' },
        { name: 'import-export', title: '数据导入导出', icon: 'Upload', path: '/import-export' }
      ],
      'secretary': [
        { name: 'statistics', title: '数据统计', icon: 'PieChart', path: '/statistics' },
        { name: 'import-export', title: '数据导入导出', icon: 'Upload', path: '/import-export' }
      ],
      'admin': [
        { name: 'paper-audit', title: '论文审核', icon: 'Check', path: '/paper-audit' },
        { name: 'paper-database', title: '论文数据库', icon: 'FolderOpened', path: '/paper-database' },
        { name: 'submit-paper', title: '论文提交', icon: 'EditPen', path: '/submit-paper' },
        { name: 'my-papers', title: '我的论文', icon: 'Document', path: '/my-papers' },
        { name: 'statistics', title: '数据统计', icon: 'PieChart', path: '/statistics' },
        { name: 'import-export', title: '数据导入导出', icon: 'Upload', path: '/import-export' },
        { name: 'notifications', title: '通知公告', icon: 'Bell', path: '/notifications' },
        { name: 'system-management', title: '系统管理', icon: 'Setting', path: '/system-management' }
      ]
    }

    return [...baseMenus, ...(roleMenus[user.value.role] || [])]
  }

  return {
    user: readonly(user),
    token: readonly(token),
    permissions: readonly(permissions),
    login,
    logout,
    getCurrentUser,
    hasPermission,
    getMenuItems
  }
})