#!/usr/bin/env node

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  multipleStatements: true
};

const dbName = process.env.DB_NAME || 'research_paper_db';

async function ensureIssnColumn() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${dbName}\``);

    // 检查列是否存在
    const [rows] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'papers' AND COLUMN_NAME = 'issn'`,
      [dbName]
    );
    const exists = rows[0].cnt > 0;

    if (!exists) {
      console.log('🔧 正在为 papers 表新增列 issn...');
      await conn.query(`ALTER TABLE papers ADD COLUMN issn VARCHAR(20) NULL AFTER journal_id`);
      console.log('✅ 已新增列 issn');
    } else {
      console.log('ℹ️ 列 issn 已存在，跳过新增');
    }

    // 创建索引（如果不存在）
    try {
      await conn.query(`CREATE INDEX idx_papers_issn ON papers(issn)`);
      console.log('✅ 已创建索引 idx_papers_issn');
    } catch (e) {
      if (e && e.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ 索引 idx_papers_issn 已存在，跳过创建');
      } else {
        console.warn('⚠️ 创建索引 idx_papers_issn 警告:', e.message);
      }
    }

  } catch (err) {
    console.error('❌ 执行失败:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

ensureIssnColumn();





