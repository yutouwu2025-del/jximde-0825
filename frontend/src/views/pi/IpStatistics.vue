<template>
  <div class="ip-statistics-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">专利/软著数据统计</h1>
      <p class="page-description">多维度统计分析专利和软件著作权数据，支持可视化图表展示</p>
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
            <el-option label="按类型统计" value="type" />
            <el-option label="按部门统计" value="department" />
            <el-option label="按个人统计" value="person" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="filters.itemType"
            placeholder="项目类型"
            clearable
            @change="loadStatistics"
          >
            <el-option label="全部" value="" />
            <el-option label="专利" value="patent" />
            <el-option label="软著" value="copyright" />
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
            <div class="stat-label">总数量</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon info">
            <el-icon><Medal /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ overviewStats.patents }}</div>
            <div class="stat-label">专利数量</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon success">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ overviewStats.copyrights }}</div>
            <div class="stat-label">软著数量</div>
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
    </el-row>
    
    <!-- 图表区域 -->
    <el-row :gutter="16" class="charts-row">
      <!-- 趋势图表 -->
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3>趋势分析</h3>
            <el-select v-model="trendType" size="small" @change="updateTrendChart">
              <el-option label="按月统计" value="month" />
              <el-option label="按季度统计" value="quarter" />
              <el-option label="按年统计" value="year" />
            </el-select>
          </div>
          <div class="chart-content">
            <div ref="trendChart" class="chart"></div>
          </div>
        </div>
      </el-col>
      
      <!-- 类型分布图 -->
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3>类型分布</h3>
          </div>
          <div class="chart-content">
            <div ref="typeChart" class="chart"></div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="16" class="charts-row">
      <!-- 专利类型详细分布 -->
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3>专利类型分布</h3>
          </div>
          <div class="chart-content">
            <div ref="patentTypeChart" class="chart"></div>
          </div>
        </div>
      </el-col>
      
      <!-- 审核状态分布 -->
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3>审核状态分布</h3>
          </div>
          <div class="chart-content">
            <div ref="statusChart" class="chart"></div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 排行榜 -->
    <el-row :gutter="16" class="rankings-row">
      <!-- 部门排行 -->
      <el-col :span="8">
        <div class="ranking-card">
          <h3>部门排行榜</h3>
          <div class="ranking-list">
            <div 
              v-for="(item, index) in departmentRanking" 
              :key="index"
              class="ranking-item"
            >
              <div class="rank-number" :class="getRankClass(index + 1)">{{ index + 1 }}</div>
              <div class="rank-content">
                <div class="rank-name">{{ item.name }}</div>
                <div class="rank-count">{{ item.count }} 项</div>
              </div>
              <div class="rank-bar">
                <div 
                  class="rank-progress" 
                  :style="{ width: item.percentage + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
      
      <!-- 个人排行 -->
      <el-col :span="8">
        <div class="ranking-card">
          <h3>个人排行榜</h3>
          <div class="ranking-list">
            <div 
              v-for="(item, index) in personalRanking" 
              :key="index"
              class="ranking-item"
            >
              <div class="rank-number" :class="getRankClass(index + 1)">{{ index + 1 }}</div>
              <div class="rank-content">
                <div class="rank-name">{{ item.name }}</div>
                <div class="rank-count">{{ item.count }} 项</div>
              </div>
              <div class="rank-bar">
                <div 
                  class="rank-progress" 
                  :style="{ width: item.percentage + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
      
      <!-- 最新动态 -->
      <el-col :span="8">
        <div class="ranking-card">
          <h3>最新动态</h3>
          <div class="activity-list">
            <div 
              v-for="(activity, index) in recentActivities" 
              :key="index"
              class="activity-item"
            >
              <div class="activity-icon" :class="activity.type">
                <el-icon><component :is="activity.icon" /></el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-text">{{ activity.text }}</div>
                <div class="activity-time">{{ activity.time }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { piApi } from '../../api/pi'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver'

// 响应式数据
const exportLoading = ref(false)
const trendType = ref('month')

// 图表实例引用
const trendChart = ref(null)
const typeChart = ref(null)
const patentTypeChart = ref(null)
const statusChart = ref(null)

// 图表实例
let trendChartInstance = null
let typeChartInstance = null
let patentTypeChartInstance = null
let statusChartInstance = null

// 筛选条件
const filters = reactive({
  year: dayjs().format('YYYY'),
  dimension: 'year',
  itemType: ''
})

// 概览统计
const overviewStats = reactive({
  total: 0,
  patents: 0,
  copyrights: 0,
  pending: 0
})

// 排行榜数据
const departmentRanking = ref([])
const personalRanking = ref([])
const recentActivities = ref([])

// 获取排行样式类
const getRankClass = (rank) => {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return 'normal'
}

// 初始化趋势图表
const initTrendChart = () => {
  if (!trendChart.value) return
  
  trendChartInstance = echarts.init(trendChart.value)
  
  const option = {
    title: {
      text: '专利/软著趋势图',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['专利', '软著']
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '专利',
        type: 'line',
        data: [2, 3, 5, 4, 6, 8, 7, 9, 6, 8, 10, 12],
        smooth: true,
        itemStyle: { color: '#409eff' }
      },
      {
        name: '软著',
        type: 'line',
        data: [1, 2, 3, 2, 4, 5, 4, 6, 4, 5, 7, 8],
        smooth: true,
        itemStyle: { color: '#67c23a' }
      }
    ]
  }
  
  trendChartInstance.setOption(option)
}

// 初始化类型分布图表
const initTypeChart = () => {
  if (!typeChart.value) return
  
  typeChartInstance = echarts.init(typeChart.value)
  
  const option = {
    title: {
      text: '类型分布',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    series: [
      {
        name: '类型分布',
        type: 'pie',
        radius: ['40%', '70%'],
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
          { value: 60, name: '专利', itemStyle: { color: '#409eff' } },
          { value: 40, name: '软著', itemStyle: { color: '#67c23a' } }
        ]
      }
    ]
  }
  
  typeChartInstance.setOption(option)
}

// 初始化专利类型分布图表
const initPatentTypeChart = () => {
  if (!patentTypeChart.value) return
  
  patentTypeChartInstance = echarts.init(patentTypeChart.value)
  
  const option = {
    title: {
      text: '专利类型分布',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: ['发明专利', '实用新型', '外观设计']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '数量',
        type: 'bar',
        data: [25, 20, 15],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#2378f7' },
              { offset: 0.7, color: '#2378f7' },
              { offset: 1, color: '#83bff6' }
            ])
          }
        }
      }
    ]
  }
  
  patentTypeChartInstance.setOption(option)
}

// 初始化审核状态分布图表
const initStatusChart = () => {
  if (!statusChart.value) return
  
  statusChartInstance = echarts.init(statusChart.value)
  
  const option = {
    title: {
      text: '审核状态分布',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    series: [
      {
        name: '审核状态',
        type: 'pie',
        radius: '70%',
        data: [
          { value: 75, name: '已通过', itemStyle: { color: '#67c23a' } },
          { value: 15, name: '待审核', itemStyle: { color: '#e6a23c' } },
          { value: 8, name: '已拒绝', itemStyle: { color: '#f56c6c' } },
          { value: 2, name: '草稿', itemStyle: { color: '#909399' } }
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
  
  statusChartInstance.setOption(option)
}

// 更新趋势图表
const updateTrendChart = () => {
  if (!trendChartInstance) return
  
  let xAxisData = []
  let patentData = []
  let copyrightData = []
  
  if (trendType.value === 'month') {
    xAxisData = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    patentData = [2, 3, 5, 4, 6, 8, 7, 9, 6, 8, 10, 12]
    copyrightData = [1, 2, 3, 2, 4, 5, 4, 6, 4, 5, 7, 8]
  } else if (trendType.value === 'quarter') {
    xAxisData = ['Q1', 'Q2', 'Q3', 'Q4']
    patentData = [10, 18, 24, 30]
    copyrightData = [6, 11, 14, 20]
  } else {
    xAxisData = ['2020', '2021', '2022', '2023', '2024']
    patentData = [45, 52, 68, 75, 82]
    copyrightData = [28, 35, 42, 48, 51]
  }
  
  trendChartInstance.setOption({
    xAxis: { data: xAxisData },
    series: [
      { data: patentData },
      { data: copyrightData }
    ]
  })
}

// 加载统计数据
const loadStatistics = async () => {
  try {
    const response = await piApi.getStatistics(filters)
    const data = response.data || {}
    
    // 更新概览统计
    Object.assign(overviewStats, {
      total: data.total || 100,
      patents: data.patents || 60,
      copyrights: data.copyrights || 40,
      pending: data.pending || 15
    })
    
    // 更新排行榜数据
    departmentRanking.value = data.departmentRanking || [
      { name: '技术部', count: 25, percentage: 100 },
      { name: '研发部', count: 18, percentage: 72 },
      { name: '产品部', count: 15, percentage: 60 },
      { name: '市场部', count: 8, percentage: 32 },
      { name: '运营部', count: 5, percentage: 20 }
    ]
    
    personalRanking.value = data.personalRanking || [
      { name: '张三', count: 12, percentage: 100 },
      { name: '李四', count: 8, percentage: 67 },
      { name: '王五', count: 6, percentage: 50 },
      { name: '赵六', count: 4, percentage: 33 },
      { name: '钱七', count: 3, percentage: 25 }
    ]
    
    recentActivities.value = data.recentActivities || [
      {
        text: '张三提交了发明专利申请',
        time: '2小时前',
        type: 'success',
        icon: 'Check'
      },
      {
        text: '李四的软件著作权已审核通过',
        time: '4小时前',
        type: 'primary',
        icon: 'Medal'
      },
      {
        text: '王五提交了实用新型专利',
        time: '1天前',
        type: 'info',
        icon: 'Document'
      },
      {
        text: '赵六的发明专利需要修改',
        time: '2天前',
        type: 'warning',
        icon: 'Warning'
      }
    ]
    
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 导出数据
const exportData = async () => {
  exportLoading.value = true
  
  try {
    // 模拟导出数据
    const exportData = {
      概览统计: overviewStats,
      部门排行: departmentRanking.value,
      个人排行: personalRanking.value,
      筛选条件: filters
    }
    
    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    saveAs(blob, `专利软著统计报表_${dayjs().format('YYYY-MM-DD')}.json`)
    
    ElMessage.success('报表导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 响应式处理
const handleResize = () => {
  if (trendChartInstance) trendChartInstance.resize()
  if (typeChartInstance) typeChartInstance.resize()
  if (patentTypeChartInstance) patentTypeChartInstance.resize()
  if (statusChartInstance) statusChartInstance.resize()
}

// 组件挂载
onMounted(async () => {
  await nextTick()
  
  // 初始化图表
  initTrendChart()
  initTypeChart()
  initPatentTypeChart()
  initStatusChart()
  
  // 加载数据
  loadStatistics()
  
  // 添加窗口大小监听
  window.addEventListener('resize', handleResize)
})

// 清理事件监听
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  
  // 销毁图表实例
  if (trendChartInstance) trendChartInstance.dispose()
  if (typeChartInstance) typeChartInstance.dispose()
  if (patentTypeChartInstance) patentTypeChartInstance.dispose()
  if (statusChartInstance) statusChartInstance.dispose()
})
</script>

<style scoped>
.ip-statistics-container {
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
  margin-bottom: 16px;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: center;
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
}

.stat-icon.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon.info {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  color: white;
}

.stat-icon.success {
  background: linear-gradient(135deg, #55a3ff 0%, #003d82 100%);
  color: white;
}

.stat-icon.warning {
  background: linear-gradient(135deg, #feca57 0%, #ff9ff3 100%);
  color: white;
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

.charts-row {
  margin-bottom: 24px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.chart-header {
  padding: 20px 20px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.chart-content {
  padding: 0 20px 20px;
}

.chart {
  width: 100%;
  height: 300px;
}

.rankings-row {
  margin-bottom: 24px;
}

.ranking-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--shadow-card);
  height: 400px;
  overflow: hidden;
}

.ranking-card h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 10px;
}

.ranking-list {
  max-height: 320px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  position: relative;
}

.rank-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  margin-right: 12px;
  flex-shrink: 0;
}

.rank-number.gold {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #8b7600;
}

.rank-number.silver {
  background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
  color: #666;
}

.rank-number.bronze {
  background: linear-gradient(135deg, #cd7f32, #daa520);
  color: #5c3317;
}

.rank-number.normal {
  background: var(--bg-light);
  color: var(--text-secondary);
}

.rank-content {
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.rank-bar {
  position: absolute;
  bottom: 0;
  left: 40px;
  right: 0;
  height: 2px;
  background: var(--border-light);
  border-radius: 1px;
}

.rank-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
  border-radius: 1px;
  transition: width 0.3s ease;
}

.activity-list {
  max-height: 320px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
  font-size: 16px;
}

.activity-icon.success {
  background: var(--success-light);
  color: var(--success-color);
}

.activity-icon.primary {
  background: var(--primary-light);
  color: var(--primary-color);
}

.activity-icon.info {
  background: var(--info-light);
  color: var(--info-color);
}

.activity-icon.warning {
  background: var(--warning-light);
  color: var(--warning-color);
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.activity-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .ip-statistics-container {
    padding: 16px;
  }
  
  .stat-card {
    margin-bottom: 16px;
  }
  
  .chart {
    height: 250px;
  }
  
  .ranking-card {
    height: auto;
    margin-bottom: 16px;
  }
}
</style>




