<template>
  <div class="system-monitor-container">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">系统监控</h1>
        <p class="page-description">实时监控系统运行状态和性能指标</p>
      </div>
      <div class="header-right">
        <el-button @click="refreshAll">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-switch 
          v-model="autoRefresh" 
          active-text="自动刷新"
          inactive-text="手动刷新"
          @change="toggleAutoRefresh"
        />
      </div>
    </div>
    
    <!-- 系统概览指标 -->
    <el-row :gutter="16" class="overview-cards">
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon server">
            <el-icon size="32"><Monitor /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-title">系统状态</div>
            <div class="metric-value">
              <el-tag :type="systemData.status === 'normal' ? 'success' : 'danger'" size="large">
                {{ systemData.status === 'normal' ? '正常运行' : '异常' }}
              </el-tag>
            </div>
            <div class="metric-desc">运行时间: {{ systemData.uptime }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon users">
            <el-icon size="32"><User /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-title">在线用户</div>
            <div class="metric-value">{{ systemData.onlineUsers }}</div>
            <div class="metric-desc">今日活跃: {{ systemData.activeUsers }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon performance">
            <el-icon size="32"><TrendCharts /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-title">响应时间</div>
            <div class="metric-value">{{ systemData.responseTime }}ms</div>
            <div class="metric-desc">
              <span :class="systemData.responseTrend === 'up' ? 'trend-up' : 'trend-down'">
                {{ systemData.responseTrend === 'up' ? '↑' : '↓' }} {{ systemData.responseTrendValue }}%
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon requests">
            <el-icon size="32"><DataLine /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-title">请求量</div>
            <div class="metric-value">{{ systemData.requestCount }}</div>
            <div class="metric-desc">QPS: {{ systemData.qps }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 详细监控面板 -->
    <el-row :gutter="16" class="detail-panels" style="margin-top: 20px;">
      <!-- 系统资源监控 -->
      <el-col :span="12">
        <el-card title="系统资源">
          <template #header>
            <div class="card-header">
              <span>系统资源</span>
              <el-button text @click="refreshSystemResources">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          
          <div class="resource-metrics">
            <div class="resource-item">
              <div class="resource-label">
                <el-icon><Cpu /></el-icon>
                CPU使用率
              </div>
              <div class="resource-progress">
                <el-progress 
                  :percentage="resourceData.cpuUsage" 
                  :color="getProgressColor(resourceData.cpuUsage)"
                  :show-text="true"
                />
              </div>
            </div>
            
            <div class="resource-item">
              <div class="resource-label">
                <el-icon><MemoryCard /></el-icon>
                内存使用率
              </div>
              <div class="resource-progress">
                <el-progress 
                  :percentage="resourceData.memoryUsage" 
                  :color="getProgressColor(resourceData.memoryUsage)"
                  :show-text="true"
                />
              </div>
              <div class="resource-detail">
                {{ resourceData.memoryUsed }}GB / {{ resourceData.memoryTotal }}GB
              </div>
            </div>
            
            <div class="resource-item">
              <div class="resource-label">
                <el-icon><FolderOpened /></el-icon>
                磁盘使用率
              </div>
              <div class="resource-progress">
                <el-progress 
                  :percentage="resourceData.diskUsage" 
                  :color="getProgressColor(resourceData.diskUsage)"
                  :show-text="true"
                />
              </div>
              <div class="resource-detail">
                {{ resourceData.diskUsed }}GB / {{ resourceData.diskTotal }}GB
              </div>
            </div>
            
            <div class="resource-item">
              <div class="resource-label">
                <el-icon><Connection /></el-icon>
                网络流量
              </div>
              <div class="network-info">
                <div class="network-item">
                  <span>入流量: {{ resourceData.networkIn }} MB/s</span>
                </div>
                <div class="network-item">
                  <span>出流量: {{ resourceData.networkOut }} MB/s</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 服务状态监控 -->
      <el-col :span="12">
        <el-card title="服务状态">
          <template #header>
            <div class="card-header">
              <span>服务状态</span>
              <el-button text @click="refreshServiceStatus">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          
          <div class="service-list">
            <div 
              v-for="service in serviceData" 
              :key="service.name" 
              class="service-item"
            >
              <div class="service-info">
                <div class="service-name">{{ service.name }}</div>
                <div class="service-desc">{{ service.description }}</div>
              </div>
              <div class="service-status">
                <el-tag 
                  :type="service.status === 'running' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ service.status === 'running' ? '正常' : '异常' }}
                </el-tag>
                <div class="service-metrics">
                  <span v-if="service.cpu !== undefined">CPU: {{ service.cpu }}%</span>
                  <span v-if="service.memory !== undefined">内存: {{ service.memory }}MB</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 数据库和缓存监控 -->
    <el-row :gutter="16" class="database-panels" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card title="数据库监控">
          <template #header>
            <div class="card-header">
              <span>MySQL数据库</span>
              <el-tag :type="databaseData.status === 'connected' ? 'success' : 'danger'" size="small">
                {{ databaseData.status === 'connected' ? '已连接' : '连接失败' }}
              </el-tag>
            </div>
          </template>
          
          <div class="database-metrics">
            <el-row :gutter="16">
              <el-col :span="8">
                <div class="db-metric">
                  <div class="db-metric-label">连接数</div>
                  <div class="db-metric-value">{{ databaseData.connections }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="db-metric">
                  <div class="db-metric-label">查询/秒</div>
                  <div class="db-metric-value">{{ databaseData.qps }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="db-metric">
                  <div class="db-metric-label">慢查询</div>
                  <div class="db-metric-value">{{ databaseData.slowQueries }}</div>
                </div>
              </el-col>
            </el-row>
            
            <div class="db-detail" style="margin-top: 15px;">
              <el-descriptions :column="2" size="small">
                <el-descriptions-item label="数据库版本">{{ databaseData.version }}</el-descriptions-item>
                <el-descriptions-item label="数据大小">{{ databaseData.dataSize }}</el-descriptions-item>
                <el-descriptions-item label="表数量">{{ databaseData.tableCount }}</el-descriptions-item>
                <el-descriptions-item label="索引大小">{{ databaseData.indexSize }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card title="Redis缓存">
          <template #header>
            <div class="card-header">
              <span>Redis缓存</span>
              <el-tag :type="cacheData.status === 'connected' ? 'success' : 'danger'" size="small">
                {{ cacheData.status === 'connected' ? '已连接' : '连接失败' }}
              </el-tag>
            </div>
          </template>
          
          <div class="cache-metrics">
            <el-row :gutter="16">
              <el-col :span="8">
                <div class="cache-metric">
                  <div class="cache-metric-label">命中率</div>
                  <div class="cache-metric-value">{{ cacheData.hitRate }}%</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="cache-metric">
                  <div class="cache-metric-label">键数量</div>
                  <div class="cache-metric-value">{{ cacheData.keyCount }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="cache-metric">
                  <div class="cache-metric-label">内存使用</div>
                  <div class="cache-metric-value">{{ cacheData.memoryUsage }}MB</div>
                </div>
              </el-col>
            </el-row>
            
            <div class="cache-detail" style="margin-top: 15px;">
              <el-descriptions :column="2" size="small">
                <el-descriptions-item label="Redis版本">{{ cacheData.version }}</el-descriptions-item>
                <el-descriptions-item label="运行模式">{{ cacheData.mode }}</el-descriptions-item>
                <el-descriptions-item label="已用内存">{{ cacheData.usedMemory }}</el-descriptions-item>
                <el-descriptions-item label="峰值内存">{{ cacheData.peakMemory }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 系统日志 -->
    <el-row class="log-panel" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card title="系统日志">
          <template #header>
            <div class="card-header">
              <span>系统日志</span>
              <div class="log-controls">
                <el-select v-model="logLevel" placeholder="日志级别" style="width: 120px; margin-right: 10px;">
                  <el-option label="全部" value="" />
                  <el-option label="INFO" value="INFO" />
                  <el-option label="WARN" value="WARN" />
                  <el-option label="ERROR" value="ERROR" />
                  <el-option label="DEBUG" value="DEBUG" />
                </el-select>
                <el-button @click="refreshLogs">刷新日志</el-button>
                <el-button @click="clearLogs">清空日志</el-button>
              </div>
            </div>
          </template>
          
          <div class="log-container">
            <div v-if="filteredLogs.length === 0" class="no-logs">
              暂无系统日志
            </div>
            <div v-else class="log-list">
              <div 
                v-for="log in filteredLogs" 
                :key="log.id" 
                :class="['log-item', `log-${log.level.toLowerCase()}`]"
              >
                <div class="log-time">{{ log.timestamp }}</div>
                <el-tag 
                  :type="getLogType(log.level)" 
                  size="small"
                  class="log-level"
                >
                  {{ log.level }}
                </el-tag>
                <div class="log-source">{{ log.source }}</div>
                <div class="log-message">{{ log.message }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import api from '../api/index'

// 响应式数据
const autoRefresh = ref(true)
const logLevel = ref('')
let refreshTimer = null

// 系统概览数据
const systemData = reactive({
  status: 'normal',
  uptime: '72小时30分钟',
  onlineUsers: 24,
  activeUsers: 156,
  responseTime: 145,
  responseTrend: 'down',
  responseTrendValue: 5.2,
  requestCount: 12847,
  qps: 45
})

// 系统资源数据
const resourceData = reactive({
  cpuUsage: 45,
  memoryUsage: 68,
  memoryUsed: 5.4,
  memoryTotal: 8.0,
  diskUsage: 72,
  diskUsed: 145,
  diskTotal: 200,
  networkIn: 2.3,
  networkOut: 1.8
})

// 服务状态数据
const serviceData = ref([
  {
    name: 'Node.js API Server',
    description: '主要API服务器',
    status: 'running',
    cpu: 23,
    memory: 256
  },
  {
    name: 'MySQL Database',
    description: '主数据库服务',
    status: 'running',
    cpu: 15,
    memory: 512
  },
  {
    name: 'Redis Cache',
    description: '缓存服务',
    status: 'running',
    cpu: 5,
    memory: 128
  },
  {
    name: 'File Upload Service',
    description: '文件上传服务',
    status: 'running',
    cpu: 8,
    memory: 64
  }
])

// 数据库监控数据
const databaseData = reactive({
  status: 'connected',
  connections: 12,
  qps: 45,
  slowQueries: 2,
  version: '8.0.28',
  dataSize: '2.3GB',
  tableCount: 15,
  indexSize: '456MB'
})

// 缓存监控数据
const cacheData = reactive({
  status: 'connected',
  hitRate: 94.5,
  keyCount: 1547,
  memoryUsage: 128,
  version: '6.2.6',
  mode: 'standalone',
  usedMemory: '128MB',
  peakMemory: '245MB'
})

// 系统日志数据
const systemLogs = ref([
  {
    id: 1,
    timestamp: '2024-01-25 14:30:25',
    level: 'INFO',
    source: 'API',
    message: '用户登录成功 - 用户ID: 123'
  },
  {
    id: 2,
    timestamp: '2024-01-25 14:29:15',
    level: 'WARN',
    source: 'SYSTEM',
    message: '内存使用率较高，当前68%'
  },
  {
    id: 3,
    timestamp: '2024-01-25 14:28:45',
    level: 'ERROR',
    source: 'DATABASE',
    message: '慢查询检测: SELECT * FROM papers WHERE... (执行时间: 2.5s)'
  },
  {
    id: 4,
    timestamp: '2024-01-25 14:27:30',
    level: 'INFO',
    source: 'SCHEDULER',
    message: '定时任务执行完成: 数据备份'
  },
  {
    id: 5,
    timestamp: '2024-01-25 14:26:10',
    level: 'DEBUG',
    source: 'CACHE',
    message: '缓存命中率统计: 94.5%'
  }
])

// 计算属性
const filteredLogs = computed(() => {
  if (!logLevel.value) return systemLogs.value
  return systemLogs.value.filter(log => log.level === logLevel.value)
})

// 工具函数
const getProgressColor = (percentage) => {
  if (percentage < 50) return '#67C23A'
  if (percentage < 80) return '#E6A23C'
  return '#F56C6C'
}

const getLogType = (level) => {
  const map = {
    INFO: '',
    WARN: 'warning',
    ERROR: 'danger',
    DEBUG: 'info'
  }
  return map[level] || ''
}

// 数据刷新方法
const refreshSystemData = async () => {
  try {
    const response = await api.get('/system/monitor/overview')
    Object.assign(systemData, response.data.data || {})
  } catch (error) {
    console.error('获取系统数据失败:', error)
    // 使用模拟数据
    Object.assign(systemData, {
      onlineUsers: Math.floor(Math.random() * 50) + 10,
      responseTime: Math.floor(Math.random() * 100) + 100,
      requestCount: Math.floor(Math.random() * 5000) + 10000,
      qps: Math.floor(Math.random() * 20) + 30
    })
  }
}

const refreshSystemResources = async () => {
  try {
    const response = await api.get('/system/monitor/resources')
    Object.assign(resourceData, response.data.data || {})
  } catch (error) {
    console.error('获取资源数据失败:', error)
    // 使用模拟数据
    Object.assign(resourceData, {
      cpuUsage: Math.floor(Math.random() * 60) + 20,
      memoryUsage: Math.floor(Math.random() * 40) + 50,
      diskUsage: Math.floor(Math.random() * 30) + 60,
      networkIn: (Math.random() * 5).toFixed(1),
      networkOut: (Math.random() * 3).toFixed(1)
    })
  }
}

const refreshServiceStatus = async () => {
  try {
    const response = await api.get('/system/monitor/services')
    serviceData.value = response.data.data || serviceData.value
  } catch (error) {
    console.error('获取服务状态失败:', error)
    // 模拟服务状态变化
    serviceData.value.forEach(service => {
      service.cpu = Math.floor(Math.random() * 30) + 5
      service.memory = service.memory + Math.floor(Math.random() * 20) - 10
    })
  }
}

const refreshDatabaseData = async () => {
  try {
    const response = await api.get('/system/monitor/database')
    Object.assign(databaseData, response.data.data || {})
  } catch (error) {
    console.error('获取数据库数据失败:', error)
    Object.assign(databaseData, {
      connections: Math.floor(Math.random() * 10) + 8,
      qps: Math.floor(Math.random() * 20) + 35,
      slowQueries: Math.floor(Math.random() * 5)
    })
  }
}

const refreshCacheData = async () => {
  try {
    const response = await api.get('/system/monitor/cache')
    Object.assign(cacheData, response.data.data || {})
  } catch (error) {
    console.error('获取缓存数据失败:', error)
    Object.assign(cacheData, {
      hitRate: (Math.random() * 10 + 90).toFixed(1),
      keyCount: Math.floor(Math.random() * 500) + 1200,
      memoryUsage: Math.floor(Math.random() * 50) + 100
    })
  }
}

const refreshLogs = async () => {
  try {
    const response = await api.get('/system/logs')
    systemLogs.value = response.data.data || systemLogs.value
  } catch (error) {
    console.error('获取系统日志失败:', error)
  }
}

const clearLogs = async () => {
  try {
    await api.delete('/system/logs')
    systemLogs.value = []
  } catch (error) {
    console.error('清空日志失败:', error)
  }
}

const refreshAll = async () => {
  await Promise.all([
    refreshSystemData(),
    refreshSystemResources(),
    refreshServiceStatus(),
    refreshDatabaseData(),
    refreshCacheData(),
    refreshLogs()
  ])
}

const toggleAutoRefresh = (value) => {
  if (value) {
    refreshTimer = setInterval(refreshAll, 30000) // 30秒自动刷新
  } else {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }
}

// 生命周期
onMounted(async () => {
  await refreshAll()
  if (autoRefresh.value) {
    refreshTimer = setInterval(refreshAll, 30000)
  }
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.system-monitor-container {
  padding: 24px;
  background: #f5f6fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.page-description {
  color: var(--text-secondary);
  font-size: 16px;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 概览卡片样式 */
.overview-cards {
  margin-bottom: 20px;
}

.metric-card {
  border-radius: 12px;
  overflow: hidden;
}

.metric-card .el-card__body {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.metric-icon.server { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.metric-icon.users { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.metric-icon.performance { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.metric-icon.requests { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

.metric-content {
  flex: 1;
}

.metric-title {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.metric-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.trend-up { color: #f56c6c; }
.trend-down { color: #67c23a; }

/* 卡片头部样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 系统资源样式 */
.resource-metrics {
  padding: 10px 0;
}

.resource-item {
  margin-bottom: 20px;
}

.resource-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.resource-progress {
  margin-bottom: 4px;
}

.resource-detail {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: right;
}

.network-info {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.network-item {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 服务列表样式 */
.service-list {
  padding: 10px 0;
}

.service-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.service-item:last-child {
  border-bottom: none;
}

.service-info {
  flex: 1;
}

.service-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.service-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.service-status {
  text-align: right;
}

.service-metrics {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.service-metrics span {
  margin-right: 8px;
}

/* 数据库和缓存样式 */
.db-metric, .cache-metric {
  text-align: center;
  padding: 12px;
  background: #f8f9ff;
  border-radius: 8px;
}

.db-metric-label, .cache-metric-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.db-metric-value, .cache-metric-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--text-primary);
}

/* 日志样式 */
.log-controls {
  display: flex;
  align-items: center;
}

.log-container {
  max-height: 400px;
  overflow-y: auto;
  background: #fafbfc;
  border-radius: 6px;
  padding: 12px;
}

.no-logs {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  background: white;
  border-left: 3px solid transparent;
  font-size: 13px;
}

.log-item.log-error { border-left-color: #f56c6c; }
.log-item.log-warn { border-left-color: #e6a23c; }
.log-item.log-info { border-left-color: #409eff; }
.log-item.log-debug { border-left-color: #909399; }

.log-time {
  font-family: monospace;
  color: var(--text-tertiary);
  width: 140px;
  flex-shrink: 0;
}

.log-level {
  width: 50px;
  flex-shrink: 0;
}

.log-source {
  width: 80px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  color: var(--text-primary);
}
</style>