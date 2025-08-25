const express = require('express');
const axios = require('axios');
const { executeQuery, executeTransaction, cache } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { performanceLogger } = require('../middleware/logger');

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

// 期刊搜索
router.get('/search', catchAsync(async (req, res) => {
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
  
  const startTime = Date.now();
  const cacheKey = `journal_search_${keyword}_${year}_${page}_${pageSize}`;
  
  try {
    // 暂时禁用缓存查询，避免数据库问题
    // let cachedResult = await cache.get(cacheKey);
    // if (cachedResult) {
    //   performanceLogger('JOURNAL_SEARCH_CACHE_HIT', Date.now() - startTime, { keyword, year });
    //   return res.json({
    //     success: true,
    //     data: cachedResult,
    //     cached: true
    //   });
    // }
    
    // 调用中科院API
    const response = await journalApi.get('/api/v2/user/search', {
      params: {
        year,
        keyword: keyword.trim(),
        user: journalApiConfig.user,
        password: journalApiConfig.password,
        page,
        size: pageSize
      }
    });
    
    if (response.data && response.data.success) {
      const journals = response.data.data || [];
      
      // 处理数据格式
      const processedJournals = journals.map(journal => ({
        id: journal.id || journal.journal_id,
        name: journal.name || journal.journal_name,
        issn: journal.issn,
        eissn: journal.eissn,
        publisher: journal.publisher,
        subjectCategories: journal.subject_categories || journal.categories,
        partition2023: journal.partition_2023 || journal['2023'],
        partition2022: journal.partition_2022 || journal['2022'],
        partition2021: journal.partition_2021 || journal['2021'],
        impactFactor: journal.impact_factor || journal.if_2022,
        partitionInfo: getPartitionDisplay(journal.partition_2023 || journal['2023']),
        partitionLevel: getPartitionLevel(journal.partition_2023 || journal['2023'])
      }));
      
      // 暂时跳过数据库保存，避免参数问题
      // saveJournalsToDatabase(processedJournals).catch(error => {
      //   console.error('保存期刊数据失败:', error);
      // });
      
      const result = {
        journals: processedJournals,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: response.data.total || processedJournals.length,
          totalPages: Math.ceil((response.data.total || processedJournals.length) / pageSize)
        }
      };
      
      // 暂时禁用缓存保存
      // await cache.set(cacheKey, result, 3600);
      
      performanceLogger('JOURNAL_SEARCH_API_SUCCESS', Date.now() - startTime, { 
        keyword, 
        year, 
        resultCount: processedJournals.length 
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } else {
      throw new Error('API返回数据格式错误');
    }
    
  } catch (error) {
    console.error('期刊API调用失败:', error.message);
    
    // API失败时从本地数据库查询
    const localResults = await searchLocalJournals(keyword, page, pageSize);
    
    performanceLogger('JOURNAL_SEARCH_FALLBACK', Date.now() - startTime, { 
      keyword, 
      resultCount: localResults.journals.length 
    });
    
    res.json({
      success: true,
      data: localResults,
      message: '期刊API暂时不可用，显示本地缓存数据',
      fallback: true
    });
  }
}));

// 获取期刊详情
router.get('/:id', catchAsync(async (req, res) => {
  const { id } = req.params;
  const year = req.query.year || journalApiConfig.currentYear;
  
  const cacheKey = `journal_detail_${id}_${year}`;
  
  try {
    // 尝试从缓存获取
    let cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }
    
    // 先从本地数据库查询
    const localJournals = await executeQuery(
      'SELECT * FROM journals WHERE journal_id = ?',
      [id]
    );
    
    if (localJournals.length > 0) {
      const journal = localJournals[0];
      const result = {
        id: journal.journal_id,
        name: journal.name,
        issn: journal.issn,
        eissn: journal.eissn,
        publisher: journal.publisher,
        subjectCategories: journal.subject_categories,
        partition2023: journal.partition_2023,
        partition2022: journal.partition_2022,
        partition2021: journal.partition_2021,
        impactFactor: journal.impact_factor,
        partitionInfo: getPartitionDisplay(journal.partition_2023),
        partitionLevel: getPartitionLevel(journal.partition_2023)
      };
      
      await cache.set(cacheKey, result, 1800); // 缓存30分钟
      
      return res.json({
        success: true,
        data: result
      });
    }
    
    // 本地没有则调用API
    const response = await journalApi.get('/api/v2/user/detail', {
      params: {
        id,
        year,
        user: journalApiConfig.user,
        password: journalApiConfig.password
      }
    });
    
    if (response.data && response.data.success && response.data.data) {
      const journal = response.data.data;
      const result = {
        id: journal.id || journal.journal_id,
        name: journal.name || journal.journal_name,
        issn: journal.issn,
        eissn: journal.eissn,
        publisher: journal.publisher,
        subjectCategories: journal.subject_categories || journal.categories,
        partition2023: journal.partition_2023 || journal['2023'],
        partition2022: journal.partition_2022 || journal['2022'],
        partition2021: journal.partition_2021 || journal['2021'],
        impactFactor: journal.impact_factor || journal.if_2022,
        partitionInfo: getPartitionDisplay(journal.partition_2023 || journal['2023']),
        partitionLevel: getPartitionLevel(journal.partition_2023 || journal['2023'])
      };
      
      // 保存到本地数据库
      await saveJournalToDatabase(result);
      
      // 缓存结果
      await cache.set(cacheKey, result, 1800);
      
      res.json({
        success: true,
        data: result
      });
    } else {
      throw new AppError('期刊不存在', 404);
    }
    
  } catch (error) {
    console.error('获取期刊详情失败:', error.message);
    
    if (error.response && error.response.status === 404) {
      throw new AppError('期刊不存在', 404);
    }
    
    throw new AppError('获取期刊详情失败', 500);
  }
}));

// 获取可用年份列表
router.get('/years/available', catchAsync(async (req, res) => {
  const availableYears = ['2019', '2020', '2021', '2022', '2023'];
  
  res.json({
    success: true,
    data: {
      years: availableYears,
      current: journalApiConfig.currentYear
    }
  });
}));

// 获取学科分类列表
router.get('/categories/list', catchAsync(async (req, res) => {
  const cacheKey = 'journal_categories';
  
  try {
    let categories = await cache.get(cacheKey);
    
    if (!categories) {
      // 从本地数据库获取去重的学科分类
      const results = await executeQuery(`
        SELECT DISTINCT subject_categories 
        FROM journals 
        WHERE subject_categories IS NOT NULL 
        AND subject_categories != ''
      `);
      
      const categorySet = new Set();
      results.forEach(row => {
        if (row.subject_categories) {
          const cats = row.subject_categories.split(',').map(c => c.trim());
          cats.forEach(cat => categorySet.add(cat));
        }
      });
      
      categories = Array.from(categorySet).sort();
      await cache.set(cacheKey, categories, 7200); // 缓存2小时
    }
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('获取学科分类失败:', error);
    res.json({
      success: true,
      data: []
    });
  }
}));

// 本地期刊搜索（API失败时的后备方案）
async function searchLocalJournals(keyword, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const keywordPattern = `%${keyword}%`;
  
  const [countResult, journals] = await Promise.all([
    executeQuery(`
      SELECT COUNT(*) as total 
      FROM journals 
      WHERE name LIKE ? OR publisher LIKE ? OR subject_categories LIKE ?
    `, [keywordPattern, keywordPattern, keywordPattern]),
    
    executeQuery(`
      SELECT * FROM journals 
      WHERE name LIKE ? OR publisher LIKE ? OR subject_categories LIKE ?
      ORDER BY name
      LIMIT ? OFFSET ?
    `, [keywordPattern, keywordPattern, keywordPattern, parseInt(pageSize), offset])
  ]);
  
  const total = countResult[0].total;
  
  const processedJournals = journals.map(journal => ({
    id: journal.journal_id,
    name: journal.name,
    issn: journal.issn,
    eissn: journal.eissn,
    publisher: journal.publisher,
    subjectCategories: journal.subject_categories,
    partition2023: journal.partition_2023,
    partition2022: journal.partition_2022,
    partition2021: journal.partition_2021,
    impactFactor: journal.impact_factor,
    partitionInfo: getPartitionDisplay(journal.partition_2023),
    partitionLevel: getPartitionLevel(journal.partition_2023)
  }));
  
  return {
    journals: processedJournals,
    pagination: {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

// 保存期刊数据到本地数据库
async function saveJournalsToDatabase(journals) {
  if (!journals || journals.length === 0) return;
  
  const queries = journals.map(journal => ({
    sql: `
      INSERT INTO journals (
        journal_id, name, issn, eissn, publisher, subject_categories,
        partition_2023, partition_2022, partition_2021, impact_factor,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        issn = VALUES(issn),
        eissn = VALUES(eissn),
        publisher = VALUES(publisher),
        subject_categories = VALUES(subject_categories),
        partition_2023 = VALUES(partition_2023),
        partition_2022 = VALUES(partition_2022),
        partition_2021 = VALUES(partition_2021),
        impact_factor = VALUES(impact_factor),
        updated_at = NOW()
    `,
    params: [
      String(journal.id || ''),
      String(journal.name || ''),
      journal.issn ? String(journal.issn) : null,
      journal.eissn ? String(journal.eissn) : null,
      journal.publisher ? String(journal.publisher) : null,
      journal.subjectCategories ? String(journal.subjectCategories) : null,
      journal.partition2023 ? String(journal.partition2023) : null,
      journal.partition2022 ? String(journal.partition2022) : null,
      journal.partition2021 ? String(journal.partition2021) : null,
      journal.impactFactor ? String(journal.impactFactor) : null
    ]
  }));
  
  try {
    await executeTransaction(queries);
  } catch (error) {
    console.error('批量保存期刊数据失败:', error);
  }
}

// 保存单个期刊到数据库
async function saveJournalToDatabase(journal) {
  try {
    await executeQuery(`
      INSERT INTO journals (
        journal_id, name, issn, eissn, publisher, subject_categories,
        partition_2023, partition_2022, partition_2021, impact_factor,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        issn = VALUES(issn),
        eissn = VALUES(eissn),
        publisher = VALUES(publisher),
        subject_categories = VALUES(subject_categories),
        partition_2023 = VALUES(partition_2023),
        partition_2022 = VALUES(partition_2022),
        partition_2021 = VALUES(partition_2021),
        impact_factor = VALUES(impact_factor),
        updated_at = NOW()
    `, [
      journal.id,
      journal.name,
      journal.issn || null,
      journal.eissn || null,
      journal.publisher || null,
      journal.subjectCategories || null,
      journal.partition2023 || null,
      journal.partition2022 || null,
      journal.partition2021 || null,
      journal.impactFactor || null
    ]);
  } catch (error) {
    console.error('保存期刊数据失败:', error);
  }
}

// 获取分区显示文本
function getPartitionDisplay(partition) {
  if (!partition) return '未分区';
  
  // 处理可能的分区格式
  if (typeof partition === 'object') {
    return partition.partition || '未分区';
  }
  
  return partition.toString();
}

// 获取分区等级（用于排序和筛选）
function getPartitionLevel(partition) {
  const partitionStr = getPartitionDisplay(partition).toLowerCase();
  
  if (partitionStr.includes('q1')) return 1;
  if (partitionStr.includes('q2')) return 2;
  if (partitionStr.includes('q3')) return 3;
  if (partitionStr.includes('q4')) return 4;
  
  return 5; // 未分区
}

module.exports = router;