#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  multipleStatements: true
};

const dbName = process.env.DB_NAME || 'research_paper_db';

async function createDatabase() {
  console.log('📊 开始创建数据库...');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 创建数据库


    // await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
       await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 ${dbName} 创建成功`);
    
    // 选择数据库 - 使用query而不是execute来避免prepared statement限制
    await connection.query(`USE \`${dbName}\``);
    
    return connection;
  } catch (error) {
    await connection.end();
    throw error;
  }
}

async function executeSQLFile(connection, filePath) {
  console.log(`📄 执行SQL文件: ${filePath}`);
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // 改进的SQL语句分割逻辑
    const statements = [];
    let currentStatement = '';
    const lines = sqlContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过注释行和空行
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // 如果行以分号结尾，说明语句结束
      if (trimmedLine.endsWith(';')) {
        const statement = currentStatement.trim();
        if (statement && !statement.startsWith('--')) {
          statements.push(statement);
        }
        currentStatement = '';
      }
    }
    
    // 处理最后一个没有分号的语句
    if (currentStatement.trim() && !currentStatement.trim().startsWith('--')) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`📝 解析到 ${statements.length} 条SQL语句`);
    
    let executedCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`🔧 执行语句: ${statement.substring(0, 50)}...`);
          
          // 对于DDL语句使用query，对于DML语句使用execute
          if (statement.trim().toUpperCase().startsWith('CREATE') || 
              statement.trim().toUpperCase().startsWith('DROP') || 
              statement.trim().toUpperCase().startsWith('ALTER') ||
              statement.trim().toUpperCase().startsWith('USE')) {
            await connection.query(statement);
          } else {
            await connection.execute(statement);
          }
          executedCount++;
          console.log(`✅ 语句执行成功`);
        } catch (error) {
          console.warn(`⚠️  语句执行警告: ${error.message}`);
          console.warn(`语句内容: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    console.log(`✅ 成功执行 ${executedCount} 条SQL语句`);
  } catch (error) {
    console.error(`❌ 执行SQL文件失败: ${error.message}`);
    throw error;
  }
}

async function seedDefaultData(connection) {
  console.log('🌱 开始插入默认数据...');
  
  try {
    // 检查是否已经有数据
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    if (users[0].count > 0) {
      console.log('📋 数据库已存在数据，跳过默认数据插入');
      return;
    }
    
    // 插入默认部门
    await connection.execute(`
      INSERT INTO departments (name, description) VALUES 
      ('计算机部', '计算机科学与技术研究'),
      ('人工智能部', '人工智能与机器学习研究'),
      ('数据科学部', '大数据分析与数据挖掘'),
      ('软件工程部', '软件开发与系统架构'),
      ('管理部门', '行政管理与运营支持')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    
    // 插入默认管理员用户（密码都是 '123456'，BCrypt加密）
    const bcrypt = require('bcrypt');
    const defaultPassword = await bcrypt.hash('123456', 10);
    
    await connection.execute(`
      INSERT INTO users (username, password, name, role, department_id, email, status) VALUES 
      ('admin', ?, '系统管理员', 'admin', 5, 'admin@example.com', 'active'),
      ('manager1', ?, '论文管理员', 'manager', 1, 'manager@example.com', 'active'),
      ('secretary1', ?, '课题组秘书', 'secretary', 2, 'secretary@example.com', 'active'),
      ('researcher1', ?, '科研人员', 'user', 1, 'researcher@example.com', 'active')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, [defaultPassword, defaultPassword, defaultPassword, defaultPassword]);
    
    // 插入系统配置
    await connection.execute(`
      INSERT INTO system_configs (config_key, config_value, description, type) VALUES 
      ('system_name', '科研论文数据管理平台', '系统名称', 'string'),
      ('file_upload_limit', '52428800', '文件上传限制（字节）', 'number'),
      ('audit_period', '7', '论文审核周期（天）', 'number'),
      ('email_notification', 'true', '邮件通知开关', 'boolean'),
      ('maintenance_mode', 'false', '维护模式', 'boolean')
      ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)
    `);
    
    // 插入示例通知
    await connection.execute(`
      INSERT INTO notifications (title, content, type, status, author_id) VALUES 
      ('欢迎使用科研论文数据管理平台', '欢迎使用本系统！请仔细阅读用户手册，如有问题请联系管理员。', 'announcement', 'published', 1)
      ON DUPLICATE KEY UPDATE title = VALUES(title)
    `);
    
    console.log('✅ 默认数据插入成功');
    console.log('🔐 默认账户信息:');
    console.log('   管理员: admin / 123456');
    console.log('   论文管理员: manager1 / 123456');
    console.log('   课题组秘书: secretary1 / 123456');
    console.log('   科研人员: researcher1 / 123456');
    
  } catch (error) {
    console.error(`❌ 插入默认数据失败: ${error.message}`);
    throw error;
  }
}

async function createIndexes(connection) {
  console.log('🏗️  创建索引...');
  
  const indexes = [
    // 用户表索引
    'CREATE INDEX idx_users_role_status ON users(role, status)',
    'CREATE INDEX idx_users_department_status ON users(department_id, status)',
    
    // 论文表索引
    'CREATE INDEX idx_papers_status_created ON papers(status, created_at)',
    'CREATE INDEX idx_papers_user_status ON papers(user_id, status)',
    'CREATE INDEX idx_papers_type_year ON papers(type, publish_year)',
    'CREATE INDEX idx_papers_audit ON papers(auditor_id, audit_time)',
    'CREATE INDEX idx_papers_issn ON papers(issn)',
    
    // 通知表索引
    'CREATE INDEX idx_notifications_status_created ON notifications(status, created_at)',
    'CREATE INDEX idx_notifications_type_status ON notifications(type, status)',
    
    // 日志表索引
    'CREATE INDEX idx_operation_logs_user_action ON operation_logs(user_id, action)',
    'CREATE INDEX idx_operation_logs_created ON operation_logs(created_at)',
    
    // 期刊表索引
    'CREATE INDEX idx_journals_name ON journals(name)',
    'CREATE INDEX idx_journals_partition ON journals(partition_2023)'
  ];
  
  let createdCount = 0;
  
  for (const indexSQL of indexes) {
    try {
      // CREATE INDEX是DDL语句，使用query方法
      await connection.query(indexSQL);
      createdCount++;
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        // 索引已存在，忽略
        continue;
      }
      console.warn(`⚠️  创建索引警告: ${error.message}`);
    }
  }
  
  console.log(`✅ 成功创建 ${createdCount} 个索引`);
}

async function verifyMigration(connection) {
  console.log('🔍 验证数据库迁移...');
  
  const tables = [
    'users', 'departments', 'papers', 'journals', 
    'notifications', 'notification_reads', 
    'system_configs', 'operation_logs'
  ];
  
  for (const table of tables) {
    try {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`✅ 表 ${table}: ${rows[0].count} 条记录`);
    } catch (error) {
      console.error(`❌ 验证表 ${table} 失败: ${error.message}`);
      throw error;
    }
  }
  
  // 检查视图
  try {
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM paper_statistics');
    console.log(`✅ 视图 paper_statistics: ${rows[0].count} 条记录`);
  } catch (error) {
    console.warn(`⚠️  视图 paper_statistics 可能不存在: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 开始数据库迁移...');
  console.log(`📍 目标数据库: ${dbConfig.host}:${dbConfig.port}/${dbName}`);
  
  let connection;
  
  try {
    // 1. 创建数据库连接
    connection = await createDatabase();
    
    // 2. 执行数据库初始化脚本
    const initSQLPath = path.join(__dirname, '../database/init.sql');
    if (fs.existsSync(initSQLPath)) {
      await executeSQLFile(connection, initSQLPath);
    } else {
      console.log('📄 init.sql文件不存在，跳过表结构创建');
    }
    
    // 3. 创建额外的索引
    await createIndexes(connection);
    
    // 4. 插入默认数据
    await seedDefaultData(connection);
    
    // 5. 验证迁移结果
    await verifyMigration(connection);
    
    console.log('🎉 数据库迁移完成！');
    
  } catch (error) {
    console.error('💥 数据库迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createDatabase,
  executeSQLFile,
  seedDefaultData,
  createIndexes,
  verifyMigration
};