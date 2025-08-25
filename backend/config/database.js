const mysql = require('mysql2');
const redis = require('redis');
require('dotenv').config();

// MySQL连接池配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'research_paper_db',
  charset: 'utf8mb4',
  timezone: '+08:00',
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  debug: false
};

// 创建连接池
const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// Redis连接配置
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  lazyConnect: true
});

// Redis连接错误处理
redisClient.on('error', (err) => {
  console.log('Redis连接错误:', err);
});

redisClient.on('connect', () => {
  console.log('Redis连接成功');
});

// 数据库连接测试
async function testConnection() {
  try {
    const [rows] = await promisePool.execute('SELECT 1 as test');
    console.log('MySQL数据库连接成功');
    return true;
  } catch (error) {
    console.error('MySQL数据库连接失败:', error);
    return false;
  }
}

// 通用查询执行函数
async function executeQuery(sql, params = []) {
  try {
    const [rows] = await promisePool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

// 事务处理函数
async function executeTransaction(queries) {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { sql, params } of queries) {
      const [rows] = await connection.execute(sql, params || []);
      results.push(rows);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    console.error('事务执行错误:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Redis缓存操作封装
const cache = {
  // 设置缓存
  async set(key, value, expire = 3600) {
    try {
      const data = typeof value === 'object' ? JSON.stringify(value) : value;
      if (expire > 0) {
        await redisClient.setEx(key, expire, data);
      } else {
        await redisClient.set(key, data);
      }
      return true;
    } catch (error) {
      console.error('缓存设置错误:', error);
      return false;
    }
  },

  // 获取缓存
  async get(key) {
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      console.error('缓存获取错误:', error);
      return null;
    }
  },

  // 删除缓存
  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('缓存删除错误:', error);
      return false;
    }
  },

  // 清空所有缓存
  async flush() {
    try {
      await redisClient.flushDb();
      return true;
    } catch (error) {
      console.error('缓存清空错误:', error);
      return false;
    }
  }
};

// 分页查询辅助函数
function buildPaginationQuery(baseSQL, page = 1, pageSize = 10, orderBy = 'id DESC') {
  const offset = (page - 1) * pageSize;
  const limitSQL = `${baseSQL} ORDER BY ${orderBy} LIMIT ${pageSize} OFFSET ${offset}`;
  const countSQL = `SELECT COUNT(*) as total FROM (${baseSQL}) as count_table`;
  
  return { limitSQL, countSQL };
}

// 查询构建器
class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.selectFields = '*';
    this.whereConditions = [];
    this.joinClauses = [];
    this.orderByClause = '';
    this.limitClause = '';
    this.params = [];
  }

  select(fields) {
    this.selectFields = fields;
    return this;
  }

  where(condition, value) {
    this.whereConditions.push(condition);
    if (value !== undefined) {
      this.params.push(value);
    }
    return this;
  }

  join(table, on) {
    this.joinClauses.push(`INNER JOIN ${table} ON ${on}`);
    return this;
  }

  leftJoin(table, on) {
    this.joinClauses.push(`LEFT JOIN ${table} ON ${on}`);
    return this;
  }

  orderBy(field, direction = 'ASC') {
    this.orderByClause = `ORDER BY ${field} ${direction}`;
    return this;
  }

  limit(count, offset = 0) {
    this.limitClause = `LIMIT ${count} OFFSET ${offset}`;
    return this;
  }

  build() {
    let sql = `SELECT ${this.selectFields} FROM ${this.table}`;
    
    if (this.joinClauses.length > 0) {
      sql += ` ${this.joinClauses.join(' ')}`;
    }
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.orderByClause) {
      sql += ` ${this.orderByClause}`;
    }
    
    if (this.limitClause) {
      sql += ` ${this.limitClause}`;
    }
    
    return { sql, params: this.params };
  }

  async execute() {
    const { sql, params } = this.build();
    return await executeQuery(sql, params);
  }
}

module.exports = {
  pool,
  promisePool,
  redisClient,
  testConnection,
  executeQuery,
  executeTransaction,
  cache,
  buildPaginationQuery,
  QueryBuilder
};