import api from './index.js'

// 专利/软著相关API
export const piApi = {
  // ==================== 专利相关 ====================
  
  // 获取专利列表
  getPatents(params = {}) {
    return api.get('/pi/patents', { params })
  },

  // 获取单个专利详情
  getPatentDetail(id) {
    return api.get(`/pi/patents/${id}`)
  },

  // 创建专利
  createPatent(patentData) {
    return api.post('/pi/patents', patentData)
  },

  // 更新专利信息
  updatePatent(id, patentData) {
    return api.put(`/pi/patents/${id}`, patentData)
  },

  // 删除专利
  deletePatent(id) {
    return api.delete(`/pi/patents/${id}`)
  },

  // 审核专利
  auditPatent(id, auditData) {
    return api.put(`/pi/patents/${id}/audit`, auditData)
  },

  // 撤回专利（使用更新接口修改状态为草稿）
  withdrawPatent(id) {
    return api.put(`/pi/patents/${id}`, { status: 'draft' })
  },

  // 上传专利文件
  uploadPatentFile(patentId, file, onProgress) {
    const formData = new FormData()
    formData.append('file', file)
    
    return api.post(`/pi/patents/${patentId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onProgress
    })
  },

  // ==================== 软著相关 ====================

  // 获取软著列表
  getCopyrights(params = {}) {
    return api.get('/pi/copyrights', { params })
  },

  // 获取单个软著详情
  getCopyrightDetail(id) {
    return api.get(`/pi/copyrights/${id}`)
  },

  // 创建软著
  createCopyright(copyrightData) {
    return api.post('/pi/copyrights', copyrightData)
  },

  // 更新软著信息
  updateCopyright(id, copyrightData) {
    return api.put(`/pi/copyrights/${id}`, copyrightData)
  },

  // 删除软著
  deleteCopyright(id) {
    return api.delete(`/pi/copyrights/${id}`)
  },

  // 审核软著
  auditCopyright(id, auditData) {
    return api.put(`/pi/copyrights/${id}/audit`, auditData)
  },

  // 撤回软著（使用更新接口修改状态为草稿）
  withdrawCopyright(id) {
    return api.put(`/pi/copyrights/${id}`, { status: 'draft' })
  },

  // 上传软著文件
  uploadCopyrightFile(copyrightId, file, onProgress) {
    const formData = new FormData()
    formData.append('file', file)
    
    return api.post(`/pi/copyrights/${copyrightId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onProgress
    })
  },

  // ==================== 通用接口 ====================

  // 获取我的专利/软著
  getMyItems(params = {}) {
    return api.get('/pi/my', { params })
  },

  // 获取统计数据
  getStatistics(params = {}) {
    return api.get('/pi/stats', { params })
  },

  // ==================== 辅助接口 ====================

  // 获取部门列表 (如果需要的话)
  getDepartments() {
    return api.get('/users/departments')
  },

  // 专利类型选项
  getPatentTypes() {
    return Promise.resolve({
      data: [
        { value: 'invention', label: '发明专利' },
        { value: 'utility_model', label: '实用新型' },
        { value: 'design', label: '外观设计' }
      ]
    })
  },

  // 审核状态选项
  getStatusOptions() {
    return Promise.resolve({
      data: [
        { value: 'draft', label: '草稿', color: '#8c8c8c' },
        { value: 'pending', label: '待审核', color: '#fa8c16' },
        { value: 'approved', label: '已通过', color: '#52c41a' },
        { value: 'rejected', label: '已拒绝', color: '#f5222d' }
      ]
    })
  }
}