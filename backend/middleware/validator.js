const Joi = require('joi');

// 通用验证错误处理
const handleValidationError = (error, req, res, next) => {
  if (error.isJoi) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context.value
    }));
    
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors,
      code: 400
    });
  }
  next(error);
};

// 创建验证中间件
const createValidator = (schema, target = 'body') => {
  return (req, res, next) => {
    const data = req[target];
    const { error, value } = schema.validate(data, { abortEarly: false });
    
    if (error) {
      return handleValidationError(error, req, res, next);
    }
    
    req[target] = value;
    next();
  };
};

// 用户相关验证模式
const userSchemas = {
  // 用户注册/创建
  create: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': '用户名只能包含字母和数字',
        'string.min': '用户名至少3个字符',
        'string.max': '用户名最多30个字符',
        'any.required': '用户名为必填项'
      }),
    password: Joi.string()
      .min(6)
      .max(50)
      .required()
      .messages({
        'string.min': '密码至少6个字符',
        'string.max': '密码最多50个字符',
        'any.required': '密码为必填项'
      }),
    name: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': '姓名至少2个字符',
        'string.max': '姓名最多50个字符',
        'any.required': '姓名为必填项'
      }),
    role: Joi.string()
      .valid('user', 'manager', 'secretary', 'admin')
      .default('user')
      .messages({
        'any.only': '角色必须是user、manager、secretary或admin之一'
      }),
    department_id: Joi.number().integer().positive().allow(null),
    email: Joi.string().email().max(100).allow('').messages({
      'string.email': '请输入有效的邮箱地址'
    }),
    phone: Joi.string().max(20).allow('')
  }),
  
  // 用户更新
  update: Joi.object({
    name: Joi.string().min(2).max(50),
    role: Joi.string().valid('user', 'manager', 'secretary', 'admin'),
    department_id: Joi.number().integer().positive().allow(null),
    email: Joi.string().email().max(100).allow(''),
    phone: Joi.string().max(20).allow(''),
    status: Joi.string().valid('active', 'inactive')
  }).min(1), // 至少需要一个字段
  
  // 用户登录
  login: Joi.object({
    username: Joi.string().required().messages({
      'any.required': '请输入用户名'
    }),
    password: Joi.string().required().messages({
      'any.required': '请输入密码'
    }),
    remember: Joi.boolean().optional()
  }),
  
  // 密码重置
  resetPassword: Joi.object({
    newPassword: Joi.string().min(6).max(50).required().messages({
      'string.min': '新密码至少6个字符',
      'string.max': '新密码最多50个字符',
      'any.required': '新密码为必填项'
    })
  })
};

// 论文相关验证模式
const paperSchemas = {
  // 论文创建/提交
  create: Joi.object({
    title: Joi.string()
      .min(5)
      .max(500)
      .required()
      .messages({
        'string.min': '论文标题至少5个字符',
        'string.max': '论文标题最多500个字符',
        'any.required': '论文标题为必填项'
      }),
    authors: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        institution: Joi.string().allow(''),
        email: Joi.string().email().allow('')
      })
    ).min(1).required().messages({
      'array.min': '至少需要一个作者',
      'any.required': '作者信息为必填项'
    }),
    first_author: Joi.string().max(100).required(),
    corresponding_author: Joi.string().max(100).required(),
    journal_name: Joi.string().max(200).required(),
    journal_id: Joi.string().max(100).allow(''),
    partition_info: Joi.string().max(50).allow(''),
    publish_year: Joi.number()
      .integer()
      .min(1900)
      .max(new Date().getFullYear() + 1)
      .required(),
    publish_date: Joi.date().max('now').allow(null),
    volume: Joi.string().max(50).allow(''),
    issue: Joi.string().max(50).allow(''),
    pages: Joi.string().max(50).allow(''),
    doi: Joi.string().max(200).allow(''),
    abstract: Joi.string().max(2000).allow(''),
    keywords: Joi.string().max(500).allow(''),
    type: Joi.string()
      .valid('journal', 'conference', 'degree')
      .default('journal'),
    status: Joi.string()
      .valid('draft', 'pending')
      .default('pending')
  }),
  
  // 论文更新
  update: Joi.object({
    title: Joi.string().min(5).max(500),
    authors: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        institution: Joi.string().allow(''),
        email: Joi.string().email().allow('')
      })
    ).min(1),
    first_author: Joi.string().max(100),
    corresponding_author: Joi.string().max(100),
    journal_name: Joi.string().max(200),
    journal_id: Joi.string().max(100).allow(''),
    partition_info: Joi.string().max(50).allow(''),
    publish_year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1),
    publish_date: Joi.date().max('now').allow(null),
    volume: Joi.string().max(50).allow(''),
    issue: Joi.string().max(50).allow(''),
    pages: Joi.string().max(50).allow(''),
    doi: Joi.string().max(200).allow(''),
    abstract: Joi.string().max(2000).allow(''),
    keywords: Joi.string().max(500).allow(''),
    type: Joi.string().valid('journal', 'conference', 'degree'),
    status: Joi.string().valid('draft', 'pending')
  }).min(1),
  
  // 论文审核
  audit: Joi.object({
    status: Joi.string()
      .valid('approved', 'rejected')
      .required()
      .messages({
        'any.only': '审核状态必须是approved或rejected',
        'any.required': '审核状态为必填项'
      }),
    audit_comment: Joi.string().max(1000).allow('').messages({
      'string.max': '审核意见最多1000个字符'
    })
  }),
  
  // 批量审核
  batchAudit: Joi.object({
    paper_ids: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required()
      .messages({
        'array.min': '至少选择一篇论文',
        'any.required': '论文ID列表为必填项'
      }),
    status: Joi.string().valid('approved', 'rejected').required(),
    audit_comment: Joi.string().max(1000).allow('')
  })
};

// 通知相关验证模式
const notificationSchemas = {
  create: Joi.object({
    title: Joi.string()
      .min(2)
      .max(200)
      .required()
      .messages({
        'string.min': '通知标题至少2个字符',
        'string.max': '通知标题最多200个字符',
        'any.required': '通知标题为必填项'
      }),
    content: Joi.string()
      .min(5)
      .max(5000)
      .required()
      .messages({
        'string.min': '通知内容至少5个字符',
        'string.max': '通知内容最多5000个字符',
        'any.required': '通知内容为必填项'
      }),
    type: Joi.string()
      .valid('system', 'announcement', 'reminder')
      .default('announcement'),
    status: Joi.string()
      .valid('draft', 'published')
      .default('published')
  }),
  
  update: Joi.object({
    title: Joi.string().min(2).max(200),
    content: Joi.string().min(5).max(5000),
    type: Joi.string().valid('system', 'announcement', 'reminder'),
    status: Joi.string().valid('draft', 'published')
  }).min(1)
};

// 查询参数验证模式
const querySchemas = {
  // 分页查询
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('id'),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC')
  }),
  
  // 论文查询
  paperQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    keyword: Joi.string().max(200).allow(''),
    type: Joi.string().valid('journal', 'conference', 'degree').allow(''),
    status: Joi.string().valid('draft', 'pending', 'approved', 'rejected').allow(''),
    partition: Joi.string().valid('Q1', 'Q2', 'Q3', 'Q4').allow(''),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).allow(null),
    department_id: Joi.number().integer().positive().allow(null),
    user_id: Joi.number().integer().positive().allow(null),
    sortBy: Joi.string().default('created_at'),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC')
  }),
  
  // 统计查询
  statisticsQuery: Joi.object({
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).allow(null),
    startDate: Joi.date().allow(null),
    endDate: Joi.date().min(Joi.ref('startDate')).allow(null),
    department_id: Joi.number().integer().positive().allow(null),
    type: Joi.string().valid('journal', 'conference', 'degree').allow(''),
    dimension: Joi.string().valid('year', 'department', 'person', 'partition').default('year')
  })
};

// 系统配置验证模式
const systemSchemas = {
  updateConfig: Joi.object({
    system_name: Joi.string().max(100),
    file_upload_limit: Joi.number().integer().min(1024).max(104857600), // 1KB - 100MB
    audit_period: Joi.number().integer().min(1).max(365),
    email_notification: Joi.boolean(),
    maintenance_mode: Joi.boolean()
  }).min(1)
};

// 部门验证模式
const departmentSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': '部门名称至少2个字符',
        'string.max': '部门名称最多100个字符',
        'any.required': '部门名称为必填项'
      }),
    description: Joi.string().max(500).allow('')
  }),
  
  update: Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().max(500).allow('')
  }).min(1)
};

// 导出验证中间件
const validators = {
  // 用户相关
  validateUserCreate: createValidator(userSchemas.create),
  validateUserUpdate: createValidator(userSchemas.update),
  validateUserLogin: createValidator(userSchemas.login),
  validatePasswordReset: createValidator(userSchemas.resetPassword),
  
  // 论文相关
  validatePaperCreate: createValidator(paperSchemas.create),
  validatePaperUpdate: createValidator(paperSchemas.update),
  validatePaperAudit: createValidator(paperSchemas.audit),
  validateBatchAudit: createValidator(paperSchemas.batchAudit),
  
  // 通知相关
  validateNotificationCreate: createValidator(notificationSchemas.create),
  validateNotificationUpdate: createValidator(notificationSchemas.update),
  
  // 查询参数
  validatePagination: createValidator(querySchemas.pagination, 'query'),
  validatePaperQuery: createValidator(querySchemas.paperQuery, 'query'),
  validateStatisticsQuery: createValidator(querySchemas.statisticsQuery, 'query'),
  
  // 系统相关
  validateSystemConfig: createValidator(systemSchemas.updateConfig),
  
  // 部门相关
  validateDepartmentCreate: createValidator(departmentSchemas.create),
  validateDepartmentUpdate: createValidator(departmentSchemas.update),
  
  // 自定义验证器
  validateId: createValidator(Joi.object({
    id: Joi.number().integer().positive().required()
  }), 'params'),
  
  validateIds: createValidator(Joi.object({
    ids: Joi.array().items(Joi.number().integer().positive()).min(1).required()
  }))
};

module.exports = {
  ...validators,
  createValidator,
  handleValidationError
};