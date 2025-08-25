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
import * as echarts from 'echarts'

// 响应式数据
const exportLoading = ref(false)
const trendChartRef = ref(null)
const partitionChartRef = ref(null)
const departmentChartRef = ref(null)

// 筛选条件
const filters = reactive({
  year: new Date().getFullYear().toString(),
  dimension: 'year',
  type: ''
})

// 统计数据
const overviewStats = reactive({
  total: 0,
  highQuality: 0,
  growth: 0,
  topRank: 0
})

// 加载统计数据
const loadStatistics = async () => {
  try {
    const response = await papersApi.getPaperStats(filters)
    
    // 更新概览数据
    Object.assign(overviewStats, {
      total: response.data.total || 0,
      highQuality: response.data.highQuality || 0,
      growth: response.data.growth || 0,
      topRank: response.data.topRank || 0
    })
    
    // 更新图表
    updateCharts(response.data.charts || {})
  } catch (error) {
    console.error('加载统计数据失败:', error)
    // 使用模拟数据
    Object.assign(overviewStats, {
      total: 125,
      highQuality: 68,
      growth: 23,
      topRank: 3
    })
    
    // 模拟图表数据
    updateChartsWithMockData()
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
      data: data.map(item => item.month) || ['1月', '2月', '3月', '4月', '5月', '6月']
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '论文数量',
        type: 'line',
        data: data.map(item => item.total) || [12, 18, 15, 22, 19, 25],
        smooth: true,
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '高质量论文',
        type: 'line',
        data: data.map(item => item.highQuality) || [8, 12, 10, 15, 13, 18],
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
        data: data.length ? data : [
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
      data: data.map(item => item.department) || ['计算机部', '人工智能部', '数据科学部', '软件工程部']
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '论文数量',
        type: 'bar',
        data: data.map(item => item.total) || [45, 38, 32, 28],
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '高质量论文',
        type: 'bar',
        data: data.map(item => item.highQuality) || [25, 22, 18, 15],
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
    const response = await papersApi.exportPapers(filters)
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `论文统计报表_${filters.year}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
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