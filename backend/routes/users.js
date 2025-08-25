const express = require('express');
const bcrypt = require('bcrypt');
const { executeQuery } = require('../config/database');
const { authorize, checkPermission } = require('../middleware/auth');
const { 
  validateUserCreate, 
  validateUserUpdate, 
  validatePagination,
  validateId 
} = require('../middleware/validator');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { businessLogger, performanceLogger } = require('../middleware/logger');

const router = express.Router();

// 获取用户列表
router.get('/', 
  validatePagination,
  checkPermission('users', 'read'),
  catchAsync(async (req, res) => {
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      role = '',
      department_id = null,
      status = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const startTime = Date.now();
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    
    // 非管理员用户只能查看同部门用户
    if (req.user.role === 'secretary' && req.user.departmentId) {
      whereConditions.push('u.department_id = ?');
      queryParams.push(req.user.departmentId);
    }
    
    if (keyword) {
      whereConditions.push('(u.username LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
      const keywordPattern = `%${keyword}%`;
      queryParams.push(keywordPattern, keywordPattern, keywordPattern);
    }
    
    if (role) {
      whereConditions.push('u.role = ?');
      queryParams.push(role);
    }
    
    if (department_id) {
      whereConditions.push('u.department_id = ?');
      queryParams.push(department_id);
    }
    
    if (status) {
      whereConditions.push('u.status = ?');
      queryParams.push(status);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // 查询总数
    const countSQL = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ${whereClause}
    `;
    
    // 验证排序字段和顺序
    const allowedSortBy = ['id', 'username', 'name', 'role', 'created_at', 'last_login'];
    const validSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    // 查询数据
    const dataSQL = `
      SELECT 
        u.id, u.username, u.name, u.role, u.department_id,
        u.email, u.phone, u.status, u.last_login, u.created_at,
        d.name as department_name,
        (SELECT COUNT(*) FROM papers WHERE user_id = u.id) as paper_count,
        (SELECT COUNT(*) FROM papers WHERE user_id = u.id AND status = 'approved') as approved_paper_count
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ${whereClause}
      ORDER BY u.${validSortBy} ${validSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const [countResult, users] = await Promise.all([
      executeQuery(countSQL, queryParams),
      executeQuery(dataSQL, [...queryParams, String(parseInt(pageSize)), String(offset)])
    ]);
    
    const total = countResult[0].total;
    
    performanceLogger('USERS_QUERY', Date.now() - startTime, {
      page, pageSize, total, resultCount: users.length
    });
    
    res.json({
      success: true,
      data: {
        users,
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

// 获取部门简单列表
router.get('/departments', 
  catchAsync(async (req, res) => {
    const departments = await executeQuery(`
      SELECT id, name, description
      FROM departments 
      ORDER BY name
    `);
    
    res.json({
      success: true,
      data: departments
    });
  })
);

// 获取用户详情
router.get('/:id', 
  validateId,
  checkPermission('users', 'read'),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // 非管理员只能查看自己的详情
    if (req.user.role === 'user' && req.user.id !== parseInt(id)) {
      throw new AppError('权限不足', 403);
    }
    
    const users = await executeQuery(`
      SELECT 
        u.id, u.username, u.name, u.role, u.department_id,
        u.email, u.phone, u.status, u.last_login, u.created_at, u.updated_at,
        d.name as department_name,
        (SELECT COUNT(*) FROM papers WHERE user_id = u.id) as paper_count,
        (SELECT COUNT(*) FROM papers WHERE user_id = u.id AND status = 'approved') as approved_paper_count,
        (SELECT COUNT(*) FROM papers WHERE user_id = u.id AND status = 'pending') as pending_paper_count
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `, [id]);
    
    if (users.length === 0) {
      throw new AppError('用户不存在', 404);
    }
    
    const user = users[0];
    
    // 获取用户最近的论文
    const recentPapers = await executeQuery(`
      SELECT id, title, status, created_at
      FROM papers 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [id]);
    
    user.recentPapers = recentPapers;
    
    res.json({
      success: true,
      data: user
    });
  })
);

// 创建用户
router.post('/', 
  validateUserCreate,
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const { username, password, name, role, department_id, email, phone } = req.body;
    
    // 检查用户名是否已存在
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUsers.length > 0) {
      throw new AppError('用户名已存在', 409);
    }
    
    // 检查邮箱是否已存在（如果提供了邮箱）
    if (email) {
      const existingEmails = await executeQuery(
        'SELECT id FROM users WHERE email = ? AND email != ""',
        [email]
      );
      
      if (existingEmails.length > 0) {
        throw new AppError('邮箱已存在', 409);
      }
    }
    
    // 验证部门是否存在
    if (department_id) {
      const departments = await executeQuery(
        'SELECT id FROM departments WHERE id = ?',
        [department_id]
      );
      
      if (departments.length === 0) {
        throw new AppError('部门不存在', 400);
      }
    }
    
    // 加密密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // 创建用户
    const result = await executeQuery(`
      INSERT INTO users (
        username, password, name, role, department_id, email, phone, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
    `, [username, hashedPassword, name, role, department_id || null, email || null, phone || null]);
    
    const userId = result.insertId;
    
    businessLogger('USER_CREATED', req.user, { 
      createdUserId: userId,
      username,
      role 
    });
    
    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: {
        id: userId,
        username,
        name,
        role,
        department_id,
        email,
        phone,
        status: 'active'
      }
    });
  })
);

// 更新用户信息
router.put('/:id', 
  validateId,
  validateUserUpdate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // 权限检查：只有管理员可以修改其他用户，用户可以修改自己的基本信息
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      throw new AppError('权限不足', 403);
    }
    
    // 非管理员用户不能修改role和status
    if (req.user.role !== 'admin') {
      delete updateData.role;
      delete updateData.status;
    }
    
    // 检查用户是否存在
    const existingUsers = await executeQuery('SELECT * FROM users WHERE id = ?', [id]);
    if (existingUsers.length === 0) {
      throw new AppError('用户不存在', 404);
    }
    
    // 检查邮箱唯一性（如果更新了邮箱）
    if (updateData.email) {
      const emailUsers = await executeQuery(
        'SELECT id FROM users WHERE email = ? AND id != ? AND email != ""',
        [updateData.email, id]
      );
      
      if (emailUsers.length > 0) {
        throw new AppError('邮箱已被其他用户使用', 409);
      }
    }
    
    // 验证部门是否存在
    if (updateData.department_id) {
      const departments = await executeQuery(
        'SELECT id FROM departments WHERE id = ?',
        [updateData.department_id]
      );
      
      if (departments.length === 0) {
        throw new AppError('部门不存在', 400);
      }
    }
    
    updateData.updated_at = new Date();
    
    // 构建更新SQL
    const updateFields = Object.keys(updateData).map(key => `${key} = ?`);
    const updateValues = Object.values(updateData);
    updateValues.push(id);
    
    await executeQuery(`
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `, updateValues);
    
    businessLogger('USER_UPDATED', req.user, { 
      updatedUserId: id,
      updatedFields: Object.keys(updateData)
    });
    
    res.json({
      success: true,
      message: '用户信息更新成功'
    });
  })
);

// 删除用户
router.delete('/:id', 
  validateId,
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // 不能删除自己
    if (req.user.id === parseInt(id)) {
      throw new AppError('不能删除自己的账户', 400);
    }
    
    // 检查用户是否存在
    const users = await executeQuery('SELECT username FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      throw new AppError('用户不存在', 404);
    }
    
    const user = users[0];
    
    // 检查用户是否有关联的论文
    const papers = await executeQuery('SELECT COUNT(*) as count FROM papers WHERE user_id = ?', [id]);
    if (papers[0].count > 0) {
      throw new AppError('该用户还有关联的论文，无法删除', 400);
    }
    
    // 删除用户
    await executeQuery('DELETE FROM users WHERE id = ?', [id]);
    
    businessLogger('USER_DELETED', req.user, { 
      deletedUserId: id,
      deletedUsername: user.username 
    });
    
    res.json({
      success: true,
      message: '用户删除成功'
    });
  })
);

// 批量更新用户状态
router.put('/batch/status', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const { user_ids, status } = req.body;
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      throw new AppError('用户ID列表不能为空', 400);
    }
    
    if (!['active', 'inactive'].includes(status)) {
      throw new AppError('状态值无效', 400);
    }
    
    // 确保不包含当前用户
    const filteredIds = user_ids.filter(id => id !== req.user.id);
    
    if (filteredIds.length === 0) {
      throw new AppError('不能修改自己的状态', 400);
    }
    
    // 批量更新
    await executeQuery(`
      UPDATE users 
      SET status = ?, updated_at = NOW() 
      WHERE id IN (${filteredIds.map(() => '?').join(',')})
    `, [status, ...filteredIds]);
    
    businessLogger('USERS_BATCH_STATUS_UPDATE', req.user, { 
      userIds: filteredIds,
      status,
      count: filteredIds.length 
    });
    
    res.json({
      success: true,
      message: `成功${status === 'active' ? '激活' : '禁用'}了 ${filteredIds.length} 个用户`
    });
  })
);


// 获取部门列表
router.get('/departments/list', 
  checkPermission('users', 'read'),
  catchAsync(async (req, res) => {
    const departments = await executeQuery(`
      SELECT 
        d.*,
        COUNT(u.id) as user_count,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_user_count
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id
      GROUP BY d.id, d.name, d.description, d.created_at, d.updated_at
      ORDER BY d.name
    `);
    
    res.json({
      success: true,
      data: departments
    });
  })
);

// 创建部门
router.post('/departments', 
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const { name, description = '' } = req.body;
    
    if (!name || name.trim().length < 2) {
      throw new AppError('部门名称至少需要2个字符', 400);
    }
    
    // 检查部门名是否已存在
    const existing = await executeQuery('SELECT id FROM departments WHERE name = ?', [name.trim()]);
    if (existing.length > 0) {
      throw new AppError('部门名称已存在', 409);
    }
    
    const result = await executeQuery(
      'INSERT INTO departments (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      [name.trim(), description.trim()]
    );
    
    const departmentId = result.insertId;
    
    businessLogger('DEPARTMENT_CREATED', req.user, { 
      departmentId,
      name 
    });
    
    res.status(201).json({
      success: true,
      message: '部门创建成功',
      data: {
        id: departmentId,
        name: name.trim(),
        description: description.trim()
      }
    });
  })
);

// 更新部门
router.put('/departments/:id', 
  validateId,
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const updateData = {};
    if (name && name.trim().length >= 2) {
      // 检查名称是否已被其他部门使用
      const existing = await executeQuery(
        'SELECT id FROM departments WHERE name = ? AND id != ?',
        [name.trim(), id]
      );
      if (existing.length > 0) {
        throw new AppError('部门名称已存在', 409);
      }
      updateData.name = name.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description.trim();
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new AppError('没有需要更新的数据', 400);
    }
    
    updateData.updated_at = new Date();
    
    const updateFields = Object.keys(updateData).map(key => `${key} = ?`);
    const updateValues = Object.values(updateData);
    updateValues.push(id);
    
    const result = await executeQuery(`
      UPDATE departments 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `, updateValues);
    
    if (result.affectedRows === 0) {
      throw new AppError('部门不存在', 404);
    }
    
    businessLogger('DEPARTMENT_UPDATED', req.user, { 
      departmentId: id,
      updatedFields: Object.keys(updateData).filter(key => key !== 'updated_at')
    });
    
    res.json({
      success: true,
      message: '部门更新成功'
    });
  })
);

// 删除部门
router.delete('/departments/:id', 
  validateId,
  authorize(['admin']),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // 检查部门是否有用户
    const users = await executeQuery('SELECT COUNT(*) as count FROM users WHERE department_id = ?', [id]);
    if (users[0].count > 0) {
      throw new AppError('该部门还有用户，无法删除', 400);
    }
    
    const result = await executeQuery('DELETE FROM departments WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      throw new AppError('部门不存在', 404);
    }
    
    businessLogger('DEPARTMENT_DELETED', req.user, { departmentId: id });
    
    res.json({
      success: true,
      message: '部门删除成功'
    });
  })
);

module.exports = router;