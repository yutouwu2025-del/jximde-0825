const fs = require('fs');
const path = require('path');
const { executeQuery, executeTransaction } = require('../config/database');

async function createPiTables() {
  try {
    console.log('🚀 开始创建专利/软著数据表...');
    
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, '../database/pi-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 分割SQL语句（按分号分割，忽略空行）
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 找到 ${sqlStatements.length} 个SQL语句`);
    
    // 执行每个SQL语句
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      console.log(`⏳ 执行语句 ${i + 1}/${sqlStatements.length}...`);
      
      try {
        await executeQuery(statement);
        console.log(`✅ 语句 ${i + 1} 执行成功`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  语句 ${i + 1} - 表已存在，跳过`);
        } else {
          console.error(`❌ 语句 ${i + 1} 执行失败:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('');
    console.log('🎉 专利/软著数据表创建完成！');
    console.log('');
    console.log('📋 已创建的表:');
    console.log('  - patents (专利表)');
    console.log('  - copyrights (软件著作权表)');
    console.log('  - pi_statistics (专利/软著统计视图)');
    console.log('');
    console.log('✨ 数据库准备就绪，可以开始使用专利/软著功能！');
    
  } catch (error) {
    console.error('❌ 创建专利/软著数据表失败:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createPiTables()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error.message);
      process.exit(1);
    });
}

module.exports = createPiTables;