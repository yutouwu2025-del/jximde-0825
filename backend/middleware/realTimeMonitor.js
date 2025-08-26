const { executeQuery } = require('../config/database');
const os = require('os');

// 全局监控数据存储
let monitoringData = {
  onlineUsers: new Set(),
  dailyVisits: 0,
  requestCount: 0,
  lastResetDate: new Date().toDateString(),
  startTime: Date.now()
};

// 在线用户管理
const userActivityTracker = {
  // 用户上线
  userOnline(userId, sessionId = null) {
    const userKey = sessionId || userId;
    monitoringData.onlineUsers.add(userKey);
    this.updateUserActivity(userId);
  },

  // 用户下线
  userOffline(userId, sessionId = null) {
    const userKey = sessionId || userId;
    monitoringData.onlineUsers.delete(userKey);
  },

  // 更新用户活动时间
  async updateUserActivity(userId) {
    try {
      await executeQuery(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('更新用户活动时间失败:', error);
    }
  },

  // 获取在线用户数
  getOnlineUserCount() {
    return monitoringData.onlineUsers.size;
  },

  // 清理过期的在线用户（可选，定期清理）
  cleanupInactiveUsers() {
    // 这里可以添加逻辑来清理长时间未活动的用户
    // 例如：超过30分钟无活动则认为已下线
  }
};

// 访问统计
const visitTracker = {
  // 记录新的访问
  recordVisit(req) {
    const today = new Date().toDateString();
    
    // 如果是新的一天，重置计数器
    if (monitoringData.lastResetDate !== today) {
      monitoringData.dailyVisits = 0;
      monitoringData.requestCount = 0;
      monitoringData.lastResetDate = today;
    }
    
    // 增加访问计数
    monitoringData.dailyVisits++;
    
    // 记录到数据库（异步，不影响请求响应）
    this.logVisitToDatabase(req).catch(err => {
      console.error('记录访问日志失败:', err);
    });
  },

  // 记录API请求
  recordRequest() {
    monitoringData.requestCount++;
  },

  // 获取今日访问数
  getDailyVisits() {
    return monitoringData.dailyVisits;
  },

  // 获取请求总数
  getRequestCount() {
    return monitoringData.requestCount;
  },

  // 获取QPS（每秒请求数）
  getQPS() {
    const uptimeSeconds = (Date.now() - monitoringData.startTime) / 1000;
    return uptimeSeconds > 0 ? Math.round(monitoringData.requestCount / uptimeSeconds) : 0;
  },

  // 将访问记录到数据库
  async logVisitToDatabase(req) {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userId = req.user ? req.user.id : null;
      
      await executeQuery(`
        INSERT INTO operation_logs (user_id, action, description, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        userId,
        'PAGE_VISIT',
        `访问页面: ${req.path}`,
        ipAddress,
        userAgent
      ]);
    } catch (error) {
      console.error('记录访问日志到数据库失败:', error);
    }
  }
};

// 系统资源监控
const systemMonitor = {
  // 获取CPU使用率
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - Math.floor(100 * idle / total);
    
    return Math.max(0, Math.min(100, usage));
  },

  // 获取内存使用情况
  getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      total: Math.round(totalMemory / 1024 / 1024 / 1024 * 100) / 100, // GB
      used: Math.round(usedMemory / 1024 / 1024 / 1024 * 100) / 100, // GB
      free: Math.round(freeMemory / 1024 / 1024 / 1024 * 100) / 100, // GB
      percentage: Math.round((usedMemory / totalMemory) * 100)
    };
  },

  // 获取系统负载
  getSystemLoad() {
    const loads = os.loadavg();
    return {
      load1: loads[0],
      load5: loads[1],
      load15: loads[2],
      percentage: Math.min(100, Math.round(loads[0] * 100 / os.cpus().length))
    };
  },

  // 获取系统运行时间
  getUptime() {
    return {
      system: os.uptime(), // 系统运行时间（秒）
      process: process.uptime(), // 进程运行时间（秒）
      formatted: this.formatUptime(process.uptime())
    };
  },

  // 格式化运行时间
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}天${hours}小时${minutes}分钟`;
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  },

  // 获取网络接口信息
  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = [];
    
    for (const name in interfaces) {
      const iface = interfaces[name];
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          result.push({
            name,
            address: alias.address,
            netmask: alias.netmask,
            mac: alias.mac
          });
        }
      }
    }
    
    return result;
  }
};

// 数据库连接监控
const databaseMonitor = {
  async getConnectionInfo() {
    try {
      const [processlist, status] = await Promise.all([
        executeQuery('SHOW PROCESSLIST'),
        executeQuery(`SHOW STATUS WHERE Variable_name IN (
          'Threads_connected', 'Threads_running', 'Max_used_connections',
          'Questions', 'Slow_queries', 'Uptime'
        )`)
      ]);
      
      const statusMap = status.reduce((acc, row) => {
        acc[row.Variable_name] = row.Value;
        return acc;
      }, {});
      
      return {
        connected: true,
        connections: processlist.length,
        threadsConnected: parseInt(statusMap.Threads_connected || 0),
        threadsRunning: parseInt(statusMap.Threads_running || 0),
        maxUsedConnections: parseInt(statusMap.Max_used_connections || 0),
        totalQuestions: parseInt(statusMap.Questions || 0),
        slowQueries: parseInt(statusMap.Slow_queries || 0),
        uptime: parseInt(statusMap.Uptime || 0),
        qps: statusMap.Uptime > 0 ? Math.round(statusMap.Questions / statusMap.Uptime) : 0
      };
    } catch (error) {
      console.error('获取数据库连接信息失败:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  },

  async getTableStats() {
    try {
      const tables = await executeQuery(`
        SELECT 
          TABLE_NAME as name,
          TABLE_ROWS as rows,
          ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as sizeMB,
          ENGINE as engine
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY sizeMB DESC
      `);
      
      return tables;
    } catch (error) {
      console.error('获取表统计失败:', error);
      return [];
    }
  }
};

// 中间件：记录API请求
const requestLogger = (req, res, next) => {
  visitTracker.recordRequest();
  
  // 如果是页面访问（非API请求）
  if (!req.path.startsWith('/api/')) {
    visitTracker.recordVisit(req);
  }
  
  next();
};

// 中间件：用户认证后记录在线状态
const userOnlineTracker = (req, res, next) => {
  if (req.user) {
    const sessionId = req.sessionID || req.headers['x-session-id'];
    userActivityTracker.userOnline(req.user.id, sessionId);
  }
  next();
};

// 获取完整的实时监控数据
const getRealTimeMonitorData = async () => {
  const memory = systemMonitor.getMemoryUsage();
  const uptime = systemMonitor.getUptime();
  const load = systemMonitor.getSystemLoad();
  const dbInfo = await databaseMonitor.getConnectionInfo();
  
  return {
    // 用户相关
    onlineUsers: userActivityTracker.getOnlineUserCount(),
    dailyVisits: visitTracker.getDailyVisits(),
    
    // 请求相关
    requestCount: visitTracker.getRequestCount(),
    qps: visitTracker.getQPS(),
    
    // 系统资源
    cpuUsage: systemMonitor.getCPUUsage(),
    memoryUsage: memory.percentage,
    memoryUsed: memory.used,
    memoryTotal: memory.total,
    systemLoad: load.percentage,
    
    // 运行时间
    uptime: uptime.formatted,
    uptimeSeconds: uptime.process,
    
    // 数据库
    databaseConnected: dbInfo.connected,
    databaseConnections: dbInfo.connections || 0,
    databaseQPS: dbInfo.qps || 0,
    slowQueries: dbInfo.slowQueries || 0,
    
    // 系统状态
    status: 'normal',
    lastUpdated: new Date().toISOString(),
    platform: os.platform(),
    nodeVersion: process.version
  };
};

module.exports = {
  userActivityTracker,
  visitTracker,
  systemMonitor,
  databaseMonitor,
  requestLogger,
  userOnlineTracker,
  getRealTimeMonitorData
};