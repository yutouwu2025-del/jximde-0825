const express = require('express');
const { executeQuery, executeTransaction } = require('../config/database');
const { authorize, checkPermission, checkOwnership } = require('../middleware/auth');
const { 
  validateNotificationCreate, 
  validateNotificationUpdate,
  validatePagination,
  validateId 
} = require('../middleware/validator');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { businessLogger } = require('../middleware/logger');

const router = express.Router();

// 获取通知列表
router.get('/', 
  catchAsync(async (req, res) => {
    const { 
      page = 1, 
      pageSize = 10, 
      limit, 
      sort = 'created_at', 
      order = 'desc' 
    } = req.query;
    
    // 如果有limit参数，使用limit模式（简单查询）
    if (limit) {
      const limitValue = parseInt(limit) || 5;
      
      // 验证sort和order参数
      const validSorts = ['created_at', 'updated_at', 'title'];
      const validOrders = ['ASC', 'DESC'];
      const validSort = validSorts.includes(sort) ? sort : 'created_at';
      const validOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
      
      let dataSQL;
      
      if (req.user.role === 'admin' || req.user.role === 'secretary') {
        dataSQL = `
          SELECT 
            n.id, n.title, n.content, n.type, n.status, 
            n.created_at, n.updated_at,
            u.name as author_name
          FROM notifications n
          LEFT JOIN users u ON n.author_id = u.id
          ORDER BY n.\`${validSort}\` ${validOrder}
          LIMIT ?
        `;
      } else {
        dataSQL = `
          SELECT 
            n.id, n.title, n.content, n.type, n.status, 
            n.created_at, n.updated_at,
            u.name as author_name
          FROM notifications n
          LEFT JOIN users u ON n.author_id = u.id
          WHERE n.status = 'published'
          ORDER BY n.\`${validSort}\` ${validOrder}
          LIMIT ?
        `;
      }
      
      const notifications = await executeQuery(dataSQL, [String(limitValue)]);
      
      return res.json({
        success: true,
        data: notifications
      });
    }
    
    // 分页模式
    const offset = (page - 1) * pageSize;
    
    // 验证sort和order参数
    const validSorts = ['created_at', 'updated_at', 'title'];
    const validOrders = ['ASC', 'DESC'];
    const validSort = validSorts.includes(sort) ? sort : 'created_at';
    const validOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
    
    let whereClause = '';
    let queryParams = [];
    
    if (req.user.role !== 'admin' && req.user.role !== 'secretary') {
      whereClause = 'WHERE n.status = ?';
      queryParams.push('published');
    }
    
    // 查询总数
    const countSQL = `SELECT COUNT(*) as total FROM notifications n ${whereClause}`;
    const [countResult] = await executeQuery(countSQL, queryParams);
    
    // 查询数据
    const dataSQL = `
      SELECT 
        n.id, n.title, n.content, n.type, n.status, 
        n.created_at, n.updated_at,
        u.name as author_name
      FROM notifications n
      LEFT JOIN users u ON n.author_id = u.id
      ${whereClause}
      ORDER BY n.\`${validSort}\` ${validOrder}
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...queryParams, String(parseInt(pageSize)), String(offset)];
    const notifications = await executeQuery(dataSQL, dataParams);
    
    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / pageSize)
        }
      }
    });
  })
);

// 获取通知详情
router.get('/:id', 
  validateId,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const notifications = await executeQuery(`
      SELECT 
        n.*,
        u.name as author_name,
        u.username as author_username,
        (SELECT COUNT(*) FROM notification_reads WHERE notification_id = n.id) as actual_read_count,
        CASE WHEN nr.id IS NOT NULL THEN true ELSE false END as is_read_by_current_user
      FROM notifications n
      LEFT JOIN users u ON n.author_id = u.id
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
      WHERE n.id = ? AND (n.status = 'published' OR n.author_id = ? OR ? IN ('admin', 'secretary'))
    `, [req.user.id, id, req.user.id, req.user.role]);
    
    if (notifications.length === 0) {
      throw new AppError('通知不存在或无权访问', 404);
    }
    
    const notification = notifications[0];
    
    // 记录阅读记录（异步执行，不影响响应）
    if (!notification.is_read_by_current_user && notification.status === 'published') {
      markAsRead(id, req.user.id).catch(error => {
        console.error('标记通知为已读失败:', error);
      });
    }
    
    res.json({
      success: true,
      data: notification
    });
  })
);

// 创建通知
router.post('/', 
  validateNotificationCreate,
  checkPermission('notifications', 'create'),
  catchAsync(async (req, res) => {
    const { title, content, type, status } = req.body;
    
    const result = await executeQuery(`
      INSERT INTO notifications (
        title, content, type, status, author_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [title, content, type, status, req.user.id]);
    
    const notificationId = result.insertId;
    
    businessLogger('NOTIFICATION_CREATED', req.user, { 
      notificationId,
      title,
      type,
      status 
    });
    
    res.status(201).json({
      success: true,
      message: '通知创建成功',
      data: {
        id: notificationId,
        title,
        content,
        type,
        status
      }
    });
  })
);

// 更新通知
router.put('/:id', 
  validateId,
  validateNotificationUpdate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // 检查通知是否存在和权限
    const notifications = await executeQuery(
      'SELECT author_id, status FROM notifications WHERE id = ?',
      [id]
    );
    
    if (notifications.length === 0) {
      throw new AppError('通知不存在', 404);
    }
    
    const notification = notifications[0];
    
    // 权限检查：只有作者或管理员可以修改
    if (req.user.role !== 'admin' && req.user.id !== notification.author_id) {
      throw new AppError('权限不足', 403);
    }
    
    updateData.updated_at = new Date();
    
    // 构建更新SQL
    const updateFields = Object.keys(updateData).map(key => `${key} = ?`);
    const updateValues = Object.values(updateData);
    updateValues.push(id);
    
    await executeQuery(`
      UPDATE notifications 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `, updateValues);
    
    businessLogger('NOTIFICATION_UPDATED', req.user, { 
      notificationId: id,
      updatedFields: Object.keys(updateData).filter(key => key !== 'updated_at')
    });
    
    res.json({
      success: true,
      message: '通知更新成功'
    });
  })
);

// 删除通知
router.delete('/:id', 
  validateId,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // 检查通知是否存在和权限
    const notifications = await executeQuery(
      'SELECT author_id, title FROM notifications WHERE id = ?',
      [id]
    );
    
    if (notifications.length === 0) {
      throw new AppError('通知不存在', 404);
    }
    
    const notification = notifications[0];
    
    // 权限检查：只有作者或管理员可以删除
    if (req.user.role !== 'admin' && req.user.id !== notification.author_id) {
      throw new AppError('权限不足', 403);
    }
    
    // 使用事务删除通知和相关的阅读记录
    await executeTransaction([
      { sql: 'DELETE FROM notification_reads WHERE notification_id = ?', params: [id] },
      { sql: 'DELETE FROM notifications WHERE id = ?', params: [id] }
    ]);
    
    businessLogger('NOTIFICATION_DELETED', req.user, { 
      notificationId: id,
      title: notification.title 
    });
    
    res.json({
      success: true,
      message: '通知删除成功'
    });
  })
);

// 发布通知（将草稿状态改为已发布）
router.put('/:id/publish', 
  validateId,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // 检查通知是否存在和权限
    const notifications = await executeQuery(
      'SELECT author_id, status FROM notifications WHERE id = ?',
      [id]
    );
    
    if (notifications.length === 0) {
      throw new AppError('通知不存在', 404);
    }
    
    const notification = notifications[0];
    
    // 权限检查
    if (req.user.role !== 'admin' && req.user.id !== notification.author_id) {
      throw new AppError('权限不足', 403);
    }
    
    if (notification.status === 'published') {
      throw new AppError('通知已经是发布状态', 400);
    }
    
    await executeQuery(
      'UPDATE notifications SET status = "published", updated_at = NOW() WHERE id = ?',
      [id]
    );
    
    businessLogger('NOTIFICATION_PUBLISHED', req.user, { notificationId: id });
    
    res.json({
      success: true,
      message: '通知发布成功'
    });
  })
);

// 撤回通知（将已发布状态改为草稿）
router.put('/:id/unpublish', 
  validateId,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // 检查通知是否存在和权限
    const notifications = await executeQuery(
      'SELECT author_id, status FROM notifications WHERE id = ?',
      [id]
    );
    
    if (notifications.length === 0) {
      throw new AppError('通知不存在', 404);
    }
    
    const notification = notifications[0];
    
    // 权限检查
    if (req.user.role !== 'admin' && req.user.id !== notification.author_id) {
      throw new AppError('权限不足', 403);
    }
    
    if (notification.status === 'draft') {
      throw new AppError('通知已经是草稿状态', 400);
    }
    
    await executeQuery(
      'UPDATE notifications SET status = "draft", updated_at = NOW() WHERE id = ?',
      [id]
    );
    
    businessLogger('NOTIFICATION_UNPUBLISHED', req.user, { notificationId: id });
    
    res.json({
      success: true,
      message: '通知已撤回'
    });
  })
);

// 标记通知为已读
router.post('/:id/read', 
  validateId,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // 检查通知是否存在且已发布
    const notifications = await executeQuery(
      'SELECT id FROM notifications WHERE id = ? AND status = "published"',
      [id]
    );
    
    if (notifications.length === 0) {
      throw new AppError('通知不存在或未发布', 404);
    }
    
    // 标记为已读
    await markAsRead(id, req.user.id);
    
    res.json({
      success: true,
      message: '已标记为已读'
    });
  })
);

// 获取未读通知数量
router.get('/unread/count', catchAsync(async (req, res) => {
  const unreadCount = await executeQuery(`
    SELECT COUNT(*) as count
    FROM notifications n
    WHERE n.status = 'published' 
    AND NOT EXISTS (
      SELECT 1 FROM notification_reads nr 
      WHERE nr.notification_id = n.id AND nr.user_id = ?
    )
  `, [req.user.id]);
  
  res.json({
    success: true,
    data: {
      count: unreadCount[0].count
    }
  });
}));

// 标记所有通知为已读
router.post('/read-all', catchAsync(async (req, res) => {
  // 获取所有未读的已发布通知
  const unreadNotifications = await executeQuery(`
    SELECT n.id
    FROM notifications n
    WHERE n.status = 'published' 
    AND NOT EXISTS (
      SELECT 1 FROM notification_reads nr 
      WHERE nr.notification_id = n.id AND nr.user_id = ?
    )
  `, [req.user.id]);
  
  if (unreadNotifications.length === 0) {
    return res.json({
      success: true,
      message: '没有未读通知'
    });
  }
  
  // 批量插入阅读记录
  const readRecords = unreadNotifications.map(notification => ({
    sql: 'INSERT IGNORE INTO notification_reads (notification_id, user_id, read_at) VALUES (?, ?, NOW())',
    params: [notification.id, req.user.id]
  }));
  
  await executeTransaction(readRecords);
  
  businessLogger('NOTIFICATIONS_READ_ALL', req.user, { 
    count: unreadNotifications.length 
  });
  
  res.json({
    success: true,
    message: `已标记 ${unreadNotifications.length} 条通知为已读`
  });
}));

// 获取通知统计信息（管理员功能）
router.get('/stats/overview', 
  authorize(['admin', 'secretary']),
  catchAsync(async (req, res) => {
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN type = 'system' THEN 1 END) as system_count,
        COUNT(CASE WHEN type = 'announcement' THEN 1 END) as announcement_count,
        COUNT(CASE WHEN type = 'reminder' THEN 1 END) as reminder_count,
        AVG(read_count) as avg_read_count
      FROM notifications
      ${req.user.role === 'secretary' ? 'WHERE author_id = ?' : ''}
    `, req.user.role === 'secretary' ? [req.user.id] : []);
    
    // 获取最近的通知阅读情况
    const recentReads = await executeQuery(`
      SELECT 
        n.title,
        COUNT(nr.id) as read_count,
        n.created_at
      FROM notifications n
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id
      WHERE n.status = 'published' 
      ${req.user.role === 'secretary' ? 'AND n.author_id = ?' : ''}
      GROUP BY n.id, n.title, n.created_at
      ORDER BY n.created_at DESC
      LIMIT 10
    `, req.user.role === 'secretary' ? [req.user.id] : []);
    
    res.json({
      success: true,
      data: {
        overview: stats[0],
        recentReads
      }
    });
  })
);

// 辅助函数：标记通知为已读
async function markAsRead(notificationId, userId) {
  try {
    // 使用 INSERT IGNORE 避免重复插入
    await executeQuery(
      'INSERT IGNORE INTO notification_reads (notification_id, user_id, read_at) VALUES (?, ?, NOW())',
      [notificationId, userId]
    );
    
    // 更新通知的阅读次数（如果使用了read_count字段）
    await executeQuery(
      'UPDATE notifications SET read_count = read_count + 1 WHERE id = ?',
      [notificationId]
    );
  } catch (error) {
    console.error('标记通知已读失败:', error);
    throw error;
  }
}


module.exports = router;