#!/usr/bin/env node

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'research_paper_db'
};

async function updatePasswords() {
  console.log('🔐 开始更新用户密码...');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 生成新密码的哈希
    const newPassword = '123456';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // 更新所有演示用户的密码
    const usernames = ['admin', 'manager1', 'secretary1', 'researcher1'];
    
    for (const username of usernames) {
      const [result] = await connection.execute(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, username]
      );
      
      if (result.affectedRows > 0) {
        console.log(`✅ 已更新用户 ${username} 的密码`);
      } else {
        console.log(`⚠️  用户 ${username} 不存在，跳过`);
      }
    }
    
    console.log('✅ 密码更新完成！');
    console.log('🔑 所有演示账户密码已设置为: 123456');
    
  } catch (error) {
    console.error('❌ 密码更新失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 运行更新
updatePasswords().catch(console.error);