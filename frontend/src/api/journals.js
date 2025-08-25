import api from './index.js'

// 期刊相关API
export const journalsApi = {
  // 搜索期刊
  searchJournals(params) {
    const { year = '2023', keyword, page = 1, pageSize = 20 } = params
    
    // 通过后端代理调用中科院期刊分区表API
    return api.get('/journals/search', {
      params: {
        year,
        keyword,
        page,
        pageSize
      }
    })
  },

  // 获取期刊分区信息
  getJournalInfo(params) {
    const { year = '2023', keyword } = params
    
    // 通过后端代理调用中科院期刊分区表API
    return api.get('/journals/info', {
      params: {
        year,
        keyword
      }
    })
  },

  // 获取本地缓存的期刊列表
  getLocalJournals(params = {}) {
    return api.get('/journals', { params })
  },

  // 添加期刊到本地缓存
  addJournalToCache(journalData) {
    return api.post('/journals', journalData)
  },

  // 更新本地期刊信息
  updateLocalJournal(id, journalData) {
    return api.put(`/journals/${id}`, journalData)
  },

  // 删除本地期刊缓存
  deleteLocalJournal(id) {
    return api.delete(`/journals/${id}`)
  },

  // 同步期刊分区数据
  syncJournalData(year = '2023') {
    return api.post('/journals/sync', { year })
  }
}