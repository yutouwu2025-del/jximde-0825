<template>
  <div class="paper-database-container">
    <div class="page-header">
      <h1 class="page-title">论文数据库</h1>
      <p class="page-description">管理所有已审核通过的论文数据</p>
    </div>
    
    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索论文标题或作者"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterType" placeholder="论文类型" clearable>
            <el-option label="全部" value="" />
            <el-option label="期刊论文" value="journal" />
            <el-option label="学会论文" value="conference" />
            <el-option label="学位论文" value="degree" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterPartition" placeholder="期刊分区" clearable>
            <el-option label="全部" value="" />
            <el-option label="Q1区" value="Q1" />
            <el-option label="Q2区" value="Q2" />
            <el-option label="Q3区" value="Q3" />
            <el-option label="Q4区" value="Q4" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-date-picker
            v-model="filterYear"
            type="year"
            placeholder="发表年度"
            format="YYYY"
            value-format="YYYY"
          />
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="exportSelected">
            <el-icon><Download /></el-icon>
            导出数据
          </el-button>
        </el-col>
      </el-row>
    </div>
    
    <!-- 论文列表 -->
    <div class="papers-table">
      <el-table
        :data="papersList"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="论文信息" min-width="300">
          <template #default="{ row }">
            <div class="paper-info">
              <div class="paper-title">{{ row.title }}</div>
              <div class="paper-meta">
                <el-tag size="small">{{ getTypeText(row.type) }}</el-tag>
                <span class="journal-name">{{ row.journal_name }}</span>
                <el-tag size="small" :type="getPartitionType(row.partition_info)">
                  {{ row.partition_info }}分区
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="first_author" label="第一作者" width="120" />
        <el-table-column prop="publish_year" label="发表年度" width="100" />
        <el-table-column prop="audit_time" label="审核时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.audit_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="viewPaper(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="detailDrawer"
      title="论文详情"
      direction="rtl"
      size="60%"
    >
      <div v-if="currentPaper" class="paper-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="论文标题">
            {{ currentPaper.title }}
          </el-descriptions-item>
          <el-descriptions-item label="论文类型">
            {{ getTypeText(currentPaper.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="期刊名称">
            {{ currentPaper.journal_name || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="期刊分区">
            <el-tag v-if="currentPaper.partition_info" :type="getPartitionType(currentPaper.partition_info)">
              {{ currentPaper.partition_info }}分区
            </el-tag>
            <span v-else>未填写</span>
          </el-descriptions-item>
          <el-descriptions-item label="ISSN编号">
            {{ currentPaper.issn || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="第一作者">
            {{ currentPaper.first_author || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="通讯作者">
            {{ currentPaper.corresponding_author || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="发表年度">
            {{ currentPaper.publish_year || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="DOI">
            {{ currentPaper.doi || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="审核时间">
            {{ formatDate(currentPaper.audit_time) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 附件预览与下载 -->
        <div v-if="hasFile" class="attachment-actions" style="margin-top: 16px;">
          <h3>附件</h3>
          <el-space>
            <el-button type="primary" size="small" @click="previewPaperFile(currentPaper)">
              <el-icon><View /></el-icon>
              在线预览
            </el-button>
            <el-button type="info" size="small" @click="downloadPaperFile(currentPaper)">
              <el-icon><Download /></el-icon>
              下载文件
            </el-button>
            <el-button type="success" size="small" @click="openFileInNewTab">
              <el-icon><Link /></el-icon>
              新窗口打开
            </el-button>
          </el-space>
          <div class="file-info" style="font-size: 12px; color: #666; margin-top: 8px;" v-if="resolvedFileUrl">
            文件名：{{ currentPaper.file_name || getFileNameFromUrl(resolvedFileUrl) }} | 来源：{{ resolvedFileUrl }}
          </div>

          <!-- 内嵌预览区域（参考审核页样式，不额外弹窗） -->
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
import { papersApi } from '../api/papers'
import api from '../api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false)
const papersList = ref([])
const searchKeyword = ref('')
const filterType = ref('')
const filterPartition = ref('')
const filterYear = ref('')
const selectedPapers = ref([])

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

const getTypeText = (type) => {
  const map = { journal: '期刊论文', conference: '学会论文', degree: '学位论文' }
  return map[type] || '未知'
}

const getPartitionType = (partition) => {
  if (partition?.includes('Q1')) return 'success'
  if (partition?.includes('Q2')) return 'info'
  if (partition?.includes('Q3')) return 'warning'
  return 'danger'
}

const formatDate = (date) => dayjs(date).format('MM-DD')

const handleSearch = () => {
  loadPapers()
}

const handleSelectionChange = (selection) => {
  selectedPapers.value = selection
}

// 详情抽屉
const detailDrawer = ref(false)
const currentPaper = ref(null)

const getBackendOrigin = () => {
  const { protocol, hostname, port } = window.location
  if (port === '8080') return `${protocol}//${hostname}:3000`
  return `${protocol}//${hostname}${port ? ':' + port : ''}`
}

const resolveFileUrl = (pathOrUrl) => {
  if (!pathOrUrl) return ''
  if (String(pathOrUrl).startsWith('http')) return pathOrUrl
  if (String(pathOrUrl).startsWith('/uploads')) return `${getBackendOrigin()}${pathOrUrl}`
  if (String(pathOrUrl).startsWith('uploads')) return `${getBackendOrigin()}/${pathOrUrl}`
  return `${getBackendOrigin()}${pathOrUrl}`
}

const hasFile = computed(() => !!(currentPaper.value?.file_url || currentPaper.value?.file_path))
const resolvedFileUrl = computed(() => resolveFileUrl(currentPaper.value?.file_url || currentPaper.value?.file_path))

const getFileNameFromUrl = (url) => {
  if (!url) return ''
  try {
    const parts = url.split('/')
    const name = parts[parts.length - 1]
    return name.includes('%') ? decodeURIComponent(name) : name
  } catch {
    return ''
  }
}

const previewUrl = ref('')
const previewError = ref('')
const currentFileInfo = ref(null)

const getPreviewUrl = (url) => {
  if (!url) return ''
  if (url.toLowerCase().includes('.pdf')) return `${url}#view=FitH&toolbar=1&navpanes=1`
  return url
}

const handlePreviewError = () => {
  previewError.value = '文件预览失败，可能是文件格式不支持或文件已损坏'
}

const refreshPreview = () => {
  previewError.value = ''
  const url = previewUrl.value
  previewUrl.value = ''
  setTimeout(() => { previewUrl.value = url }, 100)
}

const previewPaperFile = (paper) => {
  const url = resolveFileUrl(paper.file_url || paper.file_path)
  if (!url) return ElMessage.error('文件不存在')
  previewUrl.value = url
  previewError.value = ''
  currentFileInfo.value = {
    name: currentPaper.value?.file_name || getFileNameFromUrl(url) || `${currentPaper.value?.title || 'paper'}.pdf`,
    type: url.toLowerCase().split('.').pop()
  }
}

const openFileInNewTab = () => {
  const url = resolvedFileUrl.value
  if (url) window.open(url, '_blank')
}

const downloadPaperFile = async (paper) => {
  if (!paper?.id) return ElMessage.error('无效的论文ID')
  try {
    const response = await api.get(`/papers/${paper.id}/download`, { responseType: 'blob' })
    const blob = new Blob([response.data])
    const disp = response.headers['content-disposition'] || response.headers['Content-Disposition']
    let filename = paper.file_name || 'paper'
    if (disp) {
      const match = /filename\*=UTF-8''([^;]+)|filename="?([^;"]+)"?/i.exec(disp)
      const raw = match?.[1] || match?.[2]
      if (raw) {
        try { filename = decodeURIComponent(raw) } catch { filename = raw }
      }
    }
    const link = document.createElement('a')
    const objectUrl = window.URL.createObjectURL(blob)
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(objectUrl)
  } catch (e) {
    // 失败则直接打开静态地址
    const url = resolveFileUrl(paper.file_url || paper.file_path)
    if (url) window.open(url, '_blank')
  }
}

const viewPaper = async (paper) => {
  try {
    const resp = await papersApi.getPaperDetail(paper.id)
    currentPaper.value = resp.data?.data || paper
  } catch (e) {
    currentPaper.value = paper
  }
  detailDrawer.value = true
}

const exportSelected = () => {
  ElMessage.info('导出功能开发中...')
}

const loadPapers = async () => {
  loading.value = true
  try {
    const response = await papersApi.getApprovedPapers({
      keyword: searchKeyword.value,
      type: filterType.value,
      partition: filterPartition.value,
      year: filterYear.value,
      page: pagination.current,
      pageSize: pagination.pageSize
    })
    const payload = response.data?.data || {}
    papersList.value = payload.papers || []
    pagination.total = payload.pagination?.total || 0
  } catch (error) {
    // 模拟数据
    papersList.value = [
      {
        id: 1,
        title: '基于深度学习的图像识别算法研究',
        type: 'journal',
        journal: 'Pattern Recognition',
        partition: 'Q1',
        first_author: '张三',
        publish_year: '2024',
        approved_at: '2024-01-20',
        file_url: '/files/paper1.pdf'
      }
    ]
    pagination.total = 1
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPapers()
})
</script>

<style scoped>
.paper-database-container {
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

.papers-table {
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
}

.paper-info {
  padding: 8px 0;
}

.paper-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.paper-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.journal-name {
  font-weight: 500;
  color: var(--text-secondary);
}

.pagination-wrapper {
  padding: 20px;
  text-align: center;
  border-top: 1px solid var(--border-light);
}
</style>