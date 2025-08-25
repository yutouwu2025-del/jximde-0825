const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { executeQuery } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { businessLogger } = require('../middleware/logger');

const router = express.Router();

// 确保上传目录存在
const ensureUploadDirs = () => {
  const dirs = [
    'uploads/papers',
    'uploads/temp',
    'uploads/avatars',
    'uploads/documents'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

// 通用文件存储配置
const createStorage = (subDir) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../uploads', subDir);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // 生成唯一文件名
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    }
  });
};

// 文件类型验证
const fileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new AppError(`不支持的文件类型，仅支持: ${allowedTypes.join(', ')}`, 400));
    }
  };
};

// 论文文件上传配置
const paperUpload = multer({
  storage: createStorage('papers'),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB
    files: 1
  },
  fileFilter: fileFilter(['pdf', 'doc', 'docx'])
});

// 文档文件上传配置
const documentUpload = multer({
  storage: createStorage('documents'),
  limits: {
    fileSize: 10485760, // 10MB
    files: 5
  },
  fileFilter: fileFilter(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'])
});

// 头像上传配置
const avatarUpload = multer({
  storage: createStorage('avatars'),
  limits: {
    fileSize: 2097152, // 2MB
    files: 1
  },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'gif'])
});

// 临时文件上传配置
const tempUpload = multer({
  storage: createStorage('temp'),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800,
    files: 10
  }
});

// 论文文件上传
router.post('/paper', paperUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      throw new AppError('请选择要上传的文件', 400);
    }
    
    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: `uploads/papers/${req.file.filename}`,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    };
    
    // 记录文件上传日志
    businessLogger('PAPER_FILE_UPLOADED', req.user, {
      filename: fileInfo.originalName,
      size: fileInfo.size
    });
    
    res.json({
      success: true,
      message: '文件上传成功',
      data: fileInfo
    });
    
  } catch (error) {
    // 清理上传失败的文件
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    throw error;
  }
});

// 文档文件上传（支持多文件）
router.post('/documents', documentUpload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError('请选择要上传的文件', 400);
    }
    
    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: `uploads/documents/${file.filename}`,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    }));
    
    businessLogger('DOCUMENTS_UPLOADED', req.user, {
      count: uploadedFiles.length,
      totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0)
    });
    
    res.json({
      success: true,
      message: `成功上传 ${uploadedFiles.length} 个文件`,
      data: uploadedFiles
    });
    
  } catch (error) {
    // 清理上传失败的文件
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    throw error;
  }
});

// 头像上传
router.post('/avatar', avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      throw new AppError('请选择头像文件', 400);
    }
    
    const avatarInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: `uploads/avatars/${req.file.filename}`,
      url: `/uploads/avatars/${req.file.filename}`
    };
    
    // 可以在这里更新用户头像URL到数据库
    // await executeQuery('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarInfo.url, req.user.id]);
    
    businessLogger('AVATAR_UPLOADED', req.user, {
      filename: avatarInfo.originalName
    });
    
    res.json({
      success: true,
      message: '头像上传成功',
      data: avatarInfo
    });
    
  } catch (error) {
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    throw error;
  }
});

// 临时文件上传
router.post('/temp', tempUpload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError('请选择要上传的文件', 400);
    }
    
    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: `uploads/temp/${file.filename}`,
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
    }));
    
    // 设置定时清理任务（在实际应用中应该使用专门的任务调度）
    setTimeout(() => {
      uploadedFiles.forEach(file => {
        const filePath = path.join(__dirname, '../', file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }, 24 * 60 * 60 * 1000); // 24小时
    
    res.json({
      success: true,
      message: '临时文件上传成功',
      data: uploadedFiles
    });
    
  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    throw error;
  }
});

// 获取文件信息
router.get('/info/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { type = 'papers' } = req.query;
    
    // 验证文件类型参数
    const allowedTypes = ['papers', 'documents', 'avatars', 'temp'];
    if (!allowedTypes.includes(type)) {
      throw new AppError('无效的文件类型', 400);
    }
    
    const filePath = path.join(__dirname, '../uploads', type, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new AppError('文件不存在', 404);
    }
    
    const stats = fs.statSync(filePath);
    const fileInfo = {
      filename,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      mimetype: getMimeType(filename),
      url: `/uploads/${type}/${filename}`
    };
    
    res.json({
      success: true,
      data: fileInfo
    });
    
  } catch (error) {
    throw error;
  }
});

// 下载文件
router.get('/download/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    // 验证文件类型参数
    const allowedTypes = ['papers', 'documents', 'avatars'];
    if (!allowedTypes.includes(type)) {
      throw new AppError('无效的文件类型', 400);
    }
    
    const filePath = path.join(__dirname, '../uploads', type, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new AppError('文件不存在', 404);
    }
    
    // 权限检查（根据文件类型）
    if (type === 'papers') {
      // 检查用户是否有权限下载该论文文件
      const papers = await executeQuery(
        'SELECT user_id FROM papers WHERE file_path LIKE ?',
        [`%${filename}%`]
      );
      
      if (papers.length > 0) {
        const paper = papers[0];
        // 只有论文作者或管理员可以下载
        if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.id !== paper.user_id) {
          throw new AppError('权限不足', 403);
        }
      }
    }
    
    businessLogger('FILE_DOWNLOADED', req.user, {
      filename,
      type
    });
    
    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    // 发送文件
    res.sendFile(filePath);
    
  } catch (error) {
    throw error;
  }
});

// 删除文件
router.delete('/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    // 验证文件类型参数
    const allowedTypes = ['papers', 'documents', 'avatars', 'temp'];
    if (!allowedTypes.includes(type)) {
      throw new AppError('无效的文件类型', 400);
    }
    
    const filePath = path.join(__dirname, '../uploads', type, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new AppError('文件不存在', 404);
    }
    
    // 权限检查
    if (type === 'papers') {
      const papers = await executeQuery(
        'SELECT user_id FROM papers WHERE file_path LIKE ?',
        [`%${filename}%`]
      );
      
      if (papers.length > 0) {
        const paper = papers[0];
        if (req.user.role !== 'admin' && req.user.id !== paper.user_id) {
          throw new AppError('权限不足', 403);
        }
      }
    }
    
    // 删除文件
    fs.unlinkSync(filePath);
    
    // 如果是论文文件，更新数据库记录
    if (type === 'papers') {
      await executeQuery(
        'UPDATE papers SET file_path = NULL, file_name = NULL, file_size = NULL WHERE file_path LIKE ?',
        [`%${filename}%`]
      );
    }
    
    businessLogger('FILE_DELETED', req.user, {
      filename,
      type
    });
    
    res.json({
      success: true,
      message: '文件删除成功'
    });
    
  } catch (error) {
    throw error;
  }
});

// 清理过期的临时文件
router.post('/cleanup/temp', async (req, res) => {
  try {
    // 只有管理员可以执行清理操作
    if (req.user.role !== 'admin') {
      throw new AppError('权限不足', 403);
    }
    
    const tempDir = path.join(__dirname, '../uploads/temp');
    const files = fs.readdirSync(tempDir);
    let deletedCount = 0;
    
    const now = Date.now();
    const expireTime = 24 * 60 * 60 * 1000; // 24小时
    
    files.forEach(filename => {
      const filePath = path.join(tempDir, filename);
      const stats = fs.statSync(filePath);
      
      // 删除超过24小时的文件
      if (now - stats.birthtime.getTime() > expireTime) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    businessLogger('TEMP_FILES_CLEANED', req.user, {
      deletedCount
    });
    
    res.json({
      success: true,
      message: `清理了 ${deletedCount} 个过期的临时文件`,
      data: {
        deletedCount
      }
    });
    
  } catch (error) {
    throw error;
  }
});

// 获取上传统计信息
router.get('/stats', async (req, res) => {
  try {
    const stats = {};
    const uploadTypes = ['papers', 'documents', 'avatars', 'temp'];
    
    for (const type of uploadTypes) {
      const dirPath = path.join(__dirname, '../uploads', type);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        let totalSize = 0;
        
        files.forEach(filename => {
          const filePath = path.join(dirPath, filename);
          const fileStats = fs.statSync(filePath);
          totalSize += fileStats.size;
        });
        
        stats[type] = {
          count: files.length,
          totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100 // MB
        };
      } else {
        stats[type] = { count: 0, totalSize: 0 };
      }
    }
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    throw error;
  }
});

// 辅助函数：根据文件名获取MIME类型
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = router;