import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import api from '../api'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')
  const permissions = ref([])

  // 登录（防抖机制避免重复提交）
  let loginPromise = null
  let lastLoginTime = 0
  const login = async (loginForm) => {
    const now = Date.now()
    // 如果距离上次登录请求不足2秒，返回上一个请求的结果
    if (now - lastLoginTime < 2000 && loginPromise) {
      return loginPromise
    }
    
    lastLoginTime = now
    loginPromise = (async () => {
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
      } finally {
        setTimeout(() => {
          loginPromise = null
        }, 2000)
      }
    })()
    
    return loginPromise
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

  // 获取当前用户信息（防抖机制避免429错误）
  let getUserInfoPromise = null
  let lastGetUserTime = 0
  const getCurrentUser = async () => {
    const now = Date.now()
    // 如果距离上次请求不足5秒，返回上一个请求的结果
    if (now - lastGetUserTime < 5000 && getUserInfoPromise) {
      return getUserInfoPromise
    }
    
    lastGetUserTime = now
    getUserInfoPromise = (async () => {
      try {
        const response = await api.get('/auth/me')
        user.value = response.data.data
        permissions.value = response.data.data.permissions || []
        localStorage.setItem('user', JSON.stringify(response.data.data))
        return response.data.data
      } catch (error) {
        getUserInfoPromise = null
        throw error
      }
    })()
    
    return getUserInfoPromise
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

    // 论文管理折叠菜单（根据角色调整子项顺序）
    const paperGroupByRole = {
      'user': {
        name: 'paper-group',
        title: '论文管理',
        icon: 'Collection',
        children: [
          { name: 'submit-paper', title: '论文提交', icon: 'EditPen', path: '/submit-paper' },
          { name: 'my-papers', title: '我的论文', icon: 'Document', path: '/my-papers' },
          { name: 'statistics', title: '论文数据统计', icon: 'PieChart', path: '/statistics' }
        ]
      },
      'manager': {
        name: 'paper-group',
        title: '论文管理',
        icon: 'Collection',
        children: [
          { name: 'submit-paper', title: '论文提交', icon: 'EditPen', path: '/submit-paper' },
          { name: 'my-papers', title: '我的论文', icon: 'Document', path: '/my-papers' },
          { name: 'paper-audit', title: '论文审核', icon: 'Check', path: '/paper-audit' },
          { name: 'paper-database', title: '论文数据库', icon: 'FolderOpened', path: '/paper-database' },
          { name: 'statistics', title: '论文数据统计', icon: 'PieChart', path: '/statistics' }
        ]
      },
      'admin': {
        name: 'paper-group',
        title: '论文管理',
        icon: 'Collection',
        children: [
          { name: 'submit-paper', title: '论文提交', icon: 'EditPen', path: '/submit-paper' },
          { name: 'my-papers', title: '我的论文', icon: 'Document', path: '/my-papers' },
          { name: 'paper-audit', title: '论文审核', icon: 'Check', path: '/paper-audit' },
          { name: 'paper-database', title: '论文数据库', icon: 'FolderOpened', path: '/paper-database' },
          { name: 'statistics', title: '论文数据统计', icon: 'PieChart', path: '/statistics' }
        ]
      }
    }

    // 专利/软著管理折叠菜单（按要求提供5个子栏目）
    const ipGroup = {
      name: 'ip-group',
      title: '专利/软著管理',
      icon: 'Collection',
      children: [
        { name: 'ip-submit', title: '专利/软著提交', icon: 'EditPen', path: '/ip-submit' },
        { name: 'my-ip', title: '我的专利/软著', icon: 'Document', path: '/my-ip' },
        { name: 'ip-audit', title: '专利/软著审核', icon: 'Check', path: '/ip-audit' },
        { name: 'ip-database', title: '专利/软著数据库', icon: 'FolderOpened', path: '/ip-database' },
        { name: 'ip-statistics', title: '专利/软著数据统计', icon: 'PieChart', path: '/ip-statistics' }
      ]
    }

    const extraMenusByRole = {
      'user': [
        { name: 'import-export', title: '数据导入导出', icon: 'Upload', path: '/import-export' }
      ],
      'manager': [
        { name: 'import-export', title: '数据导入导出', icon: 'Upload', path: '/import-export' }
      ],
      'secretary': [
        { name: 'statistics', title: '论文数据统计', icon: 'PieChart', path: '/statistics' },
        { name: 'import-export', title: '数据导入导出', icon: 'Upload', path: '/import-export' }
      ],
      'admin': [
        { name: 'import-export', title: '数据导入导出', icon: 'Upload', path: '/import-export' },
        { name: 'notifications', title: '通知公告', icon: 'Bell', path: '/notifications' },
        { name: 'system-management', title: '系统管理', icon: 'Setting', path: '/system-management' },
        { name: 'system-monitor', title: '系统监控', icon: 'Monitor', path: '/system-monitor' }
      ]
    }

    const role = user.value.role
    const paperGroup = paperGroupByRole[role]
    const extra = extraMenusByRole[role] || []

    // 秘书角色保持原样（未特别指定折叠）
    if (role === 'secretary') {
      return [...baseMenus, ipGroup, ...extra]
    }

    return [...baseMenus, paperGroup, ipGroup, ...extra]
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