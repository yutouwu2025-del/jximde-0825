<template>
  <div class="ip-database-container">
    <div class="page-header">
      <h1 class="page-title">专利/软著数据库</h1>
      <p class="page-description">管理所有已审核通过的专利和软件著作权数据</p>
    </div>
    
    <!-- 统计概览 -->
    <el-row :gutter="16" class="database-stats">
      <el-col :xs="12" :sm="6">
        <div class="stat-card total">
          <div class="stat-number">{{ databaseStats.total }}</div>
          <div class="stat-label">总数量</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card patents">
          <div class="stat-number">{{ databaseStats.patents }}</div>
          <div class="stat-label">专利数量</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card copyrights">
          <div class="stat-number">{{ databaseStats.copyrights }}</div>
          <div class="stat-label">软著数量</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card this-year">
          <div class="stat-number">{{ databaseStats.thisYear }}</div>
          <div class="stat-label">本年度新增</div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :xs="24" :sm="6">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索标题、申请人或发明人"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :xs="24" :sm="4">
          <el-select v-model="filterType" placeholder="类型" clearable @change="handleFilterChange">
            <el-option label="全部" value="" />
            <el-option label="专利" value="patent" />
            <el-option label="软著" value="copyright" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="4" v-if="filterType === 'patent'">
          <el-select v-model="filterPatentType" placeholder="专利类型" clearable @change="handleFilterChange">
            <el-option label="全部" value="" />
            <el-option label="发明专利" value="invention" />
            <el-option label="实用新型" value="utility_model" />
            <el-option label="外观设计" value="design" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="4">
          <el-date-picker
            v-model="filterYear"
            type="year"
            placeholder="申请年度"
            format="YYYY"
            value-format="YYYY"
            @change="handleFilterChange"
          />
        </el-col>
        <el-col :xs="24" :sm="6">
          <el-space>
            <el-button type="primary" @click="exportSelected" :disabled="selectedItems.length === 0">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
            <el-button type="success" @click="exportAll">
              <el-icon><Download /></el-icon>
              导出全部
            </el-button>
          </el-space>
        </el-col>
      </el-row>
    </div>
    
    <!-- 专利/软著列表 -->
    <div class="items-table">
      <el-table
        :data="itemsList"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.item_type === 'patent' ? 'primary' : 'success'" size="small">
              {{ row.item_type === 'patent' ? '专利' : '软著' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="基本信息" min-width="350">
          <template #default="{ row }">
            <div class="item-info">
              <div class="item-title" @click="viewItemDetail(row)">
                {{ row.title || row.name }}
              </div>
              <div class="item-meta">
                <el-tag 
                  v-if="row.item_type === 'patent'" 
                  size="small" 
                  class="meta-tag"
                >
                  {{ getPatentTypeText(row.patent_type) }}
                </el-tag>
                <span class="applicant">{{ row.applicant }}</span>
                <span v-if="row.application_number" class="application-number">
                  申请号：{{ row.application_number }}
                </span>
                <span v-if="row.registration_number" class="registration-number">
                  登记号：{{ row.registration_number }}
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="发明人/作者" width="150">
          <template #default="{ row }">
            <div class="inventors">
              <div v-if="row.inventors && row.inventors.length > 0" class="inventor-list">
                <span v-for="(inventor, index) in row.inventors.slice(0, 2)" :key="index" class="inventor">
                  {{ inventor.name }}{{ index < Math.min(1, row.inventors.length - 1) ? ',' : '' }}
                </span>
                <span v-if="row.inventors.length > 2" class="more-inventors">
                  等{{ row.inventors.length }}人
                </span>
              </div>
              <span v-else class="no-inventor">未填写</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="申请/完成日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.application_date || row.creation_completion_date) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="audit_time" label="审核时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.audit_time) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button text type="primary" size="small" @click="viewItemDetail(row)">
                查看详情
              </el-button>
              <el-button 
                text
                type="info" 
                size="small" 
                @click="downloadItemFile(row)"
                v-if="row.file_url"
              >
                下载文件
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="detailDrawer"
      :title="`${currentItem?.item_type === 'patent' ? '专利' : '软著'}详情`"
      direction="rtl"
      size="60%"
    >
      <div v-if="currentItem" class="item-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="类型">
            <el-tag :type="currentItem.item_type === 'patent' ? 'primary' : 'success'">
              {{ currentItem.item_type === 'patent' ? '专利' : '软件著作权' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.item_type === 'patent'" label="专利类型">
            {{ getPatentTypeText(currentItem.patent_type) }}
          </el-descriptions-item>
          <el-descriptions-item :label="currentItem.item_type === 'patent' ? '专利名称' : '软件名称'">
            {{ currentItem.title || currentItem.name }}
          </el-descriptions-item>
          <el-descriptions-item :label="currentItem.item_type === 'patent' ? '申请人' : '著作权人'">
            {{ currentItem.applicant }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.application_number" label="申请号">
            {{ currentItem.application_number }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.registration_number" label="登记号">
            {{ currentItem.registration_number }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.application_date" label="申请日期">
            {{ formatDate(currentItem.application_date) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.creation_completion_date" label="创作完成日期">
            {{ formatDate(currentItem.creation_completion_date) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.first_publication_date" label="首次发表日期">
            {{ formatDate(currentItem.first_publication_date) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.description" label="说明/摘要">
            <div class="description-text">{{ currentItem.description }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="审核时间">
            {{ formatDate(currentItem.audit_time) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 发明人/作者信息 -->
        <div v-if="currentItem.inventors && currentItem.inventors.length > 0" class="inventors-section" style="margin-top: 24px;">
          <h3>{{ currentItem.item_type === 'patent' ? '发明人信息' : '作者信息' }}</h3>
          <el-table :data="currentItem.inventors" border size="small">
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="id_number" label="身份证号" width="160" />
            <el-table-column prop="nationality" label="国籍" width="80" />
            <el-table-column prop="address" label="地址" min-width="200" />
          </el-table>
        </div>

        <!-- 附件预览与下载 -->
        <div v-if="hasFile" class="attachment-actions" style="margin-top: 24px;">
          <h3>附件</h3>
          <el-space>
            <el-button type="primary" size="small" @click="previewItemFile(currentItem)">
              <el-icon><View /></el-icon>
              在线预览
            </el-button>
            <el-button type="info" size="small" @click="downloadItemFile(currentItem)">
              <el-icon><Download /></el-icon>
              下载文件
            </el-button>
            <el-button type="success" size="small" @click="openFileInNewTab">
              <el-icon><Link /></el-icon>
              新窗口打开
            </el-button>
          </el-space>
          <div class="file-info" style="font-size: 12px; color: #666; margin-top: 8px;" v-if="resolvedFileUrl">
            文件名：{{ currentItem.file_name || getFileNameFromUrl(resolvedFileUrl) }}
          </div>

          <!-- 内嵌预览区域 -->
          <div class="file-preview-container" style="margin-top: 12px;">
            <div v-if="!previewError && previewUrl" class="file-preview-content" style="background: #f5f5f5; border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden;">
              <iframe
                :src="getPreviewUrl(previewUrl)"
                width="100%"
                height="560px"
                frameborder="0"
                @error="handlePreviewError"
              ></iframe>
            </div>

            <div v-else-if="previewError" class="preview-error" style="display:flex; justify-content:center; align-items:center; height: 560px; background:#fafafa; border-radius:8px; border:2px dashed #ddd;">
              <el-empty description="文件预览失败">
                <div>
                  <p>{{ previewError }}</p>
                </div>
              </el-empty>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { piApi } from '../../api/pi'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver'

// 响应式数据
const loading = ref(false)
const detailDrawer = ref(false)
const itemsList = ref([])
const selectedItems = ref([])
const currentItem = ref(null)
const searchKeyword = ref('')
const filterType = ref('')
const filterPatentType = ref('')
const filterYear = ref('')
const previewUrl = ref('')
const previewError = ref('')

// 后端基址
const getBackendOrigin = () => {
  const { protocol, hostname, port } = window.location
  if (port === '8080') return `${protocol}//${hostname}:3000`
  return `${protocol}//${hostname}${port ? ':' + port : ''}`
}

// 解析文件URL
const resolveFileUrl = (pathOrUrl) => {
  if (!pathOrUrl) return ''
  if (String(pathOrUrl).startsWith('http')) return pathOrUrl
  if (String(pathOrUrl).startsWith('/uploads')) return `${getBackendOrigin()}${pathOrUrl}`
  if (String(pathOrUrl).startsWith('uploads')) return `${getBackendOrigin()}/${pathOrUrl}`
  return `${getBackendOrigin()}${pathOrUrl}`
}

// 分页信息
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

// 数据库统计
const databaseStats = reactive({
  total: 0,
  patents: 0,
  copyrights: 0,
  thisYear: 0
})

// 计算属性
const hasFile = computed(() => !!(currentItem.value?.file_url || currentItem.value?.file_path))
const resolvedFileUrl = computed(() => resolveFileUrl(currentItem.value?.file_url || currentItem.value?.file_path))

// 获取专利类型文本
const getPatentTypeText = (type) => {
  const typeMap = {
    'invention': '发明专利',
    'utility_model': '实用新型',
    'design': '外观设计'
  }
  return typeMap[type] || '未知'
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD')
}

// 从URL获取文件名
const getFileNameFromUrl = (url) => {
  if (!url) return ''
  try {
    const parts = url.split('/')
    const name = parts[parts.length - 1]
    return name.includes('%') ? decodeURIComponent(name) : name
  } catch (e) {
    return ''
  }
}

// 获取预览URL
const getPreviewUrl = (url) => {
  if (!url) return ''
  
  // 对于PDF文件，可以添加预览参数
  if (url.toLowerCase().includes('.pdf')) {
    return `${url}#view=FitH&toolbar=1&navpanes=1`
  }
  return url
}

// 处理搜索
const handleSearch = () => {
  pagination.current = 1
  loadItemsList()
}

// 处理筛选变化
const handleFilterChange = () => {
  pagination.current = 1
  loadItemsList()
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedItems.value = selection
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.current = page
  loadItemsList()
}

// 处理页大小变化
const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  loadItemsList()
}

// 查看详情
const viewItemDetail = (item) => {
  currentItem.value = item
  previewUrl.value = ''
  previewError.value = ''
  detailDrawer.value = true
}

// 预览文件
const previewItemFile = (item) => {
  const url = resolveFileUrl(item.file_url || item.file_path)
  if (url) {
    previewUrl.value = url
    previewError.value = ''
  } else {
    ElMessage.error('文件不存在')
  }
}

// 下载文件
const downloadItemFile = (item) => {
  try {
    const endpoint = item.item_type === 'patent' 
      ? `/pi/patents/${item.id}/download`
      : `/pi/copyrights/${item.id}/download`
    window.open(endpoint, '_blank')
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

// 在新标签页打开文件
const openFileInNewTab = () => {
  const url = resolvedFileUrl.value
  if (url) window.open(url, '_blank')
}

// 处理预览错误
const handlePreviewError = () => {
  previewError.value = '文件预览失败，可能是文件格式不支持或文件已损坏'
}

// 导出选中数据
const exportSelected = async () => {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请选择要导出的数据')
    return
  }
  
  try {
    const exportData = selectedItems.value.map(item => ({
      类型: item.item_type === 'patent' ? '专利' : '软件著作权',
      专利类型: item.item_type === 'patent' ? getPatentTypeText(item.patent_type) : '',
      名称: item.title || item.name,
      申请人_著作权人: item.applicant,
      申请号: item.application_number || '',
      登记号: item.registration_number || '',
      申请日期: formatDate(item.application_date),
      创作完成日期: formatDate(item.creation_completion_date),
      审核时间: formatDate(item.audit_time)
    }))
    
    const csvContent = convertToCSV(exportData)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `专利软著数据_${dayjs().format('YYYY-MM-DD')}.csv`)
    
    ElMessage.success(`已导出 ${selectedItems.value.length} 条数据`)
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 导出全部数据
const exportAll = async () => {
  try {
    const response = await piApi.getPatents({ pageSize: 1000, status: 'approved' })
    const patents = response.data?.data || []
    
    const copyrightResponse = await piApi.getCopyrights({ pageSize: 1000, status: 'approved' })
    const copyrights = copyrightResponse.data?.data || []
    
    const allItems = [...patents.map(item => ({ ...item, item_type: 'patent' })), 
                     ...copyrights.map(item => ({ ...item, item_type: 'copyright' }))]
    
    const exportData = allItems.map(item => ({
      类型: item.item_type === 'patent' ? '专利' : '软件著作权',
      专利类型: item.item_type === 'patent' ? getPatentTypeText(item.patent_type) : '',
      名称: item.title || item.name,
      申请人_著作权人: item.applicant,
      申请号: item.application_number || '',
      登记号: item.registration_number || '',
      申请日期: formatDate(item.application_date),
      创作完成日期: formatDate(item.creation_completion_date),
      审核时间: formatDate(item.audit_time)
    }))
    
    const csvContent = convertToCSV(exportData)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `专利软著数据库_${dayjs().format('YYYY-MM-DD')}.csv`)
    
    ElMessage.success(`已导出 ${allItems.length} 条数据`)
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 转换为CSV格式
const convertToCSV = (data) => {
  if (!data.length) return ''
  
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(row => 
    Object.values(row).map(value => 
      `"${String(value).replace(/"/g, '""')}"`
    ).join(',')
  )
  
  return [headers, ...rows].join('\n')
}

// 加载项目列表
const loadItemsList = async () => {
  loading.value = true
  
  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      status: 'approved', // 只显示已审核通过的
      keyword: searchKeyword.value,
      year: filterYear.value
    }
    
    let allItems = []
    
    // 根据筛选条件获取数据
    if (!filterType.value || filterType.value === 'patent') {
      const patentParams = { ...params }
      if (filterPatentType.value) {
        patentParams.type = filterPatentType.value
      }
      
      const patentResponse = await piApi.getPatents(patentParams)
      const patents = (patentResponse.data?.data || []).map(item => ({
        ...item,
        item_type: 'patent'
      }))
      allItems = allItems.concat(patents)
    }
    
    if (!filterType.value || filterType.value === 'copyright') {
      const copyrightResponse = await piApi.getCopyrights(params)
      const copyrights = (copyrightResponse.data?.data || []).map(item => ({
        ...item,
        item_type: 'copyright'
      }))
      allItems = allItems.concat(copyrights)
    }
    
    // 过滤已审核通过状态
    itemsList.value = allItems.filter(item => item.status === 'approved')
    pagination.total = itemsList.value.length
    
  } catch (error) {
    console.error('加载项目列表失败:', error)
    // 使用模拟数据
    itemsList.value = [
      {
        id: 1,
        item_type: 'patent',
        patent_type: 'invention',
        title: '一种基于AI的图像识别方法',
        applicant: '科技公司',
        application_number: 'CN202410001',
        application_date: '2024-01-15',
        status: 'approved',
        audit_time: '2024-01-20',
        inventors: [
          { name: '张三', id_number: '11010119900101****', nationality: '中国', address: '北京市' },
          { name: '李四', id_number: '11010119900102****', nationality: '中国', address: '北京市' }
        ],
        file_url: '/uploads/patent1.pdf'
      },
      {
        id: 2,
        item_type: 'copyright',
        title: '智能管理系统V1.0',
        applicant: '软件公司',
        registration_number: '2024SR001',
        creation_completion_date: '2024-01-10',
        status: 'approved',
        audit_time: '2024-01-18',
        inventors: [
          { name: '李四', id_number: '11010119900103****', nationality: '中国', address: '上海市' }
        ],
        file_url: '/uploads/copyright1.pdf'
      }
    ]
    pagination.total = 2
  } finally {
    loading.value = false
  }
}

// 加载统计数据
const loadDatabaseStats = async () => {
  try {
    const response = await piApi.getStatistics()
    const stats = response.data || {}
    
    Object.assign(databaseStats, {
      total: stats.total || 0,
      patents: stats.patents || 0,
      copyrights: stats.copyrights || 0,
      thisYear: stats.thisYear || 0
    })
    
  } catch (error) {
    console.error('加载统计数据失败:', error)
    // 兜底数据
    Object.assign(databaseStats, {
      total: 2,
      patents: 1,
      copyrights: 1,
      thisYear: 2
    })
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadItemsList()
  loadDatabaseStats()
})
</script>

<style scoped>
.ip-database-container {
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

.database-stats {
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: var(--shadow-card);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.total {
  border-left: 4px solid var(--primary-color);
}

.stat-card.patents {
  border-left: 4px solid var(--info-color);
}

.stat-card.copyrights {
  border-left: 4px solid var(--success-color);
}

.stat-card.this-year {
  border-left: 4px solid var(--warning-color);
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-card.total .stat-number {
  color: var(--primary-color);
}

.stat-card.patents .stat-number {
  color: var(--info-color);
}

.stat-card.copyrights .stat-number {
  color: var(--success-color);
}

.stat-card.this-year .stat-number {
  color: var(--warning-color);
}

.stat-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;
}

.items-table {
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.item-info {
  padding: 8px 0;
}

.item-title {
  font-weight: 500;
  color: var(--primary-color);
  cursor: pointer;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 350px;
}

.item-title:hover {
  text-decoration: underline;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.meta-tag {
  margin-right: 4px;
}

.applicant {
  font-weight: 500;
  color: var(--text-secondary);
}

.application-number,
.registration-number {
  background: var(--bg-light);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 11px;
}

.inventors {
  font-size: 12px;
}

.inventor-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inventor {
  color: var(--text-secondary);
}

.more-inventors {
  color: var(--text-tertiary);
  font-size: 11px;
}

.no-inventor {
  color: var(--text-tertiary);
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.pagination-wrapper {
  padding: 20px;
  text-align: center;
  border-top: 1px solid var(--border-light);
}

.item-detail {
  padding: 16px;
}

.description-text {
  line-height: 1.6;
  color: var(--text-primary);
}

.inventors-section h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
  font-size: 16px;
}

.attachment-actions h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
  font-size: 16px;
}

.file-info {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid var(--primary-color);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .ip-database-container {
    padding: 16px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .item-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>




