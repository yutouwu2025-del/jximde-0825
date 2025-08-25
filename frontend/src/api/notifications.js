import api from './index.js'

// 通知公告相关API
export const notificationsApi = {
  // 获取通知公告列表
  getNotifications(params = {}) {
    return api.get('/notifications', { params })
  },

  // 创建通知公告
  createNotification(notificationData) {
    return api.post('/notifications', notificationData)
  },

  // 更新通知公告
  updateNotification(id, notificationData) {
    return api.put(`/notifications/${id}`, notificationData)
  },

  // 删除通知公告
  deleteNotification(id) {
    return api.delete(`/notifications/${id}`)
  },

  // 获取通知详情
  getNotificationDetail(id) {
    return api.get(`/notifications/${id}`)
  },

  // 发布/撤回通知
  toggleNotificationStatus(id, status) {
    return api.post(`/notifications/${id}/toggle`, { status })
  },

  // 获取未读通知数量
  getUnreadCount() {
    return api.get('/notifications/unread/count')
  },

  // 标记通知为已读
  markAsRead(id) {
    return api.post(`/notifications/${id}/read`)
  },

  // 批量标记为已读
  batchMarkAsRead(notificationIds) {
    return api.post('/notifications/batch-read', { notificationIds })
  },

  // 获取用户的通知记录
  getUserNotifications(params = {}) {
    return api.get('/notifications/user', { params })
  }
}