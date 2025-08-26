<template>
  <div class="my-papers-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">我的论文</h1>
        <p class="page-description">管理您提交的所有论文，支持编辑和状态跟踪</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="$router.push('/submit-paper')">
          <el-icon><Plus /></el-icon>
          提交新论文
        </el-button>
      </div>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-cards">
      <el-col :xs="12" :sm="6">
        <div class="stat-card total">
          <div class="stat-number">{{ stats.total }}</div>
          <div class="stat-label">总论文数</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card approved">
          <div class="stat-number">{{ stats.approved }}</div>
          <div class="stat-label">已通过</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card pending">
          <div class="stat-number">{{ stats.pending }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card draft">
          <div class="stat-number">{{ stats.draft }}</div>
          <div class="stat-label">草稿</div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <el-row :gutter="16" class="filter-row">
        <el-col :xs="24" :sm="6">
          <el-select
            v-model="filters.status"
            placeholder="论文状态"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="全部" value="" />
            <el-option label="草稿" value="draft" />
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="6">
          <el-select
            v-model="filters.type"
            placeholder="论文类型"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="全部" value="" />
            <el-option label="期刊论文" value="journal" />
            <el-option label="学会论文" value="conference" />
            <el-option label="学位论文" value="degree" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="6">
          <el-date-picker
            v-model="filters.year"
            type="year"
            placeholder="发表年度"
            clearable
            format="YYYY"
            value-format="YYYY"
            @change="handleFilterChange"
          />
        </el-col>
        <el-col :xs="24" :sm="6">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索论文标题或期刊"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
      </el-row>
    </div>
    
    <!-- 论文列表 -->
    <div class="papers-list">
      <el-table
        :data="papersList"
        v-loading="loading"
        stripe
        style="width: 100%"
        empty-text="暂无论文数据"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="论文信息" min-width="260">
          <template #default="{ row }">
            <div class="paper-info">
              <div class="paper-title">{{ row.title }}</div>
              <div class="paper-meta">
                <el-tag size="small" class="meta-tag">{{ getTypeText(row.type) }}</el-tag>
                <span class="journal-name">{{ row.journal_name }}</span>
                <span v-if="row.partition_info" class="partition">
                  <el-tag size="small" :type="getPartitionType(row.partition_info)">
                    {{ row.partition_info }}分区
                  </el-tag>
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="first_author" label="第一作者" width="160" />
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="提交时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons" :class="{ compact: row.status === 'draft' || row.status === 'rejected' }">
              <el-button v-if="row.status === 'approved'" text type="primary" size="small" @click="viewPaper(row)">
                查看
              </el-button>
              
              <el-button
                v-if="canEdit(row.status) && row.status !== 'approved'"
                text
                type="warning"
                size="small"
                @click.stop="openEditDialog(row)"
              >
                编辑
              </el-button>
              
              <el-button
                v-if="row.status === 'draft' || row.status === 'rejected'"
                text
                type="success"
                size="small"
                @click="submitForAudit(row)"
              >
                提交
              </el-button>
              
              <el-button
                v-if="canDelete(row.status)"
                text
                type="danger"
                size="small"
                @click="deletePaper(row)"
              >
                删除
              </el-button>
              
              <el-button
                v-if="canWithdraw(row.status)"
                text
                type="info"
                size="small"
                @click="withdrawPaper(row)"
              >
                撤回
              </el-button>
              
              
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 批量操作 -->
      <div v-if="selectedPapers.length > 0" class="batch-actions">
        <div class="batch-info">
          已选择 {{ selectedPapers.length }} 篇论文
        </div>
        <div class="batch-buttons">
          <el-button @click="batchWithdraw" :disabled="!canBatchWithdraw">
            批量撤回
          </el-button>
          <el-button type="danger" @click="batchDelete" :disabled="!canBatchDelete">
            批量删除
          </el-button>
        </div>
      </div>
      
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
    
    <!-- 论文详情抽屉 -->
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
            {{ currentPaper.journal_name }}
          </el-descriptions-item>
          <el-descriptions-item label="期刊分区">
            <el-tag :type="getPartitionType(currentPaper.partition_info)">
              {{ currentPaper.partition_info }}分区
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="ISSN编号">
            {{ currentPaper.issn }}
          </el-descriptions-item>
          <el-descriptions-item label="第一作者">
            {{ currentPaper.first_author }}
          </el-descriptions-item>
          <el-descriptions-item label="通讯作者">
            {{ currentPaper.corresponding_author }}
          </el-descriptions-item>
          <el-descriptions-item label="所有作者">
            {{ currentPaper.all_authors }}
          </el-descriptions-item>
          <el-descriptions-item label="发表年度">
            {{ currentPaper.publish_year }}
          </el-descriptions-item>
          <el-descriptions-item label="DOI">
            {{ currentPaper.doi || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentPaper.status)">
              {{ getStatusText(currentPaper.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ formatDateTime(currentPaper.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ formatDateTime(currentPaper.updated_at) }}
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- 附件预览与下载 -->
        <div v-if="currentPaper.file_url || currentPaper.file_path" class="attachment-actions" style="margin-top: 16px;">
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
          </el-space>
        </div>
        
        <!-- 审核记录 -->
        <div v-if="currentPaper.audit_records" class="audit-records">
          <h3>审核记录</h3>
          <el-timeline>
            <el-timeline-item
              v-for="record in currentPaper.audit_records"
              :key="record.id"
              :timestamp="formatDateTime(record.created_at)"
              placement="top"
            >
              <div class="audit-record">
                <div class="audit-status">
                  <el-tag :type="getStatusType(record.status)">
                    {{ getStatusText(record.status) }}
                  </el-tag>
                </div>
                <div class="audit-content">
                  <p><strong>审核人：</strong>{{ record.auditor }}</p>
                  <p v-if="record.comment"><strong>审核意见：</strong>{{ record.comment }}</p>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-drawer>

    <!-- 编辑论文信息对话框（样式参考审核页） -->
    <el-dialog
      v-model="editDialog"
      title="编辑论文信息"
      width="70%"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="论文标题" prop="title">
              <el-input v-model="editForm.title" maxlength="500" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="论文类型" prop="type">
              <el-select v-model="editForm.type" style="width: 100%">
                <el-option label="期刊论文" value="journal" />
                <el-option label="学会论文" value="conference" />
                <el-option label="学位论文" value="degree" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发表年度" prop="publish_year">
              <el-date-picker v-model="editForm.publish_year" type="year" value-format="YYYY" format="YYYY" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="期刊名称" prop="journal_name">
              <el-input v-model="editForm.journal_name" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="ISSN编号" prop="issn">
              <el-input v-model="editForm.issn" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="期刊分区">
              <el-select v-model="editForm.partition_info" clearable style="width: 100%">
                <el-option label="Q1分区" value="Q1" />
                <el-option label="Q2分区" value="Q2" />
                <el-option label="Q3分区" value="Q3" />
                <el-option label="Q4分区" value="Q4" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="第一作者" prop="first_author">
              <el-input v-model="editForm.first_author" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="通讯作者" prop="corresponding_author">
              <el-input v-model="editForm.corresponding_author" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="DOI">
              <el-input v-model="editForm.doi" maxlength="200" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <!-- 附件预览与下载 -->
      <div v-if="currentPaper && (currentPaper.file_url || currentPaper.file_path)" class="attachment-actions" style="margin-top: 16px;">
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
        </el-space>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialog = false">取消</el-button>
          <el-button type="primary" @click="submitEdit">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { papersApi } from '../api/papers'
import dayjs from 'dayjs'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const detailDrawer = ref(false)
const papersList = ref([])
const selectedPapers = ref([])
const currentPaper = ref(null)

// 筛选条件
const filters = reactive({
  status: '',
  type: '',
  year: '',
  keyword: ''
})

// 分页信息
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

// 统计信息
const stats = reactive({
  total: 0,
  approved: 0,
  pending: 0,
  draft: 0
})

// 计算属性
const canBatchWithdraw = computed(() => {
  return selectedPapers.value.every(paper => canWithdraw(paper.status))
})

const canBatchDelete = computed(() => {
  return selectedPapers.value.every(paper => canDelete(paper.status))
})

// 获取类型文本
const getTypeText = (type) => {
  const typeMap = {
    'journal': '期刊论文',
    'conference': '学会论文',
    'degree': '学位论文'
  }
  return typeMap[type] || '未知'
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

// 获取分区类型
const getPartitionType = (partition) => {
  if (partition?.includes('Q1')) return 'success'
  if (partition?.includes('Q2')) return 'info'
  if (partition?.includes('Q3')) return 'warning'
  return 'danger'
}

// 判断是否可编辑
const canEdit = (status) => {
  // 仅在撤回后（草稿/被拒）可编辑；待审核不可直接编辑
  return ['draft', 'rejected'].includes(status)
}

// 判断是否可撤回
const canWithdraw = (status) => {
  return ['pending'].includes(status)
}

// 判断是否可删除
const canDelete = (status) => {
  return ['draft', 'rejected'].includes(status)
}

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('MM-DD')
}

// 格式化日期时间
const formatDateTime = (datetime) => {
  return dayjs(datetime).format('YYYY-MM-DD HH:mm')
}

// 处理筛选变化
const handleFilterChange = () => {
  pagination.current = 1
  loadPapers()
}

// 处理搜索
const handleSearch = () => {
  pagination.current = 1
  loadPapers()
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedPapers.value = selection
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.current = page
  loadPapers()
}

// 处理页大小变化
const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  loadPapers()
}

// 查看论文
const viewPaper = (paper) => {
  currentPaper.value = paper
  detailDrawer.value = true
  // 加载详细信息和审核记录
  loadPaperDetail(paper.id)
}

// 打开编辑弹窗（沿用审核页的编辑信息风格）
const editDialog = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  title: '',
  type: '',
  publish_year: '',
  journal_name: '',
  issn: '',
  partition_info: '',
  first_author: '',
  corresponding_author: '',
  doi: ''
})

const editRules = {
  title: [{ required: true, message: '请输入论文标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择论文类型', trigger: 'change' }],
  publish_year: [{ required: true, message: '请选择发表年度', trigger: 'change' }],
  journal_name: [{ required: true, message: '请输入期刊名称', trigger: 'blur' }]
}

const openEditDialog = async (paper) => {
  currentPaper.value = paper
  // 拉取详情以确保完整信息
  try {
    const resp = await papersApi.getPaperDetail(paper.id)
    const p = resp.data?.data || paper
    Object.assign(editForm, {
      title: p.title || '',
      type: p.type || '',
      publish_year: p.publish_year ? String(p.publish_year) : '',
      journal_name: p.journal_name || '',
      issn: p.issn || '',
      partition_info: p.partition_info || '',
      first_author: p.first_author || '',
      corresponding_author: p.corresponding_author || '',
      doi: p.doi || ''
    })
  } catch (e) {}
  editDialog.value = true
}

const submitEdit = async () => {
  if (!currentPaper.value) return
  try {
    const ok = await editFormRef.value?.validate()
    if (ok === false) return
    await papersApi.updatePaper(currentPaper.value.id, {
      title: editForm.title,
      type: editForm.type,
      publish_year: Number(editForm.publish_year),
      journal_name: editForm.journal_name,
      issn: editForm.issn,
      partition_info: editForm.partition_info,
      first_author: editForm.first_author,
      corresponding_author: editForm.corresponding_author,
      doi: editForm.doi
    })
    ElMessage.success('保存成功')
    editDialog.value = false
    loadPapers()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

// 撤回论文
const withdrawPaper = async (paper) => {
  try {
    await ElMessageBox.confirm(
      `确定要撤回论文《${paper.title}》吗？撤回后可以重新编辑提交。`,
      '确认撤回',
      {
        confirmButtonText: '确定撤回',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await papersApi.withdrawPaper(paper.id)
    ElMessage.success('论文撤回成功')
    loadPapers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('撤回失败')
    }
  }
}

// 处理更多操作
// 更多操作下拉已移除

// 下载论文文件
const resolveFileUrl = (pathOrUrl) => {
  if (!pathOrUrl) return ''
  if (String(pathOrUrl).startsWith('http')) return pathOrUrl
  const { protocol, hostname, port } = window.location
  const origin = port === '8080' ? `${protocol}//${hostname}:3000` : `${protocol}//${hostname}${port ? ':'+port : ''}`
  if (String(pathOrUrl).startsWith('/uploads')) return `${origin}${pathOrUrl}`
  if (String(pathOrUrl).startsWith('uploads')) return `${origin}/${pathOrUrl}`
  return `${origin}${pathOrUrl}`
}

const previewPaperFile = (paper) => {
  const url = resolveFileUrl(paper.file_url || paper.file_path)
  if (!url) return ElMessage.error('文件不存在')
  window.open(url, '_blank')
}

const downloadPaperFile = (paper) => {
  const url = resolveFileUrl(paper.file_url || paper.file_path)
  if (!url) return ElMessage.error('文件不存在')
  window.open(`/api/papers/${paper.id}/download`, '_blank')
}

// 草稿提交审核
const submitForAudit = async (paper) => {
  try {
    await ElMessageBox.confirm(
      `确定要提交《${paper.title}》进行审核吗？提交后将无法编辑。`,
      '确认提交',
      { confirmButtonText: '确定提交', cancelButtonText: '取消', type: 'warning' }
    )
    await papersApi.updatePaper(paper.id, { status: 'pending' })
    ElMessage.success('已提交审核')
    loadPapers()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('提交失败')
  }
}

// 查看论文历史
const viewPaperHistory = (paper) => {
  ElMessage.info('查看论文历史功能开发中...')
}

// 删除论文
const deletePaper = async (paper) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除论文《${paper.title}》吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )
    
    await papersApi.deletePaper(paper.id)
    ElMessage.success('论文删除成功')
    loadPapers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 批量撤回
const batchWithdraw = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要撤回选中的 ${selectedPapers.value.length} 篇论文吗？`,
      '批量撤回',
      {
        confirmButtonText: '确定撤回',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const paperIds = selectedPapers.value.map(paper => paper.id)
    
    // 这里应该调用批量撤回API
    for (const id of paperIds) {
      await papersApi.withdrawPaper(id)
    }
    
    ElMessage.success('批量撤回成功')
    selectedPapers.value = []
    loadPapers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量撤回失败')
    }
  }
}

// 批量删除
const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedPapers.value.length} 篇论文吗？此操作不可恢复。`,
      '批量删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )
    
    const paperIds = selectedPapers.value.map(paper => paper.id)
    
    // 这里应该调用批量删除API
    for (const id of paperIds) {
      await papersApi.deletePaper(id)
    }
    
    ElMessage.success('批量删除成功')
    selectedPapers.value = []
    loadPapers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

// 加载论文列表
const loadPapers = async () => {
  loading.value = true
  
  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      status: filters.status,
      type: filters.type,
      year: filters.year,
      keyword: filters.keyword
    }
    
    const response = await papersApi.getMyPapers(params)
    const payload = response.data?.data || {}
    papersList.value = payload.papers || []
    pagination.total = payload.pagination?.total || 0
    
    // 简单统计（客户端计算）
    stats.total = papersList.value.length
    stats.approved = papersList.value.filter(p => p.status === 'approved').length
    stats.pending = papersList.value.filter(p => p.status === 'pending').length
    stats.draft = papersList.value.filter(p => p.status === 'draft').length
    
  } catch (error) {
    console.error('加载论文列表失败:', error)
    // 使用模拟数据
    papersList.value = [
      {
        id: 1,
        title: '基于深度学习的图像识别算法研究',
        type: 'journal',
        journal: 'Pattern Recognition',
        partition: 'Q1',
        issn: '0031-3203',
        first_author: '张三',
        corresponding_author: '李四',
        status: 'approved',
        created_at: '2024-01-15',
        updated_at: '2024-01-20',
        file_url: '/files/paper1.pdf'
      },
      {
        id: 2,
        title: '机器学习在自然语言处理中的应用',
        type: 'journal',
        journal: 'Computer Science',
        partition: 'Q2',
        issn: '1234-5678',
        first_author: '王五',
        corresponding_author: '赵六',
        status: 'pending',
        created_at: '2024-01-10',
        updated_at: '2024-01-10',
        file_url: '/files/paper2.pdf'
      },
      {
        id: 3,
        title: '人工智能发展趋势分析',
        type: 'conference',
        journal: 'AI Conference 2024',
        partition: 'Q3',
        first_author: '陈七',
        corresponding_author: '周八',
        status: 'draft',
        created_at: '2024-01-05',
        updated_at: '2024-01-08'
      }
    ]
    
    stats.total = 3
    stats.approved = 1
    stats.pending = 1
    stats.draft = 1
    pagination.total = 3
  } finally {
    loading.value = false
  }
}

// 加载论文详情
const loadPaperDetail = async (paperId) => {
  try {
    const response = await papersApi.getPaperDetail(paperId)
    currentPaper.value = response.data?.data
  } catch (error) {
    console.error('加载论文详情失败:', error)
    // 模拟审核记录
    if (currentPaper.value) {
      currentPaper.value.audit_records = [
        {
          id: 1,
          status: 'pending',
          auditor: '审核员A',
          comment: '论文已收到，正在审核中...',
          created_at: '2024-01-15 10:00:00'
        }
      ]
    }
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadPapers()
})
</script>

<style scoped>
.my-papers-container {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}

.header-left {
  flex: 1;
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

.stats-cards {
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

.stat-card.approved {
  border-left: 4px solid var(--success-color);
}

.stat-card.pending {
  border-left: 4px solid var(--warning-color);
}

.stat-card.draft {
  border-left: 4px solid var(--info-color);
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-card.total .stat-number {
  color: var(--primary-color);
}

.stat-card.approved .stat-number {
  color: var(--success-color);
}

.stat-card.pending .stat-number {
  color: var(--warning-color);
}

.stat-card.draft .stat-number {
  color: var(--info-color);
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
  margin-bottom: 24px;
}

.filter-row {
  align-items: center;
}

.papers-list {
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.paper-info {
  padding: 8px 0;
}

.paper-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.paper-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.meta-tag {
  margin-right: 4px;
}

.journal-name {
  font-weight: 500;
}

.partition {
  margin-left: auto;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}
.action-buttons.compact .el-button + .el-button {
  margin-left: 4px;
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--primary-light);
  border-top: 1px solid var(--border-light);
}

.batch-info {
  color: var(--primary-color);
  font-weight: 500;
}

.batch-buttons {
  display: flex;
  gap: 8px;
}

.pagination-wrapper {
  padding: 20px;
  text-align: center;
  border-top: 1px solid var(--border-light);
}

.paper-detail {
  padding: 16px 0;
}

.audit-records {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light);
}

.audit-records h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.audit-record {
  background: var(--bg-light);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.audit-status {
  margin-bottom: 8px;
}

.audit-content p {
  margin: 4px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .my-papers-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .filter-row .el-col {
    margin-bottom: 8px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .batch-actions {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
}
</style>