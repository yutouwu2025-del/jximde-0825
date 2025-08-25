<template>
  <div class="paper-audit-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">论文审核</h1>
      <p class="page-description">审核待处理的论文，确保论文质量和信息准确性</p>
    </div>
    
    <!-- 审核统计 -->
    <el-row :gutter="16" class="audit-stats">
      <el-col :xs="12" :sm="6">
        <div class="stat-card pending">
          <div class="stat-number">{{ auditStats.pending }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card today">
          <div class="stat-number">{{ auditStats.todayAudited }}</div>
          <div class="stat-label">今日已审核</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card approved">
          <div class="stat-number">{{ auditStats.approved }}</div>
          <div class="stat-label">本月通过</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card rejected">
          <div class="stat-number">{{ auditStats.rejected }}</div>
          <div class="stat-label">本月拒绝</div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 筛选条件 -->
    <div class="filter-section">
      <el-row :gutter="16">
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
          <el-select
            v-model="filters.priority"
            placeholder="优先级"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="全部" value="" />
            <el-option label="高优先级" value="high" />
            <el-option label="普通" value="normal" />
            <el-option label="低优先级" value="low" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="6">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleFilterChange"
          />
        </el-col>
        <el-col :xs="24" :sm="6">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索论文标题或作者"
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
    
    <!-- 批量操作 -->
    <div v-if="selectedPapers.length > 0" class="batch-operations">
      <div class="batch-info">
        已选择 {{ selectedPapers.length }} 篇论文
      </div>
      <div class="batch-actions">
        <el-button type="success" @click="batchAudit('approved')">
          批量通过
        </el-button>
        <el-button type="danger" @click="batchAudit('rejected')">
          批量拒绝
        </el-button>
      </div>
    </div>
    
    <!-- 待审核论文列表 -->
    <div class="papers-table">
      <el-table
        :data="pendingPapers"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        stripe
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="优先级" width="80">
          <template #default="{ row }">
            <el-tag 
              :type="getPriorityType(row.priority)"
              size="small"
            >
              {{ getPriorityText(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="论文信息" min-width="300">
          <template #default="{ row }">
            <div class="paper-info">
              <div class="paper-title" @click="viewPaperDetail(row)">
                {{ row.title }}
              </div>
              <div class="paper-meta">
                <el-tag size="small" class="meta-tag">{{ getTypeText(row.type) }}</el-tag>
                <span class="journal-name">{{ row.journal }}</span>
                <span v-if="row.partition" class="partition">
                  <el-tag size="small" :type="getPartitionType(row.partition)">
                    {{ row.partition }}分区
                  </el-tag>
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="first_author" label="第一作者" width="120" />
        
        <el-table-column prop="submitter" label="提交人" width="100" />
        
        <el-table-column prop="submit_time" label="提交时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.submit_time) }}
          </template>
        </el-table-column>
        
        <el-table-column label="等待时间" width="100">
          <template #default="{ row }">
            <span :class="getWaitingTimeClass(row.submit_time)">
              {{ getWaitingTime(row.submit_time) }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button 
                type="primary" 
                size="small" 
                @click="startAudit(row)"
              >
                审核
              </el-button>
              <el-button 
                text
                type="info" 
                size="small" 
                @click="viewPaperFile(row)"
                v-if="row.file_url"
              >
                查看原文
              </el-button>
              <el-button 
                text
                type="warning" 
                size="small" 
                @click="editPaperInfo(row)"
              >
                编辑信息
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
    
    <!-- 论文审核对话框 -->
    <el-dialog
      v-model="auditDialog"
      title="论文审核"
      width="80%"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="currentAuditPaper" class="audit-content">
        <!-- 论文信息展示 -->
        <div class="paper-details">
          <h3>论文基本信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="论文标题">
              {{ currentAuditPaper.title }}
            </el-descriptions-item>
            <el-descriptions-item label="论文类型">
              {{ getTypeText(currentAuditPaper.type) }}
            </el-descriptions-item>
            <el-descriptions-item label="期刊名称">
              {{ currentAuditPaper.journal }}
            </el-descriptions-item>
            <el-descriptions-item label="期刊分区">
              <el-tag :type="getPartitionType(currentAuditPaper.partition)">
                {{ currentAuditPaper.partition }}分区
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="第一作者">
              {{ currentAuditPaper.first_author }}
            </el-descriptions-item>
            <el-descriptions-item label="通讯作者">
              {{ currentAuditPaper.corresponding_author }}
            </el-descriptions-item>
            <el-descriptions-item label="发表年度">
              {{ currentAuditPaper.publish_year }}
            </el-descriptions-item>
            <el-descriptions-item label="DOI">
              {{ currentAuditPaper.doi || '未填写' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        
        <!-- 文件预览 -->
        <div v-if="currentAuditPaper.file_url" class="file-preview">
          <h3>论文文件</h3>
          <div class="file-info">
            <el-icon><Document /></el-icon>
            <span>{{ currentAuditPaper.file_name }}</span>
            <el-button type="primary" size="small" @click="previewFile">
              在线预览
            </el-button>
            <el-button type="info" size="small" @click="downloadFile">
              下载文件
            </el-button>
          </div>
        </div>
        
        <!-- 审核表单 -->
        <div class="audit-form">
          <h3>审核意见</h3>
          <el-form
            ref="auditFormRef"
            :model="auditForm"
            :rules="auditRules"
            label-width="100px"
          >
            <el-form-item label="审核结果" prop="result">
              <el-radio-group v-model="auditForm.result">
                <el-radio label="approved">通过</el-radio>
                <el-radio label="rejected">拒绝</el-radio>
                <el-radio label="revision">需要修改</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <el-form-item label="审核意见" prop="comment">
              <el-input
                v-model="auditForm.comment"
                type="textarea"
                :rows="4"
                placeholder="请填写详细的审核意见..."
              />
            </el-form-item>
            
            <el-form-item v-if="auditForm.result === 'rejected'" label="拒绝原因" prop="rejectReason">
              <el-checkbox-group v-model="auditForm.rejectReasons">
                <el-checkbox label="信息不完整">信息不完整</el-checkbox>
                <el-checkbox label="期刊信息错误">期刊信息错误</el-checkbox>
                <el-checkbox label="文件格式不正确">文件格式不正确</el-checkbox>
                <el-checkbox label="作者信息有误">作者信息有误</el-checkbox>
                <el-checkbox label="其他">其他</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            
            <el-form-item label="优先级调整">
              <el-select v-model="auditForm.priority" placeholder="选择优先级">
                <el-option label="高优先级" value="high" />
                <el-option label="普通" value="normal" />
                <el-option label="低优先级" value="low" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="auditDialog = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="submitAudit"
            :loading="auditSubmitting"
          >
            提交审核
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="filePreviewDialog"
      title="文件预览"
      width="90%"
      :close-on-click-modal="false"
    >
      <div class="file-preview-container">
        <iframe
          v-if="previewUrl"
          :src="previewUrl"
          width="100%"
          height="600px"
          frameborder="0"
        ></iframe>
        <div v-else class="preview-placeholder">
          <el-icon size="64"><Document /></el-icon>
          <p>文件预览加载中...</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { papersApi } from '../api/papers'
import dayjs from 'dayjs'

// 响应式数据
const loading = ref(false)
const auditDialog = ref(false)
const filePreviewDialog = ref(false)
const auditSubmitting = ref(false)
const pendingPapers = ref([])
const selectedPapers = ref([])
const currentAuditPaper = ref(null)
const previewUrl = ref('')

// 表单引用
const auditFormRef = ref(null)

// 筛选条件
const filters = reactive({
  type: '',
  priority: '',
  dateRange: [],
  keyword: ''
})

// 分页信息
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

// 审核统计
const auditStats = reactive({
  pending: 0,
  todayAudited: 0,
  approved: 0,
  rejected: 0
})

// 审核表单
const auditForm = reactive({
  result: '',
  comment: '',
  rejectReasons: [],
  priority: 'normal'
})

// 审核表单验证规则
const auditRules = {
  result: [
    { required: true, message: '请选择审核结果', trigger: 'change' }
  ],
  comment: [
    { required: true, message: '请填写审核意见', trigger: 'blur' },
    { min: 10, message: '审核意见至少10个字符', trigger: 'blur' }
  ]
}

// 获取类型文本
const getTypeText = (type) => {
  const typeMap = {
    'journal': '期刊论文',
    'conference': '学会论文',
    'degree': '学位论文'
  }
  return typeMap[type] || '未知'
}

// 获取优先级类型
const getPriorityType = (priority) => {
  const priorityMap = {
    'high': 'danger',
    'normal': 'info',
    'low': 'success'
  }
  return priorityMap[priority] || 'info'
}

// 获取优先级文本
const getPriorityText = (priority) => {
  const priorityMap = {
    'high': '高',
    'normal': '普通',
    'low': '低'
  }
  return priorityMap[priority] || '普通'
}

// 获取分区类型
const getPartitionType = (partition) => {
  if (partition?.includes('Q1')) return 'success'
  if (partition?.includes('Q2')) return 'info'
  if (partition?.includes('Q3')) return 'warning'
  return 'danger'
}

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('MM-DD HH:mm')
}

// 获取等待时间
const getWaitingTime = (submitTime) => {
  const days = dayjs().diff(dayjs(submitTime), 'day')
  if (days === 0) return '今天'
  return `${days}天`
}

// 获取等待时间样式类
const getWaitingTimeClass = (submitTime) => {
  const days = dayjs().diff(dayjs(submitTime), 'day')
  if (days >= 7) return 'waiting-long'
  if (days >= 3) return 'waiting-medium'
  return 'waiting-short'
}

// 处理筛选变化
const handleFilterChange = () => {
  pagination.current = 1
  loadPendingPapers()
}

// 处理搜索
const handleSearch = () => {
  pagination.current = 1
  loadPendingPapers()
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedPapers.value = selection
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.current = page
  loadPendingPapers()
}

// 处理页大小变化
const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  loadPendingPapers()
}

// 查看论文详情
const viewPaperDetail = (paper) => {
  ElMessage.info('论文详情功能开发中...')
}

// 查看论文文件
const viewPaperFile = (paper) => {
  if (paper.file_url) {
    previewUrl.value = paper.file_url
    filePreviewDialog.value = true
  } else {
    ElMessage.error('文件不存在')
  }
}

// 编辑论文信息
const editPaperInfo = (paper) => {
  ElMessage.info('编辑论文信息功能开发中...')
}

// 开始审核
const startAudit = (paper) => {
  currentAuditPaper.value = paper
  // 重置表单
  Object.assign(auditForm, {
    result: '',
    comment: '',
    rejectReasons: [],
    priority: paper.priority || 'normal'
  })
  auditDialog.value = true
}

// 预览文件
const previewFile = () => {
  if (currentAuditPaper.value?.file_url) {
    previewUrl.value = currentAuditPaper.value.file_url
    filePreviewDialog.value = true
  }
}

// 下载文件
const downloadFile = () => {
  if (currentAuditPaper.value?.file_url) {
    window.open(currentAuditPaper.value.file_url, '_blank')
  }
}

// 提交审核
const submitAudit = async () => {
  if (!auditFormRef.value) return
  
  try {
    const valid = await auditFormRef.value.validate()
    if (!valid) return
    
    auditSubmitting.value = true
    
    const auditData = {
      paperId: currentAuditPaper.value.id,
      result: auditForm.result,
      comment: auditForm.comment,
      rejectReasons: auditForm.rejectReasons,
      priority: auditForm.priority
    }
    
    await papersApi.auditPaper(currentAuditPaper.value.id, auditData)
    
    ElMessage.success('审核提交成功')
    auditDialog.value = false
    loadPendingPapers()
    loadAuditStats()
  } catch (error) {
    ElMessage.error('审核提交失败')
  } finally {
    auditSubmitting.value = false
  }
}

// 批量审核
const batchAudit = async (result) => {
  if (selectedPapers.value.length === 0) {
    ElMessage.warning('请选择要审核的论文')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要批量${result === 'approved' ? '通过' : '拒绝'}选中的 ${selectedPapers.value.length} 篇论文吗？`,
      '批量审核确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const paperIds = selectedPapers.value.map(paper => paper.id)
    
    await papersApi.batchAuditPapers(paperIds, {
      result,
      comment: result === 'approved' ? '批量审核通过' : '批量审核拒绝'
    })
    
    ElMessage.success('批量审核成功')
    selectedPapers.value = []
    loadPendingPapers()
    loadAuditStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量审核失败')
    }
  }
}

// 加载待审核论文
const loadPendingPapers = async () => {
  loading.value = true
  
  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      type: filters.type,
      priority: filters.priority,
      keyword: filters.keyword,
      startDate: filters.dateRange?.[0],
      endDate: filters.dateRange?.[1]
    }
    
    const response = await papersApi.getPendingPapers(params)
    
    pendingPapers.value = response.data.papers || []
    pagination.total = response.data.total || 0
  } catch (error) {
    console.error('加载待审核论文失败:', error)
    // 使用模拟数据
    pendingPapers.value = [
      {
        id: 1,
        title: '基于深度学习的图像识别算法研究',
        type: 'journal',
        journal: 'Pattern Recognition',
        partition: 'Q1',
        first_author: '张三',
        submitter: '张三',
        submit_time: '2024-01-10 10:30:00',
        priority: 'high',
        file_url: '/files/paper1.pdf',
        file_name: 'paper1.pdf'
      },
      {
        id: 2,
        title: '机器学习在自然语言处理中的应用',
        type: 'journal',
        journal: 'Computer Science',
        partition: 'Q2',
        first_author: '李四',
        submitter: '李四',
        submit_time: '2024-01-08 14:20:00',
        priority: 'normal',
        file_url: '/files/paper2.pdf',
        file_name: 'paper2.pdf'
      }
    ]
    pagination.total = 2
  } finally {
    loading.value = false
  }
}

// 加载审核统计
const loadAuditStats = async () => {
  try {
    const response = await papersApi.getPaperStats({ type: 'audit' })
    
    Object.assign(auditStats, {
      pending: response.data.pending || 0,
      todayAudited: response.data.todayAudited || 0,
      approved: response.data.approved || 0,
      rejected: response.data.rejected || 0
    })
  } catch (error) {
    console.error('加载审核统计失败:', error)
    // 使用模拟数据
    Object.assign(auditStats, {
      pending: 15,
      todayAudited: 8,
      approved: 23,
      rejected: 5
    })
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadPendingPapers()
  loadAuditStats()
})
</script>

<style scoped>
.paper-audit-container {
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

.audit-stats {
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

.stat-card.pending {
  border-left: 4px solid var(--warning-color);
}

.stat-card.today {
  border-left: 4px solid var(--info-color);
}

.stat-card.approved {
  border-left: 4px solid var(--success-color);
}

.stat-card.rejected {
  border-left: 4px solid var(--error-color);
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-card.pending .stat-number {
  color: var(--warning-color);
}

.stat-card.today .stat-number {
  color: var(--info-color);
}

.stat-card.approved .stat-number {
  color: var(--success-color);
}

.stat-card.rejected .stat-number {
  color: var(--error-color);
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

.batch-operations {
  background: var(--primary-light);
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.batch-info {
  color: var(--primary-color);
  font-weight: 500;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.papers-table {
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
  color: var(--primary-color);
  cursor: pointer;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.paper-title:hover {
  text-decoration: underline;
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

.waiting-short {
  color: var(--success-color);
}

.waiting-medium {
  color: var(--warning-color);
}

.waiting-long {
  color: var(--error-color);
  font-weight: 500;
}

.pagination-wrapper {
  padding: 20px;
  text-align: center;
  border-top: 1px solid var(--border-light);
}

.audit-content {
  max-height: 70vh;
  overflow-y: auto;
}

.paper-details {
  margin-bottom: 24px;
}

.paper-details h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.file-preview {
  margin-bottom: 24px;
}

.file-preview h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-light);
  border-radius: 8px;
}

.file-info span {
  flex: 1;
  font-weight: 500;
}

.audit-form h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.file-preview-container {
  width: 100%;
  height: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-placeholder {
  text-align: center;
  color: var(--text-tertiary);
}

.preview-placeholder p {
  margin-top: 16px;
  font-size: 16px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .paper-audit-container {
    padding: 16px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .batch-operations {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .audit-content {
    max-height: 60vh;
  }
}
</style>