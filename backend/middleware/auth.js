const jwt = require('jsonwebtoken');
const { executeQuery, cache } = require('../config/database');

// JWT令牌验证中间件
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
        code: 401
      });
    }
    
    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    
    // 验证JWT令牌
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌',
        code: 401
      });
    }
    
    // 检查令牌是否在黑名单中（用于登出功能）
    const isBlacklisted = await cache.get(`blacklist_${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: '令牌已失效',
        code: 401
      });
    }
    
    // 从数据库获取用户信息
    const users = await executeQuery(
      `SELECT u.*, d.name as department_name 
       FROM users u 
       LEFT JOIN departments d ON u.department_id = d.id 
       WHERE u.id = ? AND u.status = 'active'`,
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用',
        code: 401
      });
    }
    
    const user = users[0];
    
    // 将用户信息添加到请求对象中
    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name,
      email: user.email
    };
    
    // 更新最后登录时间（异步执行，不阻塞请求）
    executeQuery('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])
      .catch(error => console.error('更新最后登录时间失败:', error));
    
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '认证过程中发生错误',
      code: 500
    });
  }
}

// 角色权限检查中间件
function authorize(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证的用户',
        code: 401
      });
    }
    
    const userRole = req.user.role;
    
    // 如果是数组，检查用户角色是否在允许的角色列表中
    if (Array.isArray(allowedRoles)) {
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: '权限不足',
          code: 403
        });
      }
    } else {
      // 如果是单个角色字符串
      if (userRole !== allowedRoles) {
        return res.status(403).json({
          success: false,
          message: '权限不足',
          code: 403
        });
      }
    }
    
    next();
  };
}

// 资源所有权检查中间件
function checkOwnership(resourceIdParam = 'id', userIdField = 'user_id', tableName) {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // 管理员和论文管理员可以访问所有资源
      if (userRole === 'admin' || userRole === 'manager') {
        return next();
      }
      
      // 检查资源是否属于当前用户
      const resources = await executeQuery(
        `SELECT ${userIdField} FROM ${tableName} WHERE id = ?`,
        [resourceId]
      );
      
      if (resources.length === 0) {
        return res.status(404).json({
          success: false,
          message: '资源不存在',
          code: 404
        });
      }
      
      const resource = resources[0];
      if (resource[userIdField] !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权访问此资源',
          code: 403
        });
      }
      
      next();
    } catch (error) {
      console.error('所有权检查错误:', error);
      res.status(500).json({
        success: false,
        message: '权限检查过程中发生错误',
        code: 500
      });
    }
  };
}

// 获取用户角色权限配置
function getRolePermissions(role) {
  const permissions = {
    admin: {
      papers: ['create', 'read', 'update', 'delete', 'audit'],
      users: ['create', 'read', 'update', 'delete'],
      notifications: ['create', 'read', 'update', 'delete'],
      statistics: ['read', 'export'],
      system: ['read', 'update']
    },
    manager: {
      papers: ['create', 'read', 'update', 'audit'],
      users: ['read'],
      notifications: ['read'],
      statistics: ['read', 'export'],
      system: ['read']
    },
    secretary: {
      papers: ['read', 'audit'],
      users: ['read'],
      notifications: ['create', 'read', 'update'],
      statistics: ['read', 'export'],
      system: ['read']
    },
    user: {
      papers: ['create', 'read', 'update'],
      users: ['read'],
      notifications: ['read'],
      statistics: ['read'],
      system: []
    }
  };
  
  return permissions[role] || {};
}

// 功能权限检查中间件
function checkPermission(resource, action) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const permissions = getRolePermissions(userRole);
    
    if (!permissions[resource] || !permissions[resource].includes(action)) {
      return res.status(403).json({
        success: false,
        message: `无权执行此操作: ${action} on ${resource}`,
        code: 403
      });
    }
    
    next();
  };
}

// 部门权限检查中间件（秘书只能管理同部门的数据）
function checkDepartmentAccess(req, res, next) {
  const userRole = req.user.role;
  const userDepartmentId = req.user.departmentId;
  
  // 管理员可以访问所有部门数据
  if (userRole === 'admin') {
    return next();
  }
  
  // 如果查询参数中有部门筛选，检查权限
  if (req.query.department_id && req.query.department_id !== userDepartmentId.toString()) {
    if (userRole !== 'manager') { // 论文管理员可以跨部门
      return res.status(403).json({
        success: false,
        message: '无权访问其他部门的数据',
        code: 403
      });
    }
  }
  
  next();
}

// 生成JWT令牌
function generateToken(userId, role) {
  const payload = {
    userId,
    role,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
}

// 生成刷新令牌
function generateRefreshToken(userId) {
  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
}

// 令牌黑名单处理（用于登出）
async function blacklistToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
      if (expirationTime > 0) {
        await cache.set(`blacklist_${token}`, true, expirationTime);
      }
    }
  } catch (error) {
    console.error('令牌加入黑名单失败:', error);
  }
}

module.exports = {
  authenticate,
  authorize,
  checkOwnership,
  checkPermission,
  checkDepartmentAccess,
  getRolePermissions,
  generateToken,
  generateRefreshToken,
  blacklistToken
};