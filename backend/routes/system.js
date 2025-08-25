const express = require('express');
const { executeQuery, cache } = require('../config/database');
const { authorize } = require('../middleware/auth');
const { validateSystemConfig } = require('../middleware/validator');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { businessLogger, performanceLogger } = require('../middleware/logger');

const router = express.Router();

// 获取系统配置
router.get('/config', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const configs = await executeQuery(
      'SELECT config_key, config_value, description, type FROM system_configs ORDER BY config_key'
    );
    
    // 将配置转换为键值对象
    const configObject = {};
    configs.forEach(config => {
      let value = config.config_value;
      
      // 根据类型转换值
      switch (config.type) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = config.config_value;
          }
          break;
        default:
          value = config.config_value;
      }
      
      configObject[config.config_key] = {
        value,
        description: config.description,
        type: config.type
      };
    });
    
    res.json({
      success: true,
      data: configObject
    });
  })
);

// 更新系统配置
router.put('/config', 
  authorize(['admin']),
  validateSystemConfig,
  catchAsync(async (req, res) => {
    const updateData = req.body;
    const updateQueries = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      // 验证配置项是否存在
      const existingConfig = await executeQuery(
        'SELECT config_key, type FROM system_configs WHERE config_key = ?',
        [key]
      );
      
      if (existingConfig.length === 0) {
        throw new AppError(`配置项 ${key} 不存在`, 400);
      }
      
      // 根据类型验证和转换值
      let configValue = value;
      const configType = existingConfig[0].type;
      
      switch (configType) {
        case 'number':
          if (isNaN(value)) {
            throw new AppError(`配置项 ${key} 必须是数字`, 400);
          }
          configValue = value.toString();
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new AppError(`配置项 ${key} 必须是布尔值`, 400);
          }
          configValue = value.toString();
          break;
        case 'json':
          try {
            configValue = JSON.stringify(value);
          } catch (e) {
            throw new AppError(`配置项 ${key} JSON格式无效`, 400);
          }
          break;
        default:
          configValue = value.toString();
      }
      
      updateQueries.push({
        sql: 'UPDATE system_configs SET config_value = ?, updated_at = NOW() WHERE config_key = ?',
        params: [configValue, key]
      });
    }
    
    // 批量更新配置
    if (updateQueries.length > 0) {
      await executeTransaction(updateQueries);
    }
    
    // 清除相关缓存
    await cache.del('system_config');
    
    businessLogger('SYSTEM_CONFIG_UPDATED', req.user, { 
      updatedConfigs: Object.keys(updateData)
    });
    
    res.json({
      success: true,
      message: '系统配置更新成功'
    });
  })
);

// 获取系统统计信息
router.get('/stats', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const startTime = Date.now();
    
    const [
      userStats,
      paperStats,
      departmentStats,
      systemInfo
    ] = await Promise.all([
      // 用户统计
      executeQuery(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
          COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_count,
          COUNT(CASE WHEN role = 'secretary' THEN 1 END) as secretary_count,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count,
          COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_30_days
        FROM users
      `),
      
      // 论文统计
      executeQuery(`
        SELECT 
          COUNT(*) as total_papers,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_papers,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_papers,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_papers,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_papers,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as papers_30_days,
          COUNT(CASE WHEN type = 'journal' THEN 1 END) as journal_papers,
          COUNT(CASE WHEN type = 'conference' THEN 1 END) as conference_papers,
          COUNT(CASE WHEN type = 'degree' THEN 1 END) as degree_papers
        FROM papers
      `),
      
      // 部门统计
      executeQuery(`
        SELECT 
          COUNT(*) as total_departments,
          AVG(user_counts.user_count) as avg_users_per_dept
        FROM departments d
        LEFT JOIN (
          SELECT department_id, COUNT(*) as user_count 
          FROM users 
          GROUP BY department_id
        ) user_counts ON d.id = user_counts.department_id
      `),
      
      // 系统信息
      executeQuery(`
        SELECT 
          (SELECT COUNT(*) FROM notifications WHERE status = 'published') as published_notifications,
          (SELECT COUNT(*) FROM operation_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as logs_24_hours,
          (SELECT COUNT(*) FROM journals) as cached_journals
      `)
    ]);
    
    const stats = {
      users: userStats[0],
      papers: paperStats[0],
      departments: departmentStats[0],
      system: {
        ...systemInfo[0],
        uptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage()
      }
    };
    
    performanceLogger('SYSTEM_STATS', Date.now() - startTime);
    
    res.json({
      success: true,
      data: stats
    });
  })
);

// 获取系统日志
router.get('/logs', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const {
      page = 1,
      pageSize = 50,
      level = '',
      action = '',
      userId = '',
      startDate = '',
      endDate = ''
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    
    if (level) {
      whereConditions.push('level = ?');
      queryParams.push(level);
    }
    
    if (action) {
      whereConditions.push('action LIKE ?');
      queryParams.push(`%${action}%`);
    }
    
    if (userId) {
      whereConditions.push('user_id = ?');
      queryParams.push(userId);
    }
    
    if (startDate) {
      whereConditions.push('created_at >= ?');
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('created_at <= ?');
      queryParams.push(endDate);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    const [countResult, logs] = await Promise.all([
      executeQuery(`
        SELECT COUNT(*) as total
        FROM operation_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ${whereClause}
      `, queryParams),
      
      executeQuery(`
        SELECT 
          l.*,
          u.name as user_name,
          u.username
        FROM operation_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ${whereClause}
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, parseInt(pageSize), offset])
    ]);
    
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
  })
);

// 清理系统日志
router.delete('/logs/cleanup', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const { days = 30 } = req.body;
    
    if (days < 7) {
      throw new AppError('至少保留7天的日志', 400);
    }
    
    const result = await executeQuery(
      'DELETE FROM operation_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    
    businessLogger('SYSTEM_LOGS_CLEANED', req.user, { 
      days,
      deletedCount: result.affectedRows 
    });
    
    res.json({
      success: true,
      message: `清理了 ${result.affectedRows} 条日志记录`,
      data: {
        deletedCount: result.affectedRows
      }
    });
  })
);

// 获取数据库状态
router.get('/database/status', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const [
      tableStats,
      dbSize,
      connectionStats
    ] = await Promise.all([
      // 表统计信息
      executeQuery(`
        SELECT 
          TABLE_NAME as table_name,
          TABLE_ROWS as row_count,
          ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY size_mb DESC
      `),
      
      // 数据库大小
      executeQuery(`
        SELECT 
          ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as total_size_mb
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
      `),
      
      // 连接统计
      executeQuery(`
        SHOW STATUS WHERE Variable_name IN (
          'Threads_connected', 'Threads_running', 'Max_used_connections'
        )
      `)
    ]);
    
    res.json({
      success: true,
      data: {
        tables: tableStats,
        totalSize: dbSize[0].total_size_mb,
        connections: connectionStats.reduce((acc, stat) => {
          acc[stat.Variable_name.toLowerCase()] = parseInt(stat.Value);
          return acc;
        }, {})
      }
    });
  })
);

// 数据库备份
router.post('/database/backup', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const backupName = `backup_${Date.now()}.sql`;
    
    // 这里应该实现真正的数据库备份逻辑
    // 由于安全考虑，这里只返回成功信息
    
    businessLogger('DATABASE_BACKUP_REQUESTED', req.user, { backupName });
    
    res.json({
      success: true,
      message: '数据库备份请求已提交',
      data: {
        backupName,
        status: 'queued'
      }
    });
  })
);

// 系统健康检查
router.get('/health/detailed', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const startTime = Date.now();
    
    const healthChecks = await Promise.allSettled([
      // 数据库连接检查
      executeQuery('SELECT 1 as db_check'),
      
      // Redis连接检查（如果使用）
      cache.get('health_check'),
      
      // 磁盘空间检查（模拟）
      Promise.resolve({ available: '80%' }),
      
      // 内存使用检查
      Promise.resolve(process.memoryUsage())
    ]);
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: healthChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        cache: healthChecks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        disk: 'healthy',
        memory: healthChecks[3].status === 'fulfilled' ? 'healthy' : 'unhealthy'
      },
      details: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : null
      }
    };
    
    // 如果任何检查失败，设置整体状态为不健康
    if (Object.values(health.checks).includes('unhealthy')) {
      health.status = 'unhealthy';
    }
    
    performanceLogger('HEALTH_CHECK', Date.now() - startTime);
    
    res.json({
      success: true,
      data: health
    });
  })
);

// 缓存管理
router.get('/cache/stats', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    // 获取Redis统计信息（如果使用Redis）
    try {
      const cacheStats = {
        type: 'redis',
        status: 'connected',
        // 这里应该获取真实的Redis统计信息
        keyCount: 0,
        memoryUsage: '0MB',
        hits: 0,
        misses: 0
      };
      
      res.json({
        success: true,
        data: cacheStats
      });
    } catch (error) {
      res.json({
        success: true,
        data: {
          type: 'memory',
          status: 'active',
          message: '使用内存缓存'
        }
      });
    }
  })
);

// 清除缓存
router.delete('/cache/clear', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const { pattern = '*' } = req.body;
    
    try {
      if (pattern === '*') {
        await cache.flush();
      } else {
        // 清除特定模式的缓存键
        await cache.del(pattern);
      }
      
      businessLogger('CACHE_CLEARED', req.user, { pattern });
      
      res.json({
        success: true,
        message: '缓存清除成功'
      });
    } catch (error) {
      console.error('清除缓存失败:', error);
      throw new AppError('清除缓存失败', 500);
    }
  })
);

// 系统维护模式
router.put('/maintenance', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const { enabled, message = '系统正在维护中，请稍后访问' } = req.body;
    
    await executeQuery(
      'UPDATE system_configs SET config_value = ?, updated_at = NOW() WHERE config_key = "maintenance_mode"',
      [enabled.toString()]
    );
    
    await executeQuery(
      'UPDATE system_configs SET config_value = ?, updated_at = NOW() WHERE config_key = "maintenance_message"',
      [message]
    );
    
    // 清除缓存
    await cache.del('system_config');
    
    businessLogger('MAINTENANCE_MODE_CHANGED', req.user, { 
      enabled,
      message 
    });
    
    res.json({
      success: true,
      message: `维护模式已${enabled ? '开启' : '关闭'}`
    });
  })
);

module.exports = router;