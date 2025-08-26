const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 导入数据库配置
const { testConnection, redisClient } = require('./config/database');

// 导入中间件
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const validator = require('./middleware/validator');
const { requestLogger, userOnlineTracker } = require('./middleware/realTimeMonitor');

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const paperRoutes = require('./routes/papers');
const journalRoutes = require('./routes/journals_simple');
const notificationRoutes = require('./routes/notifications');
const statisticsRoutes = require('./routes/statistics');
const systemRoutes = require('./routes/system');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// 创建必要的目录
const requiredDirs = [
  'uploads',
  'uploads/papers',
  'uploads/temp',
  'logs'
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录: ${dir}`);
  }
});

// 安全中间件
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      frameAncestors: [
        "'self'",
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://192.168.45.47:8080'
      ]
    },
  },
}));

// CORS配置
app.use(cors({
  origin: function (origin, callback) {
    // 允许的源
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      'http://192.168.45.47:8080'
    ];
    
    // 开发环境允许所有源
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 速率限制
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15分钟
  max: process.env.RATE_LIMIT_MAX || 100, // 限制每个IP 100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// 基础中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// 日志中间件
app.use(logger.requestLogger);

// 实时监控中间件
app.use(requestLogger);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware.authenticate, userOnlineTracker, userRoutes);
app.use('/api/papers', authMiddleware.authenticate, userOnlineTracker, paperRoutes);
app.use('/api/journals', authMiddleware.authenticate, userOnlineTracker, journalRoutes);
app.use('/api/notifications', authMiddleware.authenticate, userOnlineTracker, notificationRoutes);
app.use('/api/statistics', authMiddleware.authenticate, userOnlineTracker, statisticsRoutes);
app.use('/api/system', authMiddleware.authenticate, userOnlineTracker, systemRoutes);
app.use('/api/upload', authMiddleware.authenticate, userOnlineTracker, uploadRoutes);

// 静态文件服务（上传的文件）
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // 正确暴露文件名，避免中文乱码
    const fileName = path.basename(filePath)
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}; filename="${fileName}"`)
  }
}));

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    code: 404
  });
});

// 错误处理中间件
app.use(errorHandler.errorHandler);

// 优雅关闭处理
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  console.log(`收到 ${signal} 信号，开始优雅关闭...`);
  
  // 关闭HTTP服务器
  if (server) {
    server.close(() => {
      console.log('HTTP服务器已关闭');
    });
  }
  
  // 关闭Redis连接
  try {
    await redisClient.quit();
    console.log('Redis连接已关闭');
  } catch (error) {
    console.error('Redis关闭错误:', error);
  }
  
  // 退出进程
  process.exit(0);
}

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('数据库连接失败');
    }
    
    // 连接Redis（可选）
    try {
      await redisClient.connect();
    } catch (redisError) {
      console.warn('Redis连接失败，将使用内存缓存:', redisError.message);
    }
    
    // 启动HTTP服务器
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`
========================================
🚀 科研论文数据管理平台后端服务启动成功！
========================================
📡 本地访问: http://localhost:${PORT}
🌐 局域网访问: http://192.168.45.47:${PORT}
🗄️  数据库: MySQL (${process.env.DB_HOST}:${process.env.DB_PORT})
🔧 环境: ${process.env.NODE_ENV || 'development'}
📝 API文档: http://localhost:${PORT}/api-docs
⏰ 启动时间: ${new Date().toLocaleString()}
========================================
      `);
    });
    
    // 设置服务器超时
    server.timeout = 30000;
    
    global.server = server;
    return server;
    
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer();
}

module.exports = app;
