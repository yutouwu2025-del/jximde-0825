const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { executeQuery } = require('../config/database');
const { 
  generateToken, 
  generateRefreshToken, 
  blacklistToken,
  authenticate 
} = require('../middleware/auth');
const { 
  validateUserLogin, 
  validatePasswordReset 
} = require('../middleware/validator');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { securityLogger, businessLogger } = require('../middleware/logger');

const router = express.Router();

// 登录频率限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: {
    success: false,
    message: '登录尝试次数过多，请15分钟后再试',
    code: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body.username || '');
  }
});

// 用户登录
router.post('/login', loginLimiter, validateUserLogin, catchAsync(async (req, res) => {
  const { username, password } = req.body;
  
  // 查询用户信息
  const users = await executeQuery(`
    SELECT u.*, d.name as department_name 
    FROM users u 
    LEFT JOIN departments d ON u.department_id = d.id 
    WHERE u.username = ?
  `, [username]);
  
  if (users.length === 0) {
    // 记录安全事件
    securityLogger('LOGIN_ATTEMPT_INVALID_USER', req, { username });
    
    return res.status(401).json({
      success: false,
      message: '用户名或密码错误',
      code: 401
    });
  }
  
  const user = users[0];
  
  // 检查用户状态
  if (user.status !== 'active') {
    securityLogger('LOGIN_ATTEMPT_INACTIVE_USER', req, { 
      username,
      userId: user.id,
      status: user.status 
    });
    
    return res.status(401).json({
      success: false,
      message: '账户已被禁用，请联系管理员',
      code: 401
    });
  }
  
  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    securityLogger('LOGIN_ATTEMPT_WRONG_PASSWORD', req, { 
      username,
      userId: user.id 
    });
    
    return res.status(401).json({
      success: false,
      message: '用户名或密码错误',
      code: 401
    });
  }
  
  // 生成令牌
  const token = generateToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);
  
  // 更新最后登录时间
  await executeQuery(
    'UPDATE users SET last_login = NOW() WHERE id = ?',
    [user.id]
  );
  
  // 记录业务日志
  businessLogger('USER_LOGIN', user);
  
  // 返回登录成功响应
  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        departmentId: user.department_id,
        departmentName: user.department_name,
        email: user.email,
        lastLogin: user.last_login
      }
    }
  });
}));

// 刷新令牌
router.post('/refresh', catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: '刷新令牌不能为空',
      code: 400
    });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }
    
    // 查询用户信息
    const users = await executeQuery(
      'SELECT * FROM users WHERE id = ? AND status = "active"',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      throw new Error('User not found or inactive');
    }
    
    const user = users[0];
    
    // 生成新的访问令牌
    const newToken = generateToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);
    
    res.json({
      success: true,
      message: '令牌刷新成功',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '刷新令牌无效或已过期',
      code: 401
    });
  }
}));

// 用户登出
router.post('/logout', authenticate, catchAsync(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.substring(7);
  
  // 将令牌加入黑名单
  await blacklistToken(token);
  
  // 记录业务日志
  businessLogger('USER_LOGOUT', req.user);
  
  res.json({
    success: true,
    message: '退出登录成功'
  });
}));

// 获取当前用户信息
router.get('/me', authenticate, catchAsync(async (req, res) => {
  // 获取最新的用户信息
  const users = await executeQuery(`
    SELECT u.*, d.name as department_name 
    FROM users u 
    LEFT JOIN departments d ON u.department_id = d.id 
    WHERE u.id = ?
  `, [req.user.id]);
  
  if (users.length === 0) {
    throw new AppError('用户不存在', 404);
  }
  
  const user = users[0];
  
  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      lastLogin: user.last_login,
      createdAt: user.created_at
    }
  });
}));

// 修改密码
router.put('/password', authenticate, validatePasswordReset, catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // 获取当前用户的密码
  const users = await executeQuery(
    'SELECT password FROM users WHERE id = ?',
    [req.user.id]
  );
  
  if (users.length === 0) {
    throw new AppError('用户不存在', 404);
  }
  
  const user = users[0];
  
  // 验证当前密码（如果提供了）
  if (currentPassword) {
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      securityLogger('PASSWORD_CHANGE_WRONG_CURRENT', req, { 
        userId: req.user.id 
      });
      
      return res.status(400).json({
        success: false,
        message: '当前密码错误',
        code: 400
      });
    }
  }
  
  // 加密新密码
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  
  // 更新密码
  await executeQuery(
    'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
    [hashedPassword, req.user.id]
  );
  
  // 记录安全事件
  securityLogger('PASSWORD_CHANGED', req, { userId: req.user.id });
  
  // 记录业务日志
  businessLogger('PASSWORD_CHANGE', req.user);
  
  res.json({
    success: true,
    message: '密码修改成功'
  });
}));

// 重置密码（管理员功能）
router.put('/reset-password/:id', 
  authenticate, 
  validatePasswordReset, 
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    // 检查权限（只有管理员可以重置其他用户密码）
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: '权限不足',
        code: 403
      });
    }
    
    // 检查目标用户是否存在
    const users = await executeQuery(
      'SELECT id, username FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      throw new AppError('用户不存在', 404);
    }
    
    const targetUser = users[0];
    
    // 加密新密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // 更新密码
    await executeQuery(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, id]
    );
    
    // 记录安全事件
    securityLogger('PASSWORD_RESET_BY_ADMIN', req, { 
      targetUserId: id,
      targetUsername: targetUser.username 
    });
    
    // 记录业务日志
    businessLogger('PASSWORD_RESET', req.user, { 
      targetUserId: id,
      targetUsername: targetUser.username 
    });
    
    res.json({
      success: true,
      message: '密码重置成功'
    });
  })
);

// 检查用户名是否可用
router.get('/check-username/:username', catchAsync(async (req, res) => {
  const { username } = req.params;
  
  const users = await executeQuery(
    'SELECT id FROM users WHERE username = ?',
    [username]
  );
  
  res.json({
    success: true,
    data: {
      available: users.length === 0,
      message: users.length === 0 ? '用户名可用' : '用户名已存在'
    }
  });
}));

module.exports = router;