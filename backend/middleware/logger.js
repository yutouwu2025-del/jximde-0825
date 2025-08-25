const winston = require('winston');
const { executeQuery } = require('../config/database');

// 配置Winston日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    // 错误日志文件
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // 综合日志文件
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    }),
    // 访问日志文件
    new winston.transports.File({ 
      filename: 'logs/access.log',
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 7,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    )
  }));
}

// 请求日志中间件
function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // 获取客户端IP
  const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.ip;
  };
  
  // 记录请求开始
  const requestInfo = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: getClientIP(req),
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString(),
    userId: null,
    username: null
  };
  
  // 响应结束时记录日志
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    // 获取用户信息（如果已认证）
    if (req.user) {
      requestInfo.userId = req.user.id;
      requestInfo.username = req.user.username;
    }
    
    const logData = {
      ...requestInfo,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      responseSize: Buffer.byteLength(data || ''),
      success: res.statusCode < 400
    };
    
    // 根据状态码确定日志级别
    let logLevel = 'info';
    if (res.statusCode >= 500) {
      logLevel = 'error';
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
    }
    
    // 记录访问日志
    logger.log(logLevel, 'HTTP Request', logData);
    
    // 记录操作日志到数据库（异步，不阻塞响应）
    if (req.user && shouldLogOperation(req)) {
      logOperationToDB(req, res, responseTime).catch(error => {
        logger.error('操作日志记录失败:', error);
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

// 判断是否需要记录操作日志
function shouldLogOperation(req) {
  // 不记录GET请求和健康检查
  if (req.method === 'GET' || req.url === '/health') {
    return false;
  }
  
  // 不记录认证相关的频繁操作
  if (req.url.includes('/auth/refresh')) {
    return false;
  }
  
  return true;
}

// 记录操作日志到数据库
async function logOperationToDB(req, res, responseTime) {
  try {
    const action = getActionFromRequest(req);
    const resourceType = getResourceTypeFromRequest(req);
    const resourceId = getResourceIdFromRequest(req);
    const description = getDescriptionFromRequest(req, action, resourceType);
    
    await executeQuery(`
      INSERT INTO operation_logs 
      (user_id, action, resource_type, resource_id, description, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      req.user.id,
      action,
      resourceType,
      resourceId,
      description,
      req.ip,
      req.get('User-Agent')
    ]);
  } catch (error) {
    logger.error('数据库操作日志记录失败:', error);
  }
}

// 从请求中提取操作类型
function getActionFromRequest(req) {
  const method = req.method.toLowerCase();
  const url = req.originalUrl || req.url;
  
  if (method === 'post') {
    if (url.includes('login')) return 'login';
    if (url.includes('logout')) return 'logout';
    if (url.includes('upload')) return 'upload';
    return 'create';
  } else if (method === 'put') {
    if (url.includes('audit')) return 'audit';
    if (url.includes('status')) return 'update_status';
    return 'update';
  } else if (method === 'delete') {
    return 'delete';
  } else if (method === 'get' && url.includes('export')) {
    return 'export';
  }
  
  return method;
}

// 从请求中提取资源类型
function getResourceTypeFromRequest(req) {
  const url = req.originalUrl || req.url;
  
  if (url.includes('/papers')) return 'paper';
  if (url.includes('/users')) return 'user';
  if (url.includes('/notifications')) return 'notification';
  if (url.includes('/departments')) return 'department';
  if (url.includes('/journals')) return 'journal';
  if (url.includes('/statistics')) return 'statistics';
  if (url.includes('/system')) return 'system';
  if (url.includes('/auth')) return 'auth';
  
  return 'unknown';
}

// 从请求中提取资源ID
function getResourceIdFromRequest(req) {
  // 尝试从URL参数中获取ID
  if (req.params.id) {
    return parseInt(req.params.id);
  }
  
  // 尝试从请求体中获取ID
  if (req.body && req.body.id) {
    return parseInt(req.body.id);
  }
  
  return null;
}

// 生成操作描述
function getDescriptionFromRequest(req, action, resourceType) {
  const descriptions = {
    'create_paper': '提交论文',
    'update_paper': '修改论文信息',
    'delete_paper': '删除论文',
    'audit_paper': '审核论文',
    'create_user': '创建用户',
    'update_user': '修改用户信息',
    'delete_user': '删除用户',
    'create_notification': '发布通知',
    'update_notification': '修改通知',
    'delete_notification': '删除通知',
    'login': '用户登录',
    'logout': '用户登出',
    'export': '导出数据',
    'upload': '上传文件'
  };
  
  const key = `${action}_${resourceType}`;
  return descriptions[key] || descriptions[action] || `执行${action}操作`;
}

// 性能监控日志
function performanceLogger(operation, duration, metadata = {}) {
  logger.info('Performance', {
    operation,
    duration: `${duration}ms`,
    ...metadata,
    timestamp: new Date().toISOString()
  });
  
  // 如果操作耗时超过阈值，记录警告
  if (duration > 1000) {
    logger.warn('Slow Operation', {
      operation,
      duration: `${duration}ms`,
      ...metadata
    });
  }
}

// 安全事件日志
function securityLogger(event, req, details = {}) {
  logger.warn('Security Event', {
    event,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl || req.url,
    method: req.method,
    user: req.user ? req.user.username : 'anonymous',
    timestamp: new Date().toISOString(),
    ...details
  });
}

// 业务日志记录器
function businessLogger(action, user, data = {}) {
  logger.info('Business Action', {
    action,
    userId: user.id,
    username: user.username,
    timestamp: new Date().toISOString(),
    ...data
  });
}

module.exports = {
  logger,
  requestLogger,
  performanceLogger,
  securityLogger,
  businessLogger
};