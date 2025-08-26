# 科研论文数据管理平台 - 后端技术方案文档

## 📋 项目概述

基于Node.js + Express + MySQL的科研论文数据管理平台后端API服务，提供完整的RESTful API接口，支持用户认证、权限管理、论文全流程管理、数据统计分析等功能。

## 🛠 技术栈

### 核心技术
- **Node.js 18+** - JavaScript运行环境
- **Express 4.18+** - Web应用框架
- **MySQL 8.0+** - 关系型数据库
- **Redis 7.0+** - 缓存数据库（可选）
- **JWT** - 用户认证和授权

### 核心依赖
- **mysql2** - MySQL数据库驱动
- **bcrypt** - 密码加密
- **jsonwebtoken** - JWT令牌生成和验证
- **multer** - 文件上传处理
- **axios** - HTTP客户端（调用第三方API）
- **joi** - 数据验证
- **winston** - 日志记录
- **helmet** - 安全中间件
- **cors** - 跨域资源共享
- **express-rate-limit** - 请求频率限制

## 📁 项目结构

```
backend/
├── config/                    # 配置文件
│   └── database.js           # 数据库配置和连接
├── middleware/               # 中间件
│   ├── auth.js              # 认证和权限中间件
│   ├── errorHandler.js      # 错误处理中间件
│   ├── logger.js            # 日志记录中间件
│   └── validator.js         # 数据验证中间件
├── routes/                   # 路由文件
│   ├── auth.js              # 认证相关路由
│   ├── users.js             # 用户管理路由
│   ├── papers.js            # 论文管理路由
│   ├── journals.js          # 期刊管理路由
│   ├── notifications.js     # 通知公告路由
│   ├── statistics.js        # 数据统计路由
│   ├── system.js            # 系统管理路由
│   └── upload.js            # 文件上传路由
├── database/                # 数据库脚本
│   └── init.sql             # 数据库初始化脚本
├── scripts/                 # 工具脚本
│   ├── migrate.js           # 数据库迁移脚本
│   └── seed.js              # 数据种子脚本
├── uploads/                 # 文件上传目录
│   ├── papers/              # 论文文件
│   ├── documents/           # 文档文件
│   ├── avatars/             # 头像文件
│   └── temp/                # 临时文件
├── logs/                    # 日志文件目录
├── .env                     # 环境变量配置
├── app.js                   # 应用入口文件
└── package.json             # 项目配置文件
```

## 🗄️ 数据库设计

### 核心数据表

#### 1. 用户表 (users)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('user', 'manager', 'secretary', 'admin') NOT NULL,
    department_id INT,
    email VARCHAR(100),
    phone VARCHAR(20),
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. 论文表 (papers)
```sql
CREATE TABLE papers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    authors TEXT,
    first_author VARCHAR(100),
    corresponding_author VARCHAR(100),
    journal_name VARCHAR(200),
    journal_id VARCHAR(100),
    partition_info VARCHAR(50),
    publish_year YEAR,
    type ENUM('journal', 'conference', 'degree') DEFAULT 'journal',
    file_path VARCHAR(500),
    status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'pending',
    user_id INT NOT NULL,
    auditor_id INT,
    audit_time TIMESTAMP NULL,
    audit_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3. 期刊表 (journals)
```sql
CREATE TABLE journals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    journal_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    issn VARCHAR(20),
    publisher VARCHAR(200),
    partition_2023 VARCHAR(10),
    impact_factor DECIMAL(8,3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 权限角色设计

| 角色 | 权限说明 |
|------|----------|
| **user** | 普通用户：论文提交、我的论文管理、数据统计查看 |
| **manager** | 论文管理员：论文审核、论文数据库管理、全部用户功能 |
| **secretary** | 课题组秘书：论文审核、通知公告管理、数据统计导出 |
| **admin** | 系统管理员：系统管理、用户管理、全部功能权限 |

## 🔌 API接口设计

### 接口规范
- **基础URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **请求格式**: JSON
- **响应格式**: JSON

### 统一响应结构
```json
{
  "success": boolean,
  "message": string,
  "data": any,
  "code": number,
  "timestamp": string
}
```

### 核心接口模块

#### 1. 认证接口 (/api/auth)
```
POST   /login              # 用户登录
POST   /refresh            # 刷新令牌
POST   /logout             # 用户登出
GET    /me                 # 获取当前用户信息
PUT    /password           # 修改密码
```

#### 2. 用户管理接口 (/api/users)
```
GET    /                   # 获取用户列表
GET    /:id                # 获取用户详情
POST   /                   # 创建用户
PUT    /:id                # 更新用户信息
DELETE /:id                # 删除用户
GET    /departments/list   # 获取部门列表
POST   /departments        # 创建部门
```

#### 3. 论文管理接口 (/api/papers)
```
GET    /                   # 获取论文列表（支持筛选）
GET    /:id                # 获取论文详情
POST   /                   # 创建论文
PUT    /:id                # 更新论文信息
DELETE /:id                # 删除论文
PUT    /:id/audit          # 论文审核
POST   /batch-audit        # 批量审核
POST   /:id/upload         # 上传论文文件
GET    /:id/download       # 下载论文文件
```

#### 4. 期刊管理接口 (/api/journals)
```
GET    /search             # 期刊搜索（中科院API）
GET    /:id                # 获取期刊详情
GET    /years/available    # 获取可用年份
GET    /categories/list    # 获取学科分类
```

#### 5. 统计分析接口 (/api/statistics)
```
GET    /overview           # 概览统计
GET    /trends             # 趋势分析
GET    /by-department      # 按部门统计
GET    /personal/:userId   # 个人统计
GET    /rankings           # 排行榜
GET    /export             # 导出统计数据
```

#### 6. 通知公告接口 (/api/notifications)
```
GET    /                   # 获取通知列表
GET    /:id                # 获取通知详情
POST   /                   # 创建通知
PUT    /:id                # 更新通知
DELETE /:id                # 删除通知
POST   /:id/read           # 标记为已读
GET    /unread/count       # 未读数量
```

## 🔐 安全机制

### 1. 认证和授权
- **JWT令牌认证**：无状态认证机制
- **角色权限控制**：基于RBAC的权限管理
- **令牌黑名单**：支持令牌注销功能

### 2. 数据安全
- **密码加密**：使用bcrypt加盐哈希
- **SQL注入防护**：参数化查询
- **XSS防护**：输入验证和转义

### 3. 接口安全
- **请求频率限制**：防止暴力攻击
- **CORS配置**：跨域请求控制
- **Helmet安全头**：HTTP安全头设置

### 4. 文件安全
- **文件类型验证**：仅允许指定格式
- **文件大小限制**：防止大文件攻击
- **路径安全检查**：防止路径遍历

## 📊 性能优化

### 1. 数据库优化
- **索引优化**：关键字段添加索引
- **查询优化**：避免N+1查询
- **连接池管理**：数据库连接复用

### 2. 缓存策略
- **Redis缓存**：热点数据缓存
- **查询结果缓存**：减少数据库压力
- **期刊API缓存**：减少第三方API调用

### 3. 文件处理
- **文件流处理**：大文件上传优化
- **临时文件清理**：定时清理过期文件

## 🔧 环境配置

### 环境变量配置 (.env)
```bash
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=research_paper_db

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 文件上传配置
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=pdf,doc,docx

# 中科院期刊API配置
JOURNAL_API_BASE_URL=https://webapi.fenqubiao.com
JOURNAL_API_USER=imdeJCRfq
JOURNAL_API_PASSWORD=imde2012
```

### 数据库初始化
```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env

# 3. 初始化数据库
npm run db:migrate

# 4. 启动服务
npm run dev
```

## 🚀 部署指南

### 1. 开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test
```
  ###
### 2. 生产环境

#### Docker部署
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

#### PM2部署
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start app.js --name paper-management-api

# 设置开机自启
pm2 startup
pm2 save
```

### 3. Nginx配置
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📈 监控和日志

### 1. 日志系统
- **Winston日志框架**：分级日志记录
- **访问日志**：记录所有API请求
- **错误日志**：记录系统错误和异常
- **业务日志**：记录关键业务操作

### 2. 监控指标
- **系统状态监控**：CPU、内存、磁盘使用率
- **数据库监控**：连接数、查询性能
- **API性能监控**：响应时间、成功率
- **用户行为监控**：登录、操作统计

## 🧪 测试策略

### 1. 单元测试
```javascript
// 示例：用户认证测试
describe('Auth Service', () => {
  test('should authenticate valid user', async () => {
    const user = await authService.login('admin', 'password');
    expect(user.username).toBe('admin');
  });
});
```

### 2. 集成测试
```javascript
// 示例：API集成测试
describe('Papers API', () => {
  test('GET /api/papers should return papers list', async () => {
    const response = await request(app)
      .get('/api/papers')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## 🔄 第三方集成

### 中科院期刊分区API
```javascript
// 期刊搜索接口集成
const searchJournals = async (keyword, year) => {
  const response = await axios.get('/api/v2/user/search', {
    params: {
      keyword,
      year,
      user: process.env.JOURNAL_API_USER,
      password: process.env.JOURNAL_API_PASSWORD
    }
  });
  
  return response.data;
};
```

## 🛡️ 错误处理

### 错误分类
- **4xx客户端错误**：参数错误、权限不足
- **5xx服务器错误**：数据库错误、系统异常

### 错误响应格式
```json
{
  "success": false,
  "message": "具体错误信息",
  "code": 400,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 📚 开发规范

### 1. 代码风格
- 使用ESLint进行代码检查
- 遵循JavaScript标准代码风格
- 统一错误处理和响应格式

### 2. API设计规范
- RESTful接口设计
- 统一的请求/响应格式
- 合理的HTTP状态码使用

### 3. 数据库规范
- 规范的表结构设计
- 合理的索引设置
- 数据库版本管理

## 🔧 故障排查

### 常见问题
1. **数据库连接失败**：检查数据库服务状态和配置
2. **JWT令牌过期**：检查token有效期设置
3. **文件上传失败**：检查上传目录权限和文件大小限制
4. **第三方API调用失败**：检查网络连接和API密钥

### 调试工具
- 使用Postman测试API接口
- 查看应用日志文件
- 使用数据库监控工具

## 📞 技术支持

### 开发环境要求
- Node.js 18+
- MySQL 8.0+
- Redis 7.0+ (可选)

### 相关文档
- [API接口文档](./docs/api.md)
- [数据库设计文档](./docs/database.md)
- [部署指南](./docs/deployment.md)

---

**项目交付说明**: 本后端项目已完整实现产品需求中的所有功能模块，提供了稳定可靠的API服务，支持完整的用户权限管理、论文全流程处理、第三方API集成、数据统计分析等功能。代码结构清晰，安全性能优异，可直接部署到生产环境使用。