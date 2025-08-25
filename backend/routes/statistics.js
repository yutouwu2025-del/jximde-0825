const express = require('express');
const { executeQuery, cache } = require('../config/database');
const { checkPermission } = require('../middleware/auth');
const { validateStatisticsQuery } = require('../middleware/validator');
const { catchAsync } = require('../middleware/errorHandler');
const { performanceLogger } = require('../middleware/logger');

const router = express.Router();

// 获取概览统计数据
router.get('/overview', 
  checkPermission('statistics', 'read'),
  catchAsync(async (req, res) => {
    const { year, department_id } = req.query;
    const startTime = Date.now();
    
    // 构建缓存键
    const cacheKey = `stats_overview_${req.user.id}_${year || 'all'}_${department_id || 'all'}`;
    
    // 尝试从缓存获取
    let cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    
    // 权限过滤
    if (req.user.role === 'user') {
      whereConditions.push('p.user_id = ?');
      queryParams.push(req.user.id);
    } else if (req.user.role === 'secretary' && req.user.departmentId) {
      whereConditions.push('u.department_id = ?');
      queryParams.push(req.user.departmentId);
    }
    
    if (year) {
      whereConditions.push('p.publish_year = ?');
      queryParams.push(year);
    }
    
    if (department_id) {
      whereConditions.push('u.department_id = ?');
      queryParams.push(department_id);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // 并行执行多个统计查询
    const [
      totalStats,
      statusStats,
      typeStats,
      partitionStats,
      topUsers,
      recentPapers
    ] = await Promise.all([
      // 总体统计
      executeQuery(`
        SELECT 
          COUNT(*) as total_papers,
          COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_papers,
          COUNT(DISTINCT p.user_id) as total_users,
          AVG(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) as approval_rate
        FROM papers p
        LEFT JOIN users u ON p.user_id = u.id
        ${whereClause}
      `, queryParams),
      
      // 按状态统计
      executeQuery(`
        SELECT 
          p.status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM papers p2 
            LEFT JOIN users u2 ON p2.user_id = u2.id ${whereClause.replace(/p\./g, 'p2.').replace(/u\./g, 'u2.')}), 2) as percentage
        FROM papers p
        LEFT JOIN users u ON p.user_id = u.id
        ${whereClause}
        GROUP BY p.status
      `, queryParams),
      
      // 按类型统计
      executeQuery(`
        SELECT 
          p.type,
          COUNT(*) as count,
          COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_count
        FROM papers p
        LEFT JOIN users u ON p.user_id = u.id
        ${whereClause}
        GROUP BY p.type
      `, queryParams),
      
      // 按分区统计
      executeQuery(`
        SELECT 
          CASE 
            WHEN p.partition_info LIKE '%Q1%' THEN 'Q1'
            WHEN p.partition_info LIKE '%Q2%' THEN 'Q2'
            WHEN p.partition_info LIKE '%Q3%' THEN 'Q3'
            WHEN p.partition_info LIKE '%Q4%' THEN 'Q4'
            ELSE '未分区'
          END as \`partition\`,
          COUNT(*) as count
        FROM papers p
        LEFT JOIN users u ON p.user_id = u.id
        ${whereClause} AND p.status = 'approved'
        GROUP BY \`partition\`
        ORDER BY \`partition\`
      `, queryParams),
      
      // 高产用户排行
      executeQuery(`
        SELECT 
          u.id, u.name, u.username,
          d.name as department_name,
          COUNT(p.id) as total_papers,
          COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_papers
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN papers p ON u.id = p.user_id ${year ? 'AND p.publish_year = ?' : ''}
        ${req.user.role === 'secretary' && req.user.departmentId ? 'WHERE u.department_id = ?' : ''}
        GROUP BY u.id, u.name, u.username, d.name
        HAVING total_papers > 0
        ORDER BY approved_papers DESC, total_papers DESC
        LIMIT 10
      `, req.user.role === 'secretary' && req.user.departmentId 
         ? (year ? [year, req.user.departmentId] : [req.user.departmentId])
         : (year ? [year] : [])),
      
      // 最近论文
      executeQuery(`
        SELECT 
          p.id, p.title, p.status, p.type, p.created_at,
          u.name as user_name,
          d.name as department_name
        FROM papers p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT 10
      `, queryParams)
    ]);
    
    const overview = {
      total: totalStats[0] || {
        total_papers: 0,
        approved_papers: 0,
        total_users: 0,
        approval_rate: 0
      },
      byStatus: statusStats.map(item => ({
        status: item.status,
        count: item.count,
        percentage: parseFloat(item.percentage || 0)
      })),
      byType: typeStats.map(item => ({
        type: item.type,
        count: item.count,
        approvedCount: item.approved_count
      })),
      byPartition: partitionStats.map(item => ({
        partition: item.partition,
        count: item.count
      })),
      topUsers: topUsers.map(item => ({
        id: item.id,
        name: item.name,
        username: item.username,
        departmentName: item.department_name,
        totalPapers: item.total_papers,
        approvedPapers: item.approved_papers
      })),
      recentPapers: recentPapers.map(item => ({
        id: item.id,
        title: item.title,
        status: item.status,
        type: item.type,
        createdAt: item.created_at,
        userName: item.user_name,
        departmentName: item.department_name
      }))
    };
    
    // 缓存结果（缓存30分钟）
    await cache.set(cacheKey, overview, 1800);
    
    performanceLogger('STATISTICS_OVERVIEW', Date.now() - startTime);
    
    res.json({
      success: true,
      data: overview
    });
  })
);

// 获取趋势数据
router.get('/trends', 
  validateStatisticsQuery,
  checkPermission('statistics', 'read'),
  catchAsync(async (req, res) => {
    const { 
      startDate, 
      endDate, 
      dimension = 'month',
      department_id 
    } = req.query;
    
    const startTime = Date.now();
    
    // 根据维度确定日期格式
    let dateFormat, groupBy;
    switch (dimension) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        groupBy = 'DATE(p.created_at)';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        groupBy = 'DATE_FORMAT(p.created_at, "%Y-%m")';
        break;
      case 'year':
        dateFormat = '%Y';
        groupBy = 'YEAR(p.created_at)';
        break;
      default:
        dateFormat = '%Y-%m';
        groupBy = 'DATE_FORMAT(p.created_at, "%Y-%m")';
    }
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    
    // 权限过滤
    if (req.user.role === 'user') {
      whereConditions.push('p.user_id = ?');
      queryParams.push(req.user.id);
    } else if (req.user.role === 'secretary' && req.user.departmentId) {
      whereConditions.push('u.department_id = ?');
      queryParams.push(req.user.departmentId);
    }
    
    if (startDate) {
      whereConditions.push('p.created_at >= ?');
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('p.created_at <= ?');
      queryParams.push(endDate);
    }
    
    if (department_id) {
      whereConditions.push('u.department_id = ?');
      queryParams.push(department_id);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    const trends = await executeQuery(`
      SELECT 
        DATE_FORMAT(p.created_at, '${dateFormat}') as period,
        COUNT(*) as total_papers,
        COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_papers,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_papers,
        COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as rejected_papers,
        COUNT(CASE WHEN p.partition_info LIKE '%Q1%' AND p.status = 'approved' THEN 1 END) as q1_papers,
        COUNT(CASE WHEN p.partition_info LIKE '%Q2%' AND p.status = 'approved' THEN 1 END) as q2_papers
      FROM papers p
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY period
    `, queryParams);
    
    performanceLogger('STATISTICS_TRENDS', Date.now() - startTime, { 
      dimension, 
      resultCount: trends.length 
    });
    
    res.json({
      success: true,
      data: {
        trends: trends.map(item => ({
          period: item.period,
          totalPapers: item.total_papers,
          approvedPapers: item.approved_papers,
          pendingPapers: item.pending_papers,
          rejectedPapers: item.rejected_papers,
          q1Papers: item.q1_papers,
          q2Papers: item.q2_papers
        }))
      }
    });
  })
);

// 按部门统计
router.get('/by-department', 
  checkPermission('statistics', 'read'),
  catchAsync(async (req, res) => {
    const { year } = req.query;
    const startTime = Date.now();
    
    let whereCondition = '';
    let queryParams = [];
    
    if (year) {
      whereCondition = 'WHERE p.publish_year = ?';
      queryParams.push(year);
    }
    
    const departmentStats = await executeQuery(`
      SELECT 
        d.id as department_id,
        d.name as department_name,
        COUNT(p.id) as total_papers,
        COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_papers,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_papers,
        COUNT(CASE WHEN p.partition_info LIKE '%Q1%' AND p.status = 'approved' THEN 1 END) as q1_papers,
        COUNT(CASE WHEN p.partition_info LIKE '%Q2%' AND p.status = 'approved' THEN 1 END) as q2_papers,
        COUNT(DISTINCT p.user_id) as active_users,
        COUNT(DISTINCT u.id) as total_users
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id
      LEFT JOIN papers p ON u.id = p.user_id ${whereCondition}
      GROUP BY d.id, d.name
      ORDER BY approved_papers DESC
    `, queryParams);
    
    performanceLogger('STATISTICS_BY_DEPARTMENT', Date.now() - startTime);
    
    res.json({
      success: true,
      data: departmentStats.map(item => ({
        departmentId: item.department_id,
        departmentName: item.department_name,
        totalPapers: item.total_papers,
        approvedPapers: item.approved_papers,
        pendingPapers: item.pending_papers,
        q1Papers: item.q1_papers,
        q2Papers: item.q2_papers,
        activeUsers: item.active_users,
        totalUsers: item.total_users
      }))
    });
  })
);

// 个人统计详情
router.get('/personal/:userId?', 
  checkPermission('statistics', 'read'),
  catchAsync(async (req, res) => {
    let { userId } = req.params;
    const { year } = req.query;
    
    // 如果没有指定用户ID，使用当前用户
    if (!userId) {
      userId = req.user.id;
    }
    
    // 权限检查：普通用户只能查看自己的统计
    if (req.user.role === 'user' && req.user.id !== parseInt(userId)) {
      throw new AppError('权限不足', 403);
    }
    
    const startTime = Date.now();
    
    let whereCondition = 'WHERE p.user_id = ?';
    let queryParams = [userId];
    
    if (year) {
      whereCondition += ' AND p.publish_year = ?';
      queryParams.push(year);
    }
    
    const [userInfo, paperStats, monthlyTrends] = await Promise.all([
      // 用户基本信息
      executeQuery(`
        SELECT 
          u.id, u.name, u.username,
          d.name as department_name,
          u.created_at as join_date
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = ?
      `, [userId]),
      
      // 论文统计
      executeQuery(`
        SELECT 
          COUNT(*) as total_papers,
          COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_papers,
          COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_papers,
          COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as rejected_papers,
          COUNT(CASE WHEN p.type = 'journal' THEN 1 END) as journal_papers,
          COUNT(CASE WHEN p.type = 'conference' THEN 1 END) as conference_papers,
          COUNT(CASE WHEN p.type = 'degree' THEN 1 END) as degree_papers,
          COUNT(CASE WHEN p.partition_info LIKE '%Q1%' AND p.status = 'approved' THEN 1 END) as q1_papers,
          COUNT(CASE WHEN p.partition_info LIKE '%Q2%' AND p.status = 'approved' THEN 1 END) as q2_papers,
          COUNT(CASE WHEN p.partition_info LIKE '%Q3%' AND p.status = 'approved' THEN 1 END) as q3_papers,
          COUNT(CASE WHEN p.partition_info LIKE '%Q4%' AND p.status = 'approved' THEN 1 END) as q4_papers
        FROM papers p
        ${whereCondition}
      `, queryParams),
      
      // 月度趋势
      executeQuery(`
        SELECT 
          DATE_FORMAT(p.created_at, '%Y-%m') as month,
          COUNT(*) as count
        FROM papers p
        ${whereCondition}
        GROUP BY DATE_FORMAT(p.created_at, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `, queryParams)
    ]);
    
    if (userInfo.length === 0) {
      throw new AppError('用户不存在', 404);
    }
    
    const result = {
      user: userInfo[0],
      stats: paperStats[0],
      monthlyTrends: monthlyTrends.reverse() // 按时间正序排列
    };
    
    performanceLogger('STATISTICS_PERSONAL', Date.now() - startTime, { userId });
    
    res.json({
      success: true,
      data: result
    });
  })
);

// 获取排行榜
router.get('/rankings', 
  checkPermission('statistics', 'read'),
  catchAsync(async (req, res) => {
    const { 
      type = 'total', // total, approved, q1, q2
      year,
      limit = 20 
    } = req.query;
    
    const startTime = Date.now();
    
    let orderBy, countField;
    switch (type) {
      case 'approved':
        orderBy = 'approved_papers DESC';
        countField = 'COUNT(CASE WHEN p.status = "approved" THEN 1 END) as approved_papers';
        break;
      case 'q1':
        orderBy = 'q1_papers DESC';
        countField = 'COUNT(CASE WHEN p.partition_info LIKE "%Q1%" AND p.status = "approved" THEN 1 END) as q1_papers';
        break;
      case 'q2':
        orderBy = 'q2_papers DESC';
        countField = 'COUNT(CASE WHEN p.partition_info LIKE "%Q2%" AND p.status = "approved" THEN 1 END) as q2_papers';
        break;
      default:
        orderBy = 'total_papers DESC';
        countField = 'COUNT(p.id) as total_papers';
    }
    
    let whereCondition = '';
    let queryParams = [];
    
    if (year) {
      whereCondition = 'WHERE p.publish_year = ?';
      queryParams.push(year);
    }
    
    const rankings = await executeQuery(`
      SELECT 
        u.id, u.name, u.username,
        d.name as department_name,
        COUNT(p.id) as total_papers,
        COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_papers,
        COUNT(CASE WHEN p.partition_info LIKE '%Q1%' AND p.status = 'approved' THEN 1 END) as q1_papers,
        COUNT(CASE WHEN p.partition_info LIKE '%Q2%' AND p.status = 'approved' THEN 1 END) as q2_papers,
        ${countField}
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN papers p ON u.id = p.user_id ${whereCondition}
      GROUP BY u.id, u.name, u.username, d.name
      HAVING total_papers > 0
      ORDER BY ${orderBy}, total_papers DESC
      LIMIT ?
    `, [...queryParams, parseInt(limit)]);
    
    performanceLogger('STATISTICS_RANKINGS', Date.now() - startTime, { type, limit });
    
    res.json({
      success: true,
      data: rankings.map((item, index) => ({
        rank: index + 1,
        user: {
          id: item.id,
          name: item.name,
          username: item.username,
          departmentName: item.department_name
        },
        stats: {
          totalPapers: item.total_papers,
          approvedPapers: item.approved_papers,
          q1Papers: item.q1_papers,
          q2Papers: item.q2_papers
        }
      }))
    });
  })
);

// 导出统计报表
router.get('/export', 
  checkPermission('statistics', 'export'),
  catchAsync(async (req, res) => {
    const { 
      format = 'json', // json, csv
      type = 'overview', // overview, department, personal
      year,
      department_id 
    } = req.query;
    
    const startTime = Date.now();
    
    let data;
    
    switch (type) {
      case 'department':
        data = await getDepartmentExportData(year);
        break;
      case 'personal':
        data = await getPersonalExportData(req.user.id, year);
        break;
      default:
        data = await getOverviewExportData(year, department_id, req.user);
    }
    
    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=statistics_${type}_${Date.now()}.csv`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=statistics_${type}_${Date.now()}.json`);
      res.json({
        success: true,
        data,
        exportTime: new Date().toISOString()
      });
    }
    
    performanceLogger('STATISTICS_EXPORT', Date.now() - startTime, { format, type });
  })
);

// 辅助函数：获取部门导出数据
async function getDepartmentExportData(year) {
  let whereCondition = '';
  let queryParams = [];
  
  if (year) {
    whereCondition = 'WHERE p.publish_year = ?';
    queryParams.push(year);
  }
  
  return await executeQuery(`
    SELECT 
      d.name as department_name,
      COUNT(p.id) as total_papers,
      COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_papers,
      COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_papers,
      COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as rejected_papers,
      COUNT(CASE WHEN p.type = 'journal' THEN 1 END) as journal_papers,
      COUNT(CASE WHEN p.type = 'conference' THEN 1 END) as conference_papers,
      COUNT(CASE WHEN p.partition_info LIKE '%Q1%' AND p.status = 'approved' THEN 1 END) as q1_papers,
      COUNT(CASE WHEN p.partition_info LIKE '%Q2%' AND p.status = 'approved' THEN 1 END) as q2_papers
    FROM departments d
    LEFT JOIN users u ON d.id = u.department_id
    LEFT JOIN papers p ON u.id = p.user_id ${whereCondition}
    GROUP BY d.id, d.name
    ORDER BY approved_papers DESC
  `, queryParams);
}

// 辅助函数：获取个人导出数据
async function getPersonalExportData(userId, year) {
  let whereCondition = 'WHERE p.user_id = ?';
  let queryParams = [userId];
  
  if (year) {
    whereCondition += ' AND p.publish_year = ?';
    queryParams.push(year);
  }
  
  return await executeQuery(`
    SELECT 
      p.title, p.first_author, p.journal_name, p.partition_info,
      p.publish_year, p.type, p.status, p.created_at
    FROM papers p
    ${whereCondition}
    ORDER BY p.created_at DESC
  `, queryParams);
}

// 辅助函数：获取概览导出数据
async function getOverviewExportData(year, departmentId, user) {
  let whereConditions = [];
  let queryParams = [];
  
  // 权限过滤
  if (user.role === 'user') {
    whereConditions.push('p.user_id = ?');
    queryParams.push(user.id);
  } else if (user.role === 'secretary' && user.departmentId) {
    whereConditions.push('u.department_id = ?');
    queryParams.push(user.departmentId);
  }
  
  if (year) {
    whereConditions.push('p.publish_year = ?');
    queryParams.push(year);
  }
  
  if (departmentId) {
    whereConditions.push('u.department_id = ?');
    queryParams.push(departmentId);
  }
  
  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';
  
  return await executeQuery(`
    SELECT 
      u.name as user_name,
      d.name as department_name,
      p.title, p.journal_name, p.partition_info,
      p.publish_year, p.type, p.status, p.created_at
    FROM papers p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    ${whereClause}
    ORDER BY p.created_at DESC
  `, queryParams);
}

// 辅助函数：转换为CSV格式
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

module.exports = router;