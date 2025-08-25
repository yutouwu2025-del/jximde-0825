const winston = require('winston');

// 配置日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 数据库错误处理
function handleDatabaseError(error) {
  let message = '数据库操作失败';
  let statusCode = 500;
  
  // MySQL错误码处理
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      message = '数据已存在，不能重复添加';
      statusCode = 409;
      break;
    case 'ER_NO_REFERENCED_ROW_2':
      message = '关联数据不存在';
      statusCode = 400;
      break;
    case 'ER_ROW_IS_REFERENCED_2':
      message = '数据正在被使用，无法删除';
      statusCode = 400;
      break;
    case 'ER_DATA_TOO_LONG':
      message = '数据长度超出限制';
      statusCode = 400;
      break;
    case 'ER_BAD_NULL_ERROR':
      message = '必填字段不能为空';
      statusCode = 400;
      break;
    case 'ER_PARSE_ERROR':
      message = 'SQL语法错误';
      statusCode = 500;
      break;
    case 'ECONNREFUSED':
      message = '数据库连接被拒绝';
      statusCode = 503;
      break;
    case 'ETIMEDOUT':
      message = '数据库连接超时';
      statusCode = 504;
      break;
    default:
      if (error.sqlMessage) {
        message = `数据库错误: ${error.sqlMessage}`;
      }
  }
  
  return new AppError(message, statusCode, true);
}

// JWT错误处理
function handleJWTError(error) {
  let message = '认证失败';
  
  if (error.name === 'JsonWebTokenError') {
    message = '无效的认证令牌';
  } else if (error.name === 'TokenExpiredError') {
    message = '认证令牌已过期';
  } else if (error.name === 'NotBeforeError') {
    message = '认证令牌尚未生效';
  }
  
  return new AppError(message, 401, true);
}

// 验证错误处理
function handleValidationError(error) {
  let message = '数据验证失败';
  
  // Joi验证错误
  if (error.isJoi) {
    const details = error.details.map(detail => detail.message).join(', ');
    message = `验证错误: ${details}`;
  }
  
  // Express-validator错误
  if (error.array && typeof error.array === 'function') {
    const errors = error.array();
    const messages = errors.map(err => `${err.param}: ${err.msg}`);
    message = `验证错误: ${messages.join(', ')}`;
  }
  
  return new AppError(message, 400, true);
}

// 文件上传错误处理
function handleMulterError(error) {
  let message = '文件上传失败';
  let statusCode = 400;
  
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      message = '文件大小超出限制';
      break;
    case 'LIMIT_FILE_COUNT':
      message = '文件数量超出限制';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = '不支持的文件字段';
      break;
    case 'LIMIT_PART_COUNT':
      message = '文件部分数量超出限制';
      break;
    case 'LIMIT_FIELD_KEY':
      message = '字段名长度超出限制';
      break;
    case 'LIMIT_FIELD_VALUE':
      message = '字段值长度超出限制';
      break;
    case 'LIMIT_FIELD_COUNT':
      message = '字段数量超出限制';
      break;
    default:
      if (error.message.includes('ENOENT')) {
        message = '上传目录不存在';
        statusCode = 500;
      }
  }
  
  return new AppError(message, statusCode, true);
}

// 发送错误响应
function sendErrorResponse(res, error) {
  const { statusCode, message, stack } = error;
  
  // 构建错误响应
  const errorResponse = {
    success: false,
    message,
    code: statusCode,
    timestamp: new Date().toISOString()
  };
  
  // 开发环境添加堆栈信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = stack;
  }
  
  res.status(statusCode).json(errorResponse);
}

// 全局错误处理中间件
function errorHandler(error, req, res, next) {
  let err = { ...error };
  err.message = error.message;
  
  // 记录错误日志
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'anonymous'
  });
  
  // 处理不同类型的错误
  if (error.code && error.code.startsWith('ER_')) {
    err = handleDatabaseError(error);
  } else if (error.name && error.name.includes('JsonWebToken')) {
    err = handleJWTError(error);
  } else if (error.isJoi || (error.array && typeof error.array === 'function')) {
    err = handleValidationError(error);
  } else if (error.code && error.code.startsWith('LIMIT_')) {
    err = handleMulterError(error);
  } else if (error.type === 'entity.parse.failed') {
    err = new AppError('JSON格式错误', 400, true);
  } else if (error.type === 'entity.too.large') {
    err = new AppError('请求体过大', 413, true);
  }
  
  // 如果不是已知的操作错误，设为服务器内部错误
  if (!err.isOperational) {
    err = new AppError('服务器内部错误', 500, false);
  }
  
  sendErrorResponse(res, err);
}

// 捕获未处理的异步错误
function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404错误处理
function notFoundHandler(req, res, next) {
  const err = new AppError(`请求的路径 ${req.originalUrl} 不存在`, 404);
  next(err);
}

module.exports = {
  AppError,
  errorHandler,
  catchAsync,
  notFoundHandler,
  logger
};