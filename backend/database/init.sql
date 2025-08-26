-- 科研论文数据管理平台数据库初始化脚本
-- 注意：数据库创建和选择在migrate.js中处理

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT '部门名称',
    description TEXT COMMENT '部门描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB COMMENT='部门信息表';

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码（加密）',
    name VARCHAR(100) NOT NULL COMMENT '真实姓名',
    role ENUM('user', 'manager', 'secretary', 'admin') NOT NULL DEFAULT 'user' COMMENT '用户角色',
    department_id INT COMMENT '部门ID',
    email VARCHAR(100) COMMENT '邮箱地址',
    phone VARCHAR(20) COMMENT '联系电话',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '用户状态',
    last_login TIMESTAMP NULL COMMENT '最后登录时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_department (department_id),
    INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='用户信息表';

-- 期刊信息表
CREATE TABLE IF NOT EXISTS journals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    journal_id VARCHAR(100) NOT NULL COMMENT '期刊ID（来自中科院API）',
    name VARCHAR(200) NOT NULL COMMENT '期刊名称',
    issn VARCHAR(20) COMMENT 'ISSN号',
    eissn VARCHAR(20) COMMENT 'EISSN号',
    publisher VARCHAR(200) COMMENT '出版商',
    subject_categories TEXT COMMENT '学科分类',
    partition_2023 VARCHAR(10) COMMENT '2023年分区',
    partition_2022 VARCHAR(10) COMMENT '2022年分区',
    partition_2021 VARCHAR(10) COMMENT '2021年分区',
    impact_factor DECIMAL(8,3) COMMENT '影响因子',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_journal_id (journal_id),
    INDEX idx_name (name),
    INDEX idx_partition_2023 (partition_2023),
    FULLTEXT idx_search (name, publisher, subject_categories)
) ENGINE=InnoDB COMMENT='期刊信息表';

-- 论文表
CREATE TABLE IF NOT EXISTS papers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL COMMENT '论文标题',
    authors TEXT COMMENT '所有作者（JSON格式）',
    first_author VARCHAR(100) COMMENT '第一作者',
    corresponding_author VARCHAR(100) COMMENT '通讯作者',
    journal_name VARCHAR(200) COMMENT '期刊名称',
    journal_id VARCHAR(100) COMMENT '期刊ID',
    issn VARCHAR(20) COMMENT 'ISSN号',
    partition_info VARCHAR(50) COMMENT '分区信息',
    publish_year YEAR COMMENT '发表年份',
    publish_date DATE COMMENT '发表日期',
    volume VARCHAR(50) COMMENT '卷号',
    issue VARCHAR(50) COMMENT '期号',
    pages VARCHAR(50) COMMENT '页码',
    doi VARCHAR(200) COMMENT 'DOI号',
    abstract TEXT COMMENT '摘要',
    keywords VARCHAR(500) COMMENT '关键词',
    type ENUM('journal', 'conference', 'degree') DEFAULT 'journal' COMMENT '论文类型',
    file_path VARCHAR(500) COMMENT '文件路径',
    file_name VARCHAR(255) COMMENT '原始文件名',
    file_size INT COMMENT '文件大小（字节）',
    status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态',
    user_id INT NOT NULL COMMENT '提交用户ID',
    auditor_id INT COMMENT '审核人ID',
    audit_time TIMESTAMP NULL COMMENT '审核时间',
    audit_comment TEXT COMMENT '审核意见',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (auditor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_year (publish_year),
    INDEX idx_journal (journal_id),
    INDEX idx_audit (auditor_id, audit_time),
    FULLTEXT idx_search (title, first_author, journal_name, keywords)
) ENGINE=InnoDB COMMENT='论文信息表';

-- 通知公告表
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL COMMENT '通知标题',
    content TEXT NOT NULL COMMENT '通知内容',
    type ENUM('system', 'announcement', 'reminder') DEFAULT 'announcement' COMMENT '通知类型',
    status ENUM('draft', 'published') DEFAULT 'published' COMMENT '发布状态',
    author_id INT NOT NULL COMMENT '发布者ID',
    read_count INT DEFAULT 0 COMMENT '阅读次数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_author (author_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB COMMENT='通知公告表';

-- 用户通知阅读记录表
CREATE TABLE IF NOT EXISTS notification_reads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notification_id INT NOT NULL,
    user_id INT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_notification_user (notification_id, user_id),
    INDEX idx_user (user_id),
    INDEX idx_notification (notification_id)
) ENGINE=InnoDB COMMENT='通知阅读记录表';

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    description VARCHAR(255) COMMENT '配置描述',
    type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '值类型',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (config_key)
) ENGINE=InnoDB COMMENT='系统配置表';

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT COMMENT '操作用户ID',
    action VARCHAR(100) NOT NULL COMMENT '操作类型',
    resource_type VARCHAR(50) COMMENT '资源类型',
    resource_id INT COMMENT '资源ID',
    description VARCHAR(500) COMMENT '操作描述',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB COMMENT='操作日志表';

-- 注意：默认数据插入在migrate.js的seedDefaultData函数中处理

-- 创建视图：论文统计概览
CREATE VIEW paper_statistics AS
SELECT 
    p.user_id,
    u.name as user_name,
    u.department_id,
    d.name as department_name,
    COUNT(*) as total_papers,
    COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_papers,
    COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_papers,
    COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as rejected_papers,
    COUNT(CASE WHEN p.partition_info LIKE '%Q1%' AND p.status = 'approved' THEN 1 END) as q1_papers,
    COUNT(CASE WHEN p.partition_info LIKE '%Q2%' AND p.status = 'approved' THEN 1 END) as q2_papers
FROM papers p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN departments d ON u.department_id = d.id
GROUP BY p.user_id, u.name, u.department_id, d.name;