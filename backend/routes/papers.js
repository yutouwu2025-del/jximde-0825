const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { executeQuery, executeTransaction } = require('../config/database');
const { authorize, checkOwnership, checkPermission } = require('../middleware/auth');
const { 
  validatePaperCreate, 
  validatePaperUpdate, 
  validatePaperAudit, 
  validateBatchAudit,
  validatePaperQuery,
  validateId 
} = require('../middleware/validator');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { businessLogger, performanceLogger } = require('../middleware/logger');

const router = express.Router();

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/papers');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `paper-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx').split(',');
    const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new AppError(`不支持的文件类型，仅支持: ${allowedTypes.join(', ')}`, 400));
    }
  }
});

// 获取论文列表（支持多种查询条件）
router.get('/', catchAsync(async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    keyword = '',
    type = '',
    status = '',
    partition = '',
    year = null,
    department_id = null,
    user_id = null,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;
  
  const startTime = Date.now();
  const offset = (page - 1) * pageSize;
  
  // 构建查询条件
  let whereConditions = [];
  let queryParams = [];
  
  // 权限过滤：普通用户只能看自己的论文
  if (req.user.role === 'user') {
    whereConditions.push('p.user_id = ?');
    queryParams.push(req.user.id);
  }
  
  // 部门过滤：秘书只能看本部门的论文
  if (req.user.role === 'secretary' && req.user.departmentId) {
    whereConditions.push('u.department_id = ?');
    queryParams.push(req.user.departmentId);
  }
  
  // 搜索条件
  if (keyword) {
    whereConditions.push(`(
      p.title LIKE ? OR 
      p.first_author LIKE ? OR 
      p.journal_name LIKE ? OR
      p.keywords LIKE ?
    )`);
    const keywordPattern = `%${keyword}%`;
    queryParams.push(keywordPattern, keywordPattern, keywordPattern, keywordPattern);
  }
  
  if (type) {
    whereConditions.push('p.type = ?');
    queryParams.push(type);
  }
  
  if (status) {
    whereConditions.push('p.status = ?');
    queryParams.push(status);
  }
  
  if (partition) {
    whereConditions.push('p.partition_info LIKE ?');
    queryParams.push(`%${partition}%`);
  }
  
  if (year) {
    whereConditions.push('p.publish_year = ?');
    queryParams.push(year);
  }
  
  if (department_id) {
    whereConditions.push('u.department_id = ?');
    queryParams.push(department_id);
  }
  
  if (user_id) {
    whereConditions.push('p.user_id = ?');
    queryParams.push(user_id);
  }
  
  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';
  
  // 查询总数
  const countSQL = `
    SELECT COUNT(*) as total
    FROM papers p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    ${whereClause}
  `;
  
  // 查询数据
  const dataSQL = `
    SELECT 
      p.*,
      u.name as user_name,
      u.username,
      d.name as department_name,
      auditor.name as auditor_name
    FROM papers p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN users auditor ON p.auditor_id = auditor.id
    ${whereClause}
    ORDER BY p.${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;
  
  const [countResult, papers] = await Promise.all([
    executeQuery(countSQL, queryParams),
    executeQuery(dataSQL, [...queryParams, parseInt(pageSize), offset])
  ]);
  
  const total = countResult[0].total;
  
  // 处理authors字段（JSON字符串转对象）
  const processedPapers = papers.map(paper => ({
    ...paper,
    authors: paper.authors ? JSON.parse(paper.authors) : []
  }));
  
  performanceLogger('PAPERS_QUERY', Date.now() - startTime, {
    page, pageSize, total, resultCount: papers.length
  });
  
  res.json({
    success: true,
    data: {
      papers: processedPapers,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  });
}));

// 统计接口
router.get('/stats', catchAsync(async (req, res) => {
  const { type, year, dimension, department_id } = req.query;
  
  // 基础统计查询
  let whereConditions = [];
  let queryParams = [];
  
  // 权限过滤
  if (req.user.role === 'user') {
    whereConditions.push('p.user_id = ?');
    queryParams.push(req.user.id);
  } else if (req.user.role === 'secretary' && req.user.departmentId) {
    whereConditions.push('u.department_id = ?');
    queryParams.push(req.user.departmentId);
  }
  
  if (type) {
    whereConditions.push('p.type = ?');
    queryParams.push(type);
  }
  
  if (year) {
    whereConditions.push('p.publish_year = ?');
    queryParams.push(year);
  }
  
  if (department_id) {
    whereConditions.push('u.department_id = ?');
    queryParams.push(department_id);
  }
  
  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';
  
  // 获取基础统计数据
  const statsSQL = `
    SELECT 
      COUNT(*) as total_papers,
      COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_papers,
      COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_papers,
      COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as rejected_papers,
      COUNT(CASE WHEN p.partition_info LIKE '%Q1%' AND p.status = 'approved' THEN 1 END) as q1_papers,
      COUNT(CASE WHEN p.partition_info LIKE '%Q2%' AND p.status = 'approved' THEN 1 END) as q2_papers,
      COUNT(CASE WHEN p.partition_info LIKE '%Q3%' AND p.status = 'approved' THEN 1 END) as q3_papers,
      COUNT(CASE WHEN p.partition_info LIKE '%Q4%' AND p.status = 'approved' THEN 1 END) as q4_papers
    FROM papers p
    LEFT JOIN users u ON p.user_id = u.id
    ${whereClause}
  `;
  
  const [stats] = await executeQuery(statsSQL, queryParams);
  
  res.json({
    success: true,
    data: stats
  });
}));

// 我的论文接口
router.get('/my', catchAsync(async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    limit,
    sort = 'created_at',
    order = 'desc',
    status = '',
    type = '',
    year = '',
    keyword = ''
  } = req.query;
  
  // 如果有limit参数，说明是简单列表请求
  if (limit) {
    const limitValue = parseInt(limit) || 10;
    const limitSQL = `
      SELECT 
        p.*,
        u.name as user_name
      FROM papers p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `;
    
    const allPapers = await executeQuery(limitSQL, [req.user.id]);
    const papers = allPapers.slice(0, limitValue);
    
    return res.json({
      success: true,
      data: papers
    });
  }
  
  // 完整分页查询
  const offset = (page - 1) * pageSize;
  let whereConditions = ['p.user_id = ?'];
  let queryParams = [req.user.id];
  
  if (status) {
    whereConditions.push('p.status = ?');
    queryParams.push(status);
  }
  
  if (type) {
    whereConditions.push('p.type = ?');
    queryParams.push(type);
  }
  
  if (year) {
    whereConditions.push('p.publish_year = ?');
    queryParams.push(year);
  }
  
  if (keyword) {
    whereConditions.push(`(
      p.title LIKE ? OR 
      p.first_author LIKE ? OR 
      p.journal_name LIKE ?
    )`);
    const keywordPattern = `%${keyword}%`;
    queryParams.push(keywordPattern, keywordPattern, keywordPattern);
  }
  
  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
  
  // 查询总数
  const countSQL = `SELECT COUNT(*) as total FROM papers p ${whereClause}`;
  const [countResult] = await executeQuery(countSQL, queryParams);
  
  // 查询数据
  const dataSQL = `
    SELECT 
      p.*,
      u.name as user_name,
      COALESCE(a.name, '未审核') as auditor_name
    FROM papers p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN users a ON p.auditor_id = a.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  queryParams.push(parseInt(pageSize), offset);
  const papers = await executeQuery(dataSQL, queryParams);
  
  res.json({
    success: true,
    data: {
      papers,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: countResult.total,
        pages: Math.ceil(countResult.total / pageSize)
      }
    }
  });
}));

// 已批准论文接口
router.get('/approved', catchAsync(async (req, res) => {
  // 简化版本：直接查询已审核通过论文
  const dataSQL = `
    SELECT 
      p.id, p.title, p.first_author, p.journal_name, 
      p.type, p.status, p.partition_info, p.publish_year,
      p.created_at, p.audit_time,
      u.name as user_name,
      u.username,
      d.name as department_name
    FROM papers p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE p.status = 'approved'
    ORDER BY p.audit_time DESC
    LIMIT 20
  `;
  
  const papers = await executeQuery(dataSQL, []);
  
  res.json({
    success: true,
    data: {
      papers,
      pagination: {
        page: 1,
        pageSize: 20,
        total: papers.length,
        pages: 1
      }
    }
  });
}));

// 待审核论文接口
router.get('/pending', catchAsync(async (req, res) => {
  // 简化版本：直接查询待审核论文
  const dataSQL = `
    SELECT 
      p.id, p.title, p.first_author, p.journal_name, 
      p.type, p.status, p.created_at,
      u.name as user_name,
      u.username,
      d.name as department_name
    FROM papers p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE p.status = 'pending'
    ORDER BY p.created_at ASC
    LIMIT 20
  `;
  
  const papers = await executeQuery(dataSQL, []);
  
  res.json({
    success: true,
    data: {
      papers,
      pagination: {
        page: 1,
        pageSize: 20,
        total: papers.length,
        pages: 1
      }
    }
  });
}));

// 获取单个论文详情
router.get('/:id', 
  validateId, 
  checkOwnership('id', 'user_id', 'papers'), 
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const papers = await executeQuery(`
      SELECT 
        p.*,
        u.name as user_name,
        u.username,
        u.email as user_email,
        d.name as department_name,
        auditor.name as auditor_name
      FROM papers p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users auditor ON p.auditor_id = auditor.id
      WHERE p.id = ?
    `, [id]);
    
    if (papers.length === 0) {
      throw new AppError('论文不存在', 404);
    }
    
    const paper = papers[0];
    
    // 处理authors字段
    paper.authors = paper.authors ? JSON.parse(paper.authors) : [];
    
    res.json({
      success: true,
      data: paper
    });
  })
);

// 创建论文
router.post('/', 
  validatePaperCreate, 
  checkPermission('papers', 'create'),
  catchAsync(async (req, res) => {
    const paperData = {
      ...req.body,
      user_id: req.user.id,
      authors: JSON.stringify(req.body.authors),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await executeQuery(`
      INSERT INTO papers (
        title, authors, first_author, corresponding_author, 
        journal_name, journal_id, partition_info, publish_year, publish_date,
        volume, issue, pages, doi, abstract, keywords, type, 
        status, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      paperData.title,
      paperData.authors,
      paperData.first_author,
      paperData.corresponding_author,
      paperData.journal_name,
      paperData.journal_id || null,
      paperData.partition_info || null,
      paperData.publish_year,
      paperData.publish_date || null,
      paperData.volume || null,
      paperData.issue || null,
      paperData.pages || null,
      paperData.doi || null,
      paperData.abstract || null,
      paperData.keywords || null,
      paperData.type,
      paperData.status,
      paperData.user_id,
      paperData.created_at,
      paperData.updated_at
    ]);
    
    const paperId = result.insertId;
    
    businessLogger('PAPER_CREATED', req.user, { 
      paperId,
      title: paperData.title,
      status: paperData.status 
    });
    
    res.status(201).json({
      success: true,
      message: '论文创建成功',
      data: {
        id: paperId,
        ...paperData,
        authors: JSON.parse(paperData.authors)
      }
    });
  })
);

// 更新论文
router.put('/:id', 
  validateId,
  validatePaperUpdate,
  checkOwnership('id', 'user_id', 'papers'),
  checkPermission('papers', 'update'),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // 只有待审核和草稿状态的论文可以编辑
    const currentPaper = await executeQuery(
      'SELECT status FROM papers WHERE id = ?',
      [id]
    );
    
    if (currentPaper.length === 0) {
      throw new AppError('论文不存在', 404);
    }
    
    if (!['draft', 'pending'].includes(currentPaper[0].status)) {
      throw new AppError('只有草稿和待审核状态的论文可以编辑', 400);
    }
    
    // 处理authors字段
    if (updateData.authors) {
      updateData.authors = JSON.stringify(updateData.authors);
    }
    
    updateData.updated_at = new Date();
    
    // 构建更新SQL
    const updateFields = Object.keys(updateData).map(key => `${key} = ?`);
    const updateValues = Object.values(updateData);
    updateValues.push(id);
    
    await executeQuery(`
      UPDATE papers 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `, updateValues);
    
    businessLogger('PAPER_UPDATED', req.user, { 
      paperId: id,
      updatedFields: Object.keys(updateData)
    });
    
    res.json({
      success: true,
      message: '论文更新成功'
    });
  })
);

// 删除论文
router.delete('/:id', 
  validateId,
  checkOwnership('id', 'user_id', 'papers'),
  checkPermission('papers', 'delete'),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // 检查论文状态，已审核通过的不能删除
    const papers = await executeQuery(
      'SELECT status, file_path FROM papers WHERE id = ?',
      [id]
    );
    
    if (papers.length === 0) {
      throw new AppError('论文不存在', 404);
    }
    
    const paper = papers[0];
    
    if (paper.status === 'approved') {
      throw new AppError('已审核通过的论文不能删除', 400);
    }
    
    // 删除文件
    if (paper.file_path) {
      const filePath = path.join(__dirname, '../', paper.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // 删除数据库记录
    await executeQuery('DELETE FROM papers WHERE id = ?', [id]);
    
    businessLogger('PAPER_DELETED', req.user, { paperId: id });
    
    res.json({
      success: true,
      message: '论文删除成功'
    });
  })
);

// 论文审核
router.put('/:id/audit', 
  validateId,
  validatePaperAudit,
  authorize(['manager', 'admin']),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status, audit_comment } = req.body;
    
    // 检查论文是否存在且为待审核状态
    const papers = await executeQuery(
      'SELECT status FROM papers WHERE id = ?',
      [id]
    );
    
    if (papers.length === 0) {
      throw new AppError('论文不存在', 404);
    }
    
    if (papers[0].status !== 'pending') {
      throw new AppError('只有待审核状态的论文可以审核', 400);
    }
    
    // 更新审核状态
    await executeQuery(`
      UPDATE papers 
      SET status = ?, auditor_id = ?, audit_time = NOW(), 
          audit_comment = ?, updated_at = NOW()
      WHERE id = ?
    `, [status, req.user.id, audit_comment || null, id]);
    
    businessLogger('PAPER_AUDITED', req.user, { 
      paperId: id,
      auditResult: status,
      comment: audit_comment 
    });
    
    res.json({
      success: true,
      message: `论文${status === 'approved' ? '审核通过' : '审核拒绝'}`
    });
  })
);

// 批量审核
router.post('/batch-audit', 
  validateBatchAudit,
  authorize(['manager', 'admin']),
  catchAsync(async (req, res) => {
    const { paper_ids, status, audit_comment } = req.body;
    
    // 检查所有论文是否存在且为待审核状态
    const papers = await executeQuery(
      `SELECT id, status FROM papers WHERE id IN (${paper_ids.map(() => '?').join(',')})`,
      paper_ids
    );
    
    if (papers.length !== paper_ids.length) {
      throw new AppError('部分论文不存在', 400);
    }
    
    const invalidPapers = papers.filter(p => p.status !== 'pending');
    if (invalidPapers.length > 0) {
      throw new AppError('只有待审核状态的论文可以审核', 400);
    }
    
    // 批量更新
    await executeQuery(`
      UPDATE papers 
      SET status = ?, auditor_id = ?, audit_time = NOW(), 
          audit_comment = ?, updated_at = NOW()
      WHERE id IN (${paper_ids.map(() => '?').join(',')})
    `, [status, req.user.id, audit_comment || null, ...paper_ids]);
    
    businessLogger('PAPERS_BATCH_AUDITED', req.user, { 
      paperIds: paper_ids,
      auditResult: status,
      count: paper_ids.length 
    });
    
    res.json({
      success: true,
      message: `成功${status === 'approved' ? '通过' : '拒绝'}了 ${paper_ids.length} 篇论文`
    });
  })
);

// 上传论文文件
router.post('/:id/upload', 
  validateId,
  checkOwnership('id', 'user_id', 'papers'),
  upload.single('file'),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    if (!req.file) {
      throw new AppError('请选择要上传的文件', 400);
    }
    
    const filePath = `uploads/papers/${req.file.filename}`;
    const fileSize = req.file.size;
    const originalName = req.file.originalname;
    
    // 更新论文文件信息
    await executeQuery(`
      UPDATE papers 
      SET file_path = ?, file_name = ?, file_size = ?, updated_at = NOW()
      WHERE id = ?
    `, [filePath, originalName, fileSize, id]);
    
    businessLogger('PAPER_FILE_UPLOADED', req.user, { 
      paperId: id,
      fileName: originalName,
      fileSize 
    });
    
    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        filePath,
        fileName: originalName,
        fileSize
      }
    });
  })
);

// 下载论文文件
router.get('/:id/download', 
  validateId,
  checkOwnership('id', 'user_id', 'papers'),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const papers = await executeQuery(
      'SELECT file_path, file_name FROM papers WHERE id = ?',
      [id]
    );
    
    if (papers.length === 0) {
      throw new AppError('论文不存在', 404);
    }
    
    const paper = papers[0];
    
    if (!paper.file_path) {
      throw new AppError('论文文件不存在', 404);
    }
    
    const filePath = path.join(__dirname, '../', paper.file_path);
    
    if (!fs.existsSync(filePath)) {
      throw new AppError('文件不存在', 404);
    }
    
    businessLogger('PAPER_FILE_DOWNLOADED', req.user, { paperId: id });
    
    res.download(filePath, paper.file_name || 'paper.pdf');
  })
);

module.exports = router;