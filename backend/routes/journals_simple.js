const express = require('express');
const axios = require('axios');

const router = express.Router();

// 中科院期刊分区API配置
const journalApiConfig = {
  baseUrl: process.env.JOURNAL_API_BASE_URL || 'https://webapi.fenqubiao.com',
  user: process.env.JOURNAL_API_USER || 'imdeJCRfq',
  password: process.env.JOURNAL_API_PASSWORD || 'imde2012',
  currentYear: process.env.JOURNAL_API_CURRENT_YEAR || '2023'
};

// 创建axios实例
const journalApi = axios.create({
  baseURL: journalApiConfig.baseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Research Paper Management System'
  }
});

// 获取分区显示文本
function getPartitionDisplay(section) {
  if (!section) return '未分区';
  switch(section) {
    case 1: return 'Q1';
    case 2: return 'Q2';
    case 3: return 'Q3';
    case 4: return 'Q4';
    default: return '未分区';
  }
}

// 获取分区级别
function getPartitionLevel(section) {
  if (!section) return 'Unknown';
  switch(section) {
    case 1: return 'Q1';
    case 2: return 'Q2';
    case 3: return 'Q3';
    case 4: return 'Q4';
    default: return 'Unknown';
  }
}

// 简单缓存机制避免重复API调用
const detailsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 获取期刊详细信息
async function getJournalDetails(issn, year = '2023') {
  const cacheKey = `${issn}-${year}`;
  const cached = detailsCache.get(cacheKey);
  
  // 检查缓存
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    const response = await journalApi.get('/api/v2/user/get', {
      params: {
        year,
        keyword: issn,
        user: journalApiConfig.user,
        password: journalApiConfig.password
      },
      timeout: 8000 // 单个请求8秒超时
    });
    
    // 缓存结果
    detailsCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
    
    return response.data;
  } catch (error) {
    console.error(`获取期刊详情失败 (${issn}):`, error.message);
    return null;
  }
}

// 获取模拟数据
function getMockJournalData(keyword) {
  const mockJournals = [
    {
      id: 'nature-001',
      name: 'Nature',
      issn: '0028-0836',
      eissn: '1476-4687',
      publisher: 'Nature Publishing Group',
      subjectCategories: 'Multidisciplinary Sciences',
      partition2023: 'Q1',
      impactFactor: '64.8',
      partitionInfo: 'Q1',
      partitionLevel: 'Q1'
    },
    {
      id: 'science-001',
      name: 'Science',
      issn: '0036-8075',
      eissn: '1095-9203',
      publisher: 'American Association for the Advancement of Science',
      subjectCategories: 'Multidisciplinary Sciences',
      partition2023: 'Q1',
      impactFactor: '56.9',
      partitionInfo: 'Q1',
      partitionLevel: 'Q1'
    },
    {
      id: 'cell-001',
      name: 'Cell',
      issn: '0092-8674',
      eissn: '1097-4172',
      publisher: 'Elsevier',
      subjectCategories: 'Cell Biology',
      partition2023: 'Q1',
      impactFactor: '64.5',
      partitionInfo: 'Q1',
      partitionLevel: 'Q1'
    }
  ].filter(journal => 
    journal.name.toLowerCase().includes(keyword.toLowerCase()) ||
    journal.issn.includes(keyword)
  );

  return {
    data: mockJournals,
    pagination: {
      page: 1,
      pageSize: 20,
      total: mockJournals.length,
      totalPages: 1
    }
  };
}

// 期刊搜索（简化版）
router.get('/search', async (req, res) => {
  const { 
    keyword = '', 
    year = journalApiConfig.currentYear,
    page = 1,
    pageSize = 20 
  } = req.query;
  
  if (!keyword || keyword.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: '搜索关键词至少需要2个字符',
      code: 400
    });
  }
  
  try {
    // 调用中科院API - 增加超时控制
    const response = await journalApi.get('/api/v2/user/search', {
      params: {
        year,
        keyword: keyword.trim(),
        user: journalApiConfig.user,
        password: journalApiConfig.password,
        page,
        size: pageSize
      },
      timeout: 15000 // 搜索请求15秒超时
    });
    
    // 检查响应格式
    let journals = [];
    if (response.data && Array.isArray(response.data)) {
      journals = response.data;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      journals = response.data.data;
    } else if (response.data && response.data.success && Array.isArray(response.data.result)) {
      journals = response.data.result;
    }
    
    if (journals.length > 0) {
      // 处理数据格式 - 优化性能，限制处理数量和API调用频率
      const processedJournals = [];
      const maxResults = Math.min(journals.length, 20); // 最多处理20个结果
      
      for (let i = 0; i < maxResults; i++) {
        const journal = journals[i];
        const issn = journal.ISSN || journal.issn;
        let detailInfo = null;
        
        // 只为前3个或完全匹配的期刊获取详细信息，减少API调用
        if ((i < 3 || journal.Match) && issn) {
          try {
            detailInfo = await getJournalDetails(issn, year);
            // 增加延迟避免API频率限制，特别是多次搜索时
            if (i < maxResults - 1) {
              await new Promise(resolve => setTimeout(resolve, 200)); // 增加到200ms延迟
            }
          } catch (error) {
            console.error(`获取期刊详情失败 (${issn}):`, error.message);
            // API调用失败时跳过，不影响后续处理
          }
        }
        
        // 从详细信息中提取分区信息
        let section = null;
        let subjectCategories = '';
        if (detailInfo && detailInfo.JCR && detailInfo.JCR.length > 0) {
          section = detailInfo.JCR[0].Section;
          subjectCategories = detailInfo.JCR.map(jcr => jcr.NameCN || jcr.Name).join(', ');
        } else if (detailInfo && detailInfo.ZKY && detailInfo.ZKY.length > 0) {
          section = detailInfo.ZKY[0].Section;
          subjectCategories = detailInfo.ZKY.map(zky => zky.Name).join(', ');
        }

        processedJournals.push({
          id: journal.id || journal.journal_id || `journal_${Math.random().toString(36).substr(2, 9)}`,
          name: journal.Title || journal.name || journal.journal_name,
          abbrevTitle: journal.AbbrTitle || journal.abbr_title,
          issn: issn,
          eissn: journal.eISSN || journal.eissn,
          year: journal.Year || journal.year,
          publisher: journal.publisher || journal.Publisher,
          subjectCategories: subjectCategories,
          section: section,
          review: journal.Review,
          match: journal.Match,
          partitionInfo: getPartitionDisplay(section),
          partitionLevel: getPartitionLevel(section),
          hasDetailInfo: !!detailInfo
        });
      }
      
      res.json({
        success: true,
        data: processedJournals,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: processedJournals.length,
          totalPages: Math.ceil(processedJournals.length / pageSize)
        }
      });
    } else {
      // 返回模拟数据
      const mockData = getMockJournalData(keyword);
      res.json({
        success: true,
        data: mockData.data,
        pagination: mockData.pagination,
        mock: true,
        message: 'API返回为空，使用模拟数据'
      });
    }
    
  } catch (error) {
    console.error('期刊搜索失败:', error.message);
    console.error('错误详情:', error);
    
    // 返回模拟数据
    const mockData = getMockJournalData(keyword);
    res.json({
      success: true,
      data: mockData.data,
      pagination: mockData.pagination,
      mock: true,
      message: '网络连接问题，返回模拟数据'
    });
  }
});

module.exports = router;