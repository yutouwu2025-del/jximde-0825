import api from './index.js'

// 论文相关API
export const papersApi = {
  // 获取我的论文列表
  getMyPapers(params = {}) {
    return api.get('/papers/my', { params })
  },

  // 提交论文
  submitPaper(paperData) {
    return api.post('/papers', paperData)
  },

  // 更新论文信息
  updatePaper(id, paperData) {
    return api.put(`/papers/${id}`, paperData)
  },

  // 删除论文
  deletePaper(id) {
    return api.delete(`/papers/${id}`)
  },

  // 获取论文详情
  getPaperDetail(id) {
    return api.get(`/papers/${id}`)
  },

  // 撤回论文
  withdrawPaper(id) {
    return api.post(`/papers/${id}/withdraw`)
  },

  // 上传论文文件
  uploadPaperFile(paperId, file, onProgress) {
    const formData = new FormData()
    formData.append('file', file)
    
    return api.post(`/papers/${paperId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onProgress
    })
  },

  // 获取待审核论文列表
  getPendingPapers(params = {}) {
    return api.get('/papers/pending', { params })
  },

  // 审核论文
  auditPaper(id, auditData) {
    return api.post(`/papers/${id}/audit`, auditData)
  },

  // 批量审核论文
  batchAuditPapers(paperIds, auditData) {
    return api.post('/papers/batch-audit', {
      paperIds,
      ...auditData
    })
  },

  // 获取已审核论文列表（论文数据库）
  getApprovedPapers(params = {}) {
    return api.get('/papers/approved', { params })
  },

  // 获取论文统计数据
  getPaperStats(params = {}) {
    return api.get('/papers/stats', { params })
  },

  // 导出论文数据
  exportPapers(params = {}) {
    return api.get('/papers/export', {
      params,
      responseType: 'blob'
    })
  },

  // 导入论文数据
  importPapers(file) {
    const formData = new FormData()
    formData.append('file', file)
    
    return api.post('/papers/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}