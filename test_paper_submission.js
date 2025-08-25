const mysql = require('mysql2/promise');

// 测试论文提交数据库写入
async function testPaperSubmission() {
  console.log('开始测试论文提交数据库写入...');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'research_paper_db'
  });
  
  try {
    // 1. 查看papers表结构
    console.log('\n1. 检查papers表结构:');
    const [columns] = await connection.execute('DESCRIBE papers');
    console.table(columns.map(col => ({
      字段: col.Field,
      类型: col.Type,
      可否为空: col.Null,
      键: col.Key,
      默认值: col.Default
    })));
    
    // 2. 查看当前论文数量
    console.log('\n2. 查看当前论文数量:');
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM papers');
    console.log(`当前数据库中有 ${countResult[0].count} 篇论文`);
    
    // 3. 查看最近的论文提交记录
    console.log('\n3. 查看最近5篇论文提交记录:');
    const [recentPapers] = await connection.execute(`
      SELECT id, title, first_author, journal_name, file_name, status, created_at 
      FROM papers 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (recentPapers.length > 0) {
      console.table(recentPapers.map(paper => ({
        ID: paper.id,
        标题: paper.title.substring(0, 30) + (paper.title.length > 30 ? '...' : ''),
        第一作者: paper.first_author,
        期刊: paper.journal_name,
        文件名: paper.file_name || '无',
        状态: paper.status,
        创建时间: paper.created_at
      })));
    } else {
      console.log('暂无论文记录');
    }
    
    // 4. 检查文件上传目录
    console.log('\n4. 检查上传目录:');
    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(__dirname, 'backend', 'uploads', 'papers');
    
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      console.log(`uploads/papers目录存在，包含 ${files.length} 个文件`);
      if (files.length > 0) {
        console.log('最近上传的文件:');
        files.slice(-5).forEach(file => {
          const filePath = path.join(uploadDir, file);
          const stats = fs.statSync(filePath);
          console.log(`- ${file} (${Math.round(stats.size/1024)}KB, ${stats.mtime.toLocaleString()})`);
        });
      }
    } else {
      console.log('uploads/papers目录不存在');
    }
    
    console.log('\n✅ 数据库连接测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await connection.end();
  }
}

// 运行测试
testPaperSubmission();