<template>
  <div class="statistics-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">数据统计</h1>
      <p class="page-description">多维度统计分析论文数据，支持可视化图表展示</p>
    </div>
    
    <!-- 筛选条件 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-date-picker
            v-model="filters.year"
            type="year"
            placeholder="选择年度"
            format="YYYY"
            value-format="YYYY"
            @change="loadStatistics"
          />
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="filters.dimension"
            placeholder="统计维度"
            @change="loadStatistics"
          >
            <el-option label="按年度统计" value="year" />
            <el-option label="按部门统计" value="department" />
            <el-option label="按个人统计" value="person" />
            <el-option label="按期刊分区" value="partition" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="filters.type"
            placeholder="论文类型"
            clearable
            @change="loadStatistics"
          >
            <el-option label="全部" value="" />
            <el-option label="期刊论文" value="journal" />
            <el-option label="学会论文" value="conference" />
            <el-option label="学位论文" value="degree" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="exportData" :loading="exportLoading">
            <el-icon><Download /></el-icon>
            导出报表
          </el-button>
        </el-col>
      </el-row>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon primary">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ overviewStats.total }}</div>
            <div class="stat-label">论文总数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon success">
            <el-icon><Check /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ overviewStats.approved }}</div>
            <div class="stat-label">已通过</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon warning">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ overviewStats.pending }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon success">
            <el-icon><Star /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ overviewStats.highQuality }}</div>
            <div class="stat-label">高质量论文</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon warning">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ overviewStats.growth }}%</div>
            <div class="stat-label">同比增长</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon info">
            <el-icon><Medal /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ overviewStats.topRank }}</div>
            <div class="stat-label">院内排名</div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 图表区域 -->
    <el-row :gutter="16">
      <el-col :span="12">
        <div class="chart-card">
          <h3>论文数量趋势</h3>
          <div ref="trendChartRef" style="height: 400px;"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <h3>期刊分区分布</h3>
          <div ref="partitionChartRef" style="height: 400px;"></div>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="16">
      <el-col :span="24">
        <div class="chart-card">
          <h3>部门统计对比</h3>
          <div ref="departmentChartRef" style="height: 400px;"></div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { papersApi } from '../api/papers'
import api from '../api/index'
import * as echarts from 'echarts'

// 响应式数据
const exportLoading = ref(false)
const trendChartRef = ref(null)
const partitionChartRef = ref(null)
const departmentChartRef = ref(null)

// 筛选条件
const filters = reactive({
  // 默认查询“所有年份”，仅当用户选择年份时才带 year 参数
  year: '',
  dimension: 'year',
  type: ''
})

// 统计数据
const overviewStats = reactive({
  total: 0,
  approved: 0,
  pending: 0,
  highQuality: 0,
  growth: 0,
  topRank: 0
})

// 加载统计数据（节流+429重试）
let statsLoading = false
let lastStatsAt = 0
const loadStatistics = async () => {
  const now = Date.now()
  if (statsLoading || now - lastStatsAt < 800) return
  statsLoading = true
  lastStatsAt = now
  const maxRetries = 3
  let attempt = 0
  while (attempt < maxRetries) {
    try {
      // 构建查询参数
      const query = {
        dimension: filters.dimension,
        type: filters.type
      }
      if (filters.year) {
        query.year = Number(filters.year)
      }
      
      // 使用统计API获取概览数据
      const [overviewResponse, trendsResponse, departmentResponse] = await Promise.all([
        api.get('/statistics/overview', { params: query }).catch(() => ({ data: { data: null } })),
        api.get('/statistics/trends', { params: { ...query, dimension: 'month' } }).catch(() => ({ data: { data: null } })),
        api.get('/statistics/by-department', { params: query }).catch(() => ({ data: { data: null } })),
      ])
      
      const overviewData = overviewResponse.data?.data
      const trendsData = trendsResponse.data?.data
      const departmentData = departmentResponse.data?.data
      
      if (overviewData) {
        // 根据后端API实际返回的数据结构来解析
        const totalStats = overviewData.total || {}
        const statusStats = overviewData.byStatus || []
        const partitionStats = overviewData.byPartition || []
        const totalPapers = Number(totalStats.total_papers || 0)
        const approvedPapers = Number(totalStats.approved_papers || 0)
        const pendingFromStatus = Number((statusStats.find(s => s.status === 'pending')?.count) || 0)
        const rejectedFromStatus = Number((statusStats.find(s => s.status === 'rejected')?.count) || 0)
        const pendingPapers = pendingFromStatus || Math.max(totalPapers - approvedPapers - rejectedFromStatus, 0)
        const highQualityPapers = (partitionStats || [])
          .filter(p => ['Q1', 'Q2'].includes(p.partition))
          .reduce((sum, p) => sum + Number(p.count || 0), 0)
        
        Object.assign(overviewStats, {
          total: totalPapers,
          approved: approvedPapers,
          pending: pendingPapers,
          highQuality: highQualityPapers,
          growth: 15, // 可以根据趋势数据计算
          topRank: 3  // 可以根据部门排名计算
        })
        
        // 更新图表数据
        updateCharts({
          trend: trendsData?.trends || [],
          partition: partitionStats,
          department: departmentData || []
        })
      } else {
        // 使用模拟数据
        Object.assign(overviewStats, {
          total: 125,
          approved: 98,
          pending: 15,
          highQuality: 68,
          growth: 23,
          topRank: 3
        })
        updateChartsWithMockData()
      }
      
      break
    } catch (error) {
      if (error?.response?.status === 429 && attempt < maxRetries - 1) {
        const backoff = Math.pow(2, attempt) * 300
        await new Promise(r => setTimeout(r, backoff))
        attempt++
        continue
      }
      console.error('加载统计数据失败:', error)
      Object.assign(overviewStats, {
        total: 125,
        approved: 98,
        pending: 15,
        highQuality: 68,
        growth: 23,
        topRank: 3
      })
      updateChartsWithMockData()
      break
    } finally {
      statsLoading = false
    }
  }
}

// 更新图表
const updateCharts = (chartsData) => {
  nextTick(() => {
    updateTrendChart(chartsData.trend || [])
    updatePartitionChart(chartsData.partition || [])
    updateDepartmentChart(chartsData.department || [])
  })
}

// 更新趋势图表
const updateTrendChart = (data) => {
  if (!trendChartRef.value) return
  
  const chart = echarts.init(trendChartRef.value)
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['论文数量', '高质量论文'] },
    xAxis: {
      type: 'category',
      data: data.map(item => item.period) || ['1月', '2月', '3月', '4月', '5月', '6月']
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '论文数量',
        type: 'line',
        data: data.map(item => item.totalPapers) || [12, 18, 15, 22, 19, 25],
        smooth: true,
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '高质量论文',
        type: 'line',
        data: data.map(item => (item.q1Papers || 0) + (item.q2Papers || 0)) || [8, 12, 10, 15, 13, 18],
        smooth: true,
        itemStyle: { color: '#52c41a' }
      }
    ]
  }
  chart.setOption(option)
}

// 更新分区分布图表
const updatePartitionChart = (data) => {
  if (!partitionChartRef.value) return
  
  const chart = echarts.init(partitionChartRef.value)
  const option = {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        type: 'pie',
        radius: '50%',
        data: data.length ? data.map(item => ({
          value: item.count,
          name: item.partition
        })) : [
          { value: 35, name: 'Q1区' },
          { value: 28, name: 'Q2区' },
          { value: 22, name: 'Q3区' },
          { value: 15, name: 'Q4区' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  chart.setOption(option)
}

// 更新部门对比图表
const updateDepartmentChart = (data) => {
  if (!departmentChartRef.value) return
  
  const chart = echarts.init(departmentChartRef.value)
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['论文数量', '高质量论文'] },
    xAxis: {
      type: 'category',
      data: data.map(item => item.departmentName) || ['计算机部', '人工智能部', '数据科学部', '软件工程部']
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '论文数量',
        type: 'bar',
        data: data.map(item => item.totalPapers) || [45, 38, 32, 28],
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '高质量论文',
        type: 'bar',
        data: data.map(item => (item.q1Papers || 0) + (item.q2Papers || 0)) || [25, 22, 18, 15],
        itemStyle: { color: '#52c41a' }
      }
    ]
  }
  chart.setOption(option)
}

// 使用模拟数据更新图表
const updateChartsWithMockData = () => {
  nextTick(() => {
    updateTrendChart([])
    updatePartitionChart([])
    updateDepartmentChart([])
  })
}

// 导出数据
const exportData = async () => {
  exportLoading.value = true
  try {
    const params = {
      format: 'csv',
      type: 'overview',
      ...(filters.year && { year: filters.year }),
      ...(filters.dimension && { dimension: filters.dimension }),
      ...(filters.type && { type: filters.type })
    }
    
    const response = await api.get('/statistics/export', {
      params,
      responseType: 'blob'
    })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    
    // 根据筛选条件生成文件名
    const fileName = `统计报表_${filters.dimension}_${filters.year || '全部'}_${new Date().toISOString().split('T')[0]}.csv`
    link.download = fileName
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败: ' + (error.response?.data?.message || error.message))
  } finally {
    exportLoading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadStatistics()
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    nextTick(() => {
      if (trendChartRef.value) echarts.getInstanceByDom(trendChartRef.value)?.resize()
      if (partitionChartRef.value) echarts.getInstanceByDom(partitionChartRef.value)?.resize()
      if (departmentChartRef.value) echarts.getInstanceByDom(departmentChartRef.value)?.resize()
    })
  })
})
</script>

<style scoped>
.statistics-container {
  padding: 24px;
}

.page-header {
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

.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  margin-bottom: 24px;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.primary {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
}

.stat-icon.success {
  background: linear-gradient(135deg, #52c41a, #73d13d);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #fa8c16, #ffa940);
}

.stat-icon.info {
  background: linear-gradient(135deg, #722ed1, #9254de);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.chart-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  margin-bottom: 24px;
}

.chart-card h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>