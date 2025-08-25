<template>
  <div class="dashboard-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">工作台</h1>
      <p class="page-description">欢迎使用科研论文数据管理平台，{{ greeting }}！</p>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="24" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stats-card primary">
          <div class="stats-icon">
            <el-icon size="32"><Document /></el-icon>
          </div>
          <div class="stats-content">
            <div class="stats-number">{{ dashboardStats.totalPapers }}</div>
            <div class="stats-label">我的论文总数</div>
            <div class="stats-trend">
              <el-icon><TrendCharts /></el-icon>
              <span>本月 +{{ dashboardStats.monthlyIncrease }}</span>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stats-card success">
          <div class="stats-icon">
            <el-icon size="32"><Check /></el-icon>
          </div>
          <div class="stats-content">
            <div class="stats-number">{{ dashboardStats.approvedPapers }}</div>
            <div class="stats-label">已通过审核</div>
            <div class="stats-trend">
              <el-icon><TrendCharts /></el-icon>
              <span>通过率 {{ dashboardStats.approvalRate }}%</span>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stats-card warning">
          <div class="stats-icon">
            <el-icon size="32"><Clock /></el-icon>
          </div>
          <div class="stats-content">
            <div class="stats-number">{{ dashboardStats.pendingPapers }}</div>
            <div class="stats-label">待审核论文</div>
            <div class="stats-trend">
              <el-icon><Warning /></el-icon>
              <span>需要关注</span>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stats-card info">
          <div class="stats-icon">
            <el-icon size="32"><Star /></el-icon>
          </div>
          <div class="stats-content">
            <div class="stats-number">{{ dashboardStats.highQualityPapers }}</div>
            <div class="stats-label">高质量论文</div>
            <div class="stats-trend">
              <el-icon><TrendCharts /></el-icon>
              <span>Q1/Q2区论文</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 内容区域 -->
    <el-row :gutter="24">
      <!-- 左侧内容 -->
      <el-col :xs="24" :lg="16">
        <!-- 快速操作 -->
        <div class="card quick-actions-card">
          <div class="card-title">
            <el-icon><Lightning /></el-icon>
            快速操作
          </div>
          <el-row :gutter="16" class="quick-actions">
            <el-col :xs="12" :sm="8" :md="6" v-for="action in quickActions" :key="action.name">
              <div class="quick-action-item" @click="handleQuickAction(action)">
                <el-icon class="action-icon" :style="{ color: action.color }">
                  <component :is="action.icon" />
                </el-icon>
                <span class="action-label">{{ action.label }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
        
        <!-- 最近论文 -->
        <div class="card recent-papers-card">
          <div class="card-title">
            <el-icon><Document /></el-icon>
            最近论文
            <el-button text type="primary" class="view-more" @click="$router.push('/my-papers')">
              查看更多
            </el-button>
          </div>
          
          <el-table :data="recentPapers" style="width: 100%" v-loading="loading">
            <el-table-column prop="title" label="论文标题" min-width="200">
              <template #default="{ row }">
                <div class="paper-title">{{ row.title }}</div>
                <div class="paper-journal">{{ row.journal }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag 
                  :type="getStatusType(row.status)" 
                  size="small"
                >
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="提交时间" width="120">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="viewPaper(row)">
                  查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
      
      <!-- 右侧内容 -->
      <el-col :xs="24" :lg="8">
        <!-- 通知公告 -->
        <div class="card notifications-card">
          <div class="card-title">
            <el-icon><Bell /></el-icon>
            通知公告
            <el-button text type="primary" class="view-more" @click="$router.push('/notifications')">
              查看更多
            </el-button>
          </div>
          
          <div class="notification-list">
            <div 
              v-for="notification in recentNotifications" 
              :key="notification.id"
              class="notification-item"
            >
              <div class="notification-header">
                <h4>{{ notification.title }}</h4>
                <span class="notification-time">{{ formatDate(notification.created_at) }}</span>
              </div>
              <p class="notification-content">{{ notification.content }}</p>
            </div>
            
            <el-empty v-if="recentNotifications.length === 0" description="暂无通知" />
          </div>
        </div>
        
        <!-- 论文分布图表 -->
        <div class="card chart-card">
          <div class="card-title">
            <el-icon><PieChart /></el-icon>
            论文状态分布
          </div>
          
          <div ref="chartRef" style="height: 300px;"></div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { papersApi } from '../api/papers'
import { notificationsApi } from '../api/notifications'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import * as echarts from 'echarts'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const chartRef = ref(null)
const dashboardStats = ref({
  totalPapers: 0,
  approvedPapers: 0,
  pendingPapers: 0,
  highQualityPapers: 0,
  monthlyIncrease: 0,
  approvalRate: 0
})
const recentPapers = ref([])
const recentNotifications = ref([])

// 计算属性
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

// 根据用户角色获取快速操作
const quickActions = computed(() => {
  const baseActions = [
    {
      name: 'submit-paper',
      label: '论文提交',
      icon: 'EditPen',
      color: '#1890ff',
      path: '/submit-paper'
    },
    {
      name: 'my-papers',
      label: '我的论文',
      icon: 'Document',
      color: '#52c41a',
      path: '/my-papers'
    },
    {
      name: 'statistics',
      label: '数据统计',
      icon: 'PieChart',
      color: '#fa8c16',
      path: '/statistics'
    },
    {
      name: 'import-export',
      label: '导入导出',
      icon: 'Upload',
      color: '#722ed1',
      path: '/import-export'
    }
  ]
  
  const roleActions = {
    'manager': [
      {
        name: 'paper-audit',
        label: '论文审核',
        icon: 'Check',
        color: '#f5222d',
        path: '/paper-audit'
      },
      {
        name: 'paper-database',
        label: '论文数据库',
        icon: 'FolderOpened',
        color: '#13c2c2',
        path: '/paper-database'
      }
    ],
    'admin': [
      {
        name: 'paper-audit',
        label: '论文审核',
        icon: 'Check',
        color: '#f5222d',
        path: '/paper-audit'
      },
      {
        name: 'system-management',
        label: '系统管理',
        icon: 'Setting',
        color: '#eb2f96',
        path: '/system-management'
      }
    ]
  }
  
  const userRole = userStore.user?.role
  const roleSpecificActions = roleActions[userRole] || []
  
  return [...baseActions, ...roleSpecificActions]
})

// 处理快速操作点击
const handleQuickAction = (action) => {
  router.push(action.path)
}

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    'draft': 'info',
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'draft': '草稿',
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  }
  return statusMap[status] || '未知'
}

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('MM-DD')
}

// 查看论文详情
const viewPaper = (paper) => {
  // 这里可以打开论文详情弹窗或跳转到详情页
  ElMessage.info('查看论文详情功能开发中...')
}

// 加载仪表板数据
const loadDashboardData = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadStats(),
      loadRecentPapers(),
      loadRecentNotifications()
    ])
  } catch (error) {
    console.error('加载仪表板数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await papersApi.getPaperStats()
    dashboardStats.value = {
      totalPapers: response.data.total || 0,
      approvedPapers: response.data.approved || 0,
      pendingPapers: response.data.pending || 0,
      highQualityPapers: response.data.highQuality || 0,
      monthlyIncrease: response.data.monthlyIncrease || 0,
      approvalRate: response.data.approvalRate || 0
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  }
}

// 加载最近论文
const loadRecentPapers = async () => {
  try {
    const response = await papersApi.getMyPapers({ limit: 5, sort: 'created_at', order: 'desc' })
    recentPapers.value = response.data.papers || []
  } catch (error) {
    console.error('加载最近论文失败:', error)
    ElMessage.error('加载最近论文失败')
  }
}

// 加载最近通知
const loadRecentNotifications = async () => {
  try {
    const response = await notificationsApi.getNotifications({ limit: 5, sort: 'created_at', order: 'desc' })
    recentNotifications.value = response.data.notifications || []
  } catch (error) {
    console.error('加载最近通知失败:', error)
    ElMessage.error('加载最近通知失败')
  }
}

// 初始化图表
const initChart = () => {
  nextTick(() => {
    if (!chartRef.value) return
    
    const chart = echarts.init(chartRef.value)
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        bottom: '0',
        left: 'center'
      },
      series: [
        {
          name: '论文状态',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { 
              value: dashboardStats.value.approvedPapers, 
              name: '已通过',
              itemStyle: { color: '#52c41a' }
            },
            { 
              value: dashboardStats.value.pendingPapers, 
              name: '待审核',
              itemStyle: { color: '#fa8c16' }
            },
            { 
              value: dashboardStats.value.totalPapers - dashboardStats.value.approvedPapers - dashboardStats.value.pendingPapers, 
              name: '草稿',
              itemStyle: { color: '#d9d9d9' }
            }
          ]
        }
      ]
    }
    
    chart.setOption(option)
    
    // 响应式处理
    window.addEventListener('resize', () => {
      chart.resize()
    })
  })
}

// 组件挂载时初始化
onMounted(async () => {
  await loadDashboardData()
  initChart()
})
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
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

.stats-row {
  margin-bottom: 32px;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-card);
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

.stats-card.primary {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: white;
}

.stats-card.success {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: white;
}

.stats-card.warning {
  background: linear-gradient(135deg, #fa8c16 0%, #ffa940 100%);
  color: white;
}

.stats-card.info {
  background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
  color: white;
}

.stats-icon {
  opacity: 0.8;
}

.stats-content {
  flex: 1;
}

.stats-number {
  font-size: 32px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.stats-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  opacity: 0.8;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-card);
  margin-bottom: 24px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
  position: relative;
}

.view-more {
  margin-left: auto;
  font-size: 14px;
}

.quick-actions {
  margin-top: 16px;
}

.quick-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-light);
}

.quick-action-item:hover {
  background: var(--primary-light);
  transform: translateY(-2px);
}

.action-icon {
  font-size: 32px;
}

.action-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.paper-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.paper-journal {
  font-size: 12px;
  color: var(--text-tertiary);
}

.notification-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  padding: 16px 0;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background-color: var(--bg-light);
  margin: 0 -16px;
  padding: 16px;
  border-radius: 8px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.notification-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.notification-time {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.notification-content {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }
  
  .stats-card {
    padding: 16px;
  }
  
  .stats-number {
    font-size: 24px;
  }
  
  .card {
    padding: 16px;
  }
  
  .quick-action-item {
    padding: 16px 12px;
  }
  
  .action-icon {
    font-size: 24px;
  }
}
</style>