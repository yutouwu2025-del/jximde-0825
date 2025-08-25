import api from './index.js'

// 用户管理相关API
export const usersApi = {
  // 获取用户列表
  getUsers(params = {}) {
    return api.get('/users', { params })
  },

  // 创建用户
  createUser(userData) {
    return api.post('/users', userData)
  },

  // 更新用户信息
  updateUser(id, userData) {
    return api.put(`/users/${id}`, userData)
  },

  // 删除用户
  deleteUser(id) {
    return api.delete(`/users/${id}`)
  },

  // 获取用户详情
  getUserDetail(id) {
    return api.get(`/users/${id}`)
  },

  // 重置用户密码
  resetUserPassword(id, newPassword) {
    return api.post(`/users/${id}/reset-password`, { password: newPassword })
  },

  // 启用/禁用用户
  toggleUserStatus(id, status) {
    return api.post(`/users/${id}/toggle-status`, { status })
  },

  // 批量操作用户
  batchOperateUsers(userIds, operation) {
    return api.post('/users/batch', {
      userIds,
      operation
    })
  },

  // 获取角色列表
  getRoles() {
    return api.get('/users/roles')
  },

  // 获取部门列表
  getDepartments() {
    return api.get('/users/departments')
  },

  // 创建部门
  createDepartment(departmentData) {
    return api.post('/users/departments', departmentData)
  },

  // 更新部门
  updateDepartment(id, departmentData) {
    return api.put(`/users/departments/${id}`, departmentData)
  },

  // 删除部门
  deleteDepartment(id) {
    return api.delete(`/users/departments/${id}`)
  }
}