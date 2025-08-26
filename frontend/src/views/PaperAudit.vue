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
                <span class="journal-name">{{ row.journal_name || '未填写' }}</span>
                <span v-if="row.partition_info" class="partition">
                  <el-tag size="small" :type="getPartitionType(row.partition_info)">
                    {{ row.partition_info }}分区
                  </el-tag>
                </span>
                <span v-if="row.publish_year" class="publish-year">
                  {{ row.publish_year }}年
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="first_author" label="第一作者" width="120">
          <template #default="{ row }">
            {{ row.first_author || '未填写' }}
          </template>
        </el-table-column>
        
        <el-table-column prop="corresponding_author" label="通讯作者" width="120">
          <template #default="{ row }">
            {{ row.corresponding_author || '未填写' }}
          </template>
        </el-table-column>
        
        <el-table-column prop="publish_year" label="发表年度" width="100">
          <template #default="{ row }">
            {{ row.publish_year || '未填写' }}
          </template>
        </el-table-column>
        
        <el-table-column prop="user_name" label="提交人" width="100" />
        
        <el-table-column prop="created_at" label="提交时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="等待时间" width="100">
          <template #default="{ row }">
            <span :class="getWaitingTimeClass(row.created_at)">
              {{ getWaitingTime(row.created_at) }}
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
              {{ currentAuditPaper.journal_name || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="期刊分区">
              <el-tag v-if="currentAuditPaper.partition_info" :type="getPartitionType(currentAuditPaper.partition_info)">
                {{ currentAuditPaper.partition_info }}分区
              </el-tag>
              <span v-else>未填写</span>
            </el-descriptions-item>
            <el-descriptions-item label="第一作者">
              {{ currentAuditPaper.first_author || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="通讯作者">
              {{ currentAuditPaper.corresponding_author || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="发表年度">
              {{ currentAuditPaper.publish_year || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="ISSN编号">
              {{ currentAuditPaper.issn || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="DOI">
              {{ currentAuditPaper.doi || '未填写' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        
        <!-- 文件预览 -->
        <div v-if="hasAuditFile" class="file-preview">
          <h3>论文文件</h3>
          <div class="file-info">
            <el-icon><Document /></el-icon>
            <span class="file-name">{{ currentAuditPaper.file_name || getFileNameFromUrl(resolvedAuditFileUrl) }}</span>
            <div class="file-actions">
              <el-button type="primary" size="small" @click="previewFile">
                <el-icon><View /></el-icon>
                在线预览
              </el-button>
              <el-button type="info" size="small" @click="downloadFile">
                <el-icon><Download /></el-icon>
                下载文件
              </el-button>
              <el-button type="success" size="small" @click="openFileInNewTab">
                <el-icon><Link /></el-icon>
                新窗口打开
              </el-button>
            </div>
          </div>
          <div class="file-details">
            <el-descriptions :column="3" size="small" border>
              <el-descriptions-item label="文件类型">
                {{ getFileTypeFromUrl(resolvedAuditFileUrl) }}
              </el-descriptions-item>
              <el-descriptions-item label="文件大小">
                {{ getFileSize(currentAuditPaper.file_url) }}
              </el-descriptions-item>
              <el-descriptions-item label="上传时间">
                {{ formatDate(currentAuditPaper.created_at) }}
              </el-descriptions-item>
            </el-descriptions>
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
      :title="filePreviewTitle"
      width="90%"
      :close-on-click-modal="false"
    >
      <div class="file-preview-container">
        <div class="file-preview-actions" style="margin-bottom: 10px;">
          <el-space>
            <el-button type="info" size="small" @click="downloadCurrentFile">
              <el-icon><Download /></el-icon>
              下载文件
            </el-button>
            <el-button type="primary" size="small" @click="openFileInNewTab">
              <el-icon><View /></el-icon>
              新窗口打开
            </el-button>
            <el-button type="success" size="small" @click="refreshPreview" v-if="previewError">
              <el-icon><Refresh /></el-icon>
              重新加载
            </el-button>
          </el-space>
          <div class="file-info" style="font-size: 12px; color: #666; margin-top: 5px;" v-if="currentFileInfo">
            文件名：{{ currentFileInfo.name }} | 类型：{{ currentFileInfo.type || '未知' }} | 大小：{{ currentFileInfo.size }}
          </div>
        </div>
        
        <!-- PDF/DOC文件预览 -->
        <div v-if="!previewError && previewUrl" class="file-preview-content">
          <iframe
            :src="getPreviewUrl(previewUrl)"
            width="100%"
            height="600px"
            frameborder="0"
            @error="handlePreviewError"
          ></iframe>
        </div>
        
        <!-- 预览错误时显示 -->
        <div v-else-if="previewError" class="preview-error">
          <el-empty description="文件预览失败">
            <template #image>
              <el-icon size="64" color="#cccccc"><DocumentRemove /></el-icon>
            </template>
            <div>
              <p>{{ previewError }}</p>
              <el-space>
                <el-button type="primary" @click="downloadCurrentFile">
                  <el-icon><Download /></el-icon>
                  下载查看
                </el-button>
                <el-button @click="openFileInNewTab">
                  <el-icon><View /></el-icon>
                  浏览器打开
                </el-button>
              </el-space>
            </div>
          </el-empty>
        </div>
        
        <!-- 加载中状态 -->
        <div v-else class="preview-placeholder">
          <el-icon size="64" class="is-loading"><Loading /></el-icon>
          <p>文件预览加载中...</p>
        </div>
      </div>
    </el-dialog>
    
    <!-- 编辑论文信息对话框 -->
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
              <el-input
                v-model="editForm.title"
                placeholder="请输入论文标题"
                maxlength="500"
                show-word-limit
              />
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
              <el-date-picker
                v-model="editForm.publish_year"
                type="year"
                placeholder="选择发表年度"
                format="YYYY"
                value-format="YYYY"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="期刊名称" prop="journal_name">
              <el-input
                v-model="editForm.journal_name"
                placeholder="请输入期刊名称"
                maxlength="200"
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="ISSN编号" prop="issn">
              <el-input
                v-model="editForm.issn"
                placeholder="请输入ISSN编号（如 1234-567X）"
                maxlength="20"
              />
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
              <el-input
                v-model="editForm.first_author"
                placeholder="请输入第一作者"
                maxlength="100"
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="通讯作者" prop="corresponding_author">
              <el-input
                v-model="editForm.corresponding_author"
                placeholder="请输入通讯作者"
                maxlength="100"
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="24">
            <el-form-item label="DOI">
              <el-input
                v-model="editForm.doi"
                placeholder="请输入DOI（可选）"
                maxlength="200"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <!-- 编辑弹窗中的附件信息展示 -->
      <div v-if="hasEditFile" class="file-preview">
        <h3>当前附件</h3>
        <div class="file-info">
          <el-icon><Document /></el-icon>
          <span class="file-name">{{ currentEditPaper?.file_name || getFileNameFromUrl(resolvedEditFileUrl) }}</span>
          <div class="file-actions">
            <el-button type="primary" size="small" @click="() => openUrlInPreview(resolvedEditFileUrl)">
              <el-icon><View /></el-icon>
              在线预览
            </el-button>
            <el-button type="info" size="small" @click="() => openDownloadById(currentEditPaper?.id)">
              <el-icon><Download /></el-icon>
              下载文件
            </el-button>
            <el-button type="success" size="small" @click="() => window.open(resolvedEditFileUrl, '_blank')">
              <el-icon><Link /></el-icon>
              新窗口打开
            </el-button>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialog = false">取消</el-button>
          <el-button type="primary" @click="submitEdit" :loading="editSubmitting">
            保存修改
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { papersApi } from '../api/papers'
import api from '../api'
import dayjs from 'dayjs'

// 响应式数据
const loading = ref(false)
const auditDialog = ref(false)
const filePreviewDialog = ref(false)
const auditSubmitting = ref(false)
const editDialog = ref(false)
const editSubmitting = ref(false)
const pendingPapers = ref([])
const selectedPapers = ref([])
const currentAuditPaper = ref(null)
const currentEditPaper = ref(null)
const previewUrl = ref('')
const previewError = ref('')
const currentFileInfo = ref(null)
// 后端基址（开发环境推断 3000 端口，生产同域）
const getBackendOrigin = () => {
  const { protocol, hostname, port } = window.location
  if (port === '8080') return `${protocol}//${hostname}:3000`
  return `${protocol}//${hostname}${port ? ':' + port : ''}`
}

// 解析文件URL（支持 file_url 或 file_path），并补全为后端可访问地址
const resolveFileUrl = (pathOrUrl) => {
  if (!pathOrUrl) return ''
  if (String(pathOrUrl).startsWith('http')) return pathOrUrl
  // 后端通过 app.use('/uploads', static) 暴露
  if (String(pathOrUrl).startsWith('/uploads')) return `${getBackendOrigin()}${pathOrUrl}`
  if (String(pathOrUrl).startsWith('uploads')) return `${getBackendOrigin()}/${pathOrUrl}`
  return `${getBackendOrigin()}${pathOrUrl}`
}

const hasAuditFile = computed(() => !!(currentAuditPaper.value?.file_url || currentAuditPaper.value?.file_path))
const resolvedAuditFileUrl = computed(() => resolveFileUrl(currentAuditPaper.value?.file_url || currentAuditPaper.value?.file_path))

const hasEditFile = computed(() => !!(currentEditPaper.value?.file_url || currentEditPaper.value?.file_path))
const resolvedEditFileUrl = computed(() => resolveFileUrl(currentEditPaper.value?.file_url || currentEditPaper.value?.file_path))


// 表单引用
const auditFormRef = ref(null)
const editFormRef = ref(null)

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
  // 审核意见改为选填，不做必填与最小长度限制
  comment: []
}

// 编辑表单
const editForm = reactive({
  title: '',
  type: '',
  publish_year: '',
  journal_name: '',
  issn: '',
  partition_info: '',
  first_author: '',
  corresponding_author: '',
  doi: '',
  // 已按需求移除：volume/issue/pages/keywords/abstract
})

// 编辑表单验证规则
const editRules = {
  title: [
    { required: true, message: '请输入论文标题', trigger: 'blur' },
    { min: 5, max: 500, message: '标题长度在 5 到 500 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择论文类型', trigger: 'change' }
  ],
  publish_year: [
    { required: true, message: '请选择发表年度', trigger: 'change' }
  ],
  journal_name: [
    { required: true, message: '请输入期刊名称', trigger: 'blur' }
  ],
  issn: [],
  first_author: [
    { required: true, message: '请输入第一作者', trigger: 'blur' }
  ],
  corresponding_author: [
    { required: true, message: '请输入通讯作者', trigger: 'blur' }
  ]
}

// 文件预览标题
const filePreviewTitle = computed(() => {
  if (currentAuditPaper.value) {
    return `文件预览 - ${currentAuditPaper.value.title}`
  }
  return '文件预览'
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
  const url = resolveFileUrl(paper.file_url || paper.file_path)
  if (url) {
    previewUrl.value = url
    previewError.value = ''
    
    // 设置文件信息
    currentFileInfo.value = {
      name: getFileNameFromUrl(url) || `${paper.title}.pdf`,
      type: getFileTypeFromUrl(url),
      size: '未知'
    }
    
    filePreviewDialog.value = true
  } else {
    ElMessage.error('文件不存在')
  }
}

// 从 authors 列表回退推导作者信息
const deriveAuthors = (paper) => {
  let firstAuthor = paper.first_author || ''
  let correspondingAuthor = paper.corresponding_author || ''
  if ((!firstAuthor || !correspondingAuthor) && Array.isArray(paper.authors) && paper.authors.length > 0) {
    if (!firstAuthor) firstAuthor = paper.authors[0]?.name || ''
    if (!correspondingAuthor) {
      const ca = paper.authors.find(a => a.is_corresponding === true || a.role === 'corresponding')
      correspondingAuthor = ca?.name || ''
    }
  }
  return { firstAuthor, correspondingAuthor }
}

// 统一处理详情数据，填充缺失字段
const normalizePaperForAudit = (raw) => {
  const data = { ...raw }
  const { firstAuthor, correspondingAuthor } = deriveAuthors(data)
  data.first_author = firstAuthor
  data.corresponding_author = correspondingAuthor
  // 兼容后端可能的字段命名
  data.journal_name = data.journal_name || data.journal || ''
  data.partition_info = data.partition_info || data.partition || ''
  if (data.publish_year == null && data.publishYear != null) data.publish_year = data.publishYear
  return data
}

// 编辑论文信息（进入前先获取详情确保字段完整）
const editPaperInfo = async (paper) => {
  let full = paper
  try {
    const resp = await papersApi.getPaperDetail(paper.id)
    full = resp.data?.data || paper
  } catch (e) {}
  const normalized = normalizePaperForAudit(full)
  currentEditPaper.value = normalized
  
  // 填充编辑表单数据，确保所有字段都正确映射
  Object.assign(editForm, {
    title: normalized.title || '',
    type: normalized.type || '',
    publish_year: normalized.publish_year ? String(normalized.publish_year) : '',
    journal_name: normalized.journal_name || '',
    issn: normalized.issn || '',
    partition_info: normalized.partition_info || '',
    first_author: normalized.first_author || '',
    corresponding_author: normalized.corresponding_author || '',
    doi: normalized.doi || '',
    
  })
  
  editDialog.value = true
}

// 开始审核（进入前先获取详情确保字段完整）
const startAudit = async (paper) => {
  let full = paper
  try {
    const resp = await papersApi.getPaperDetail(paper.id)
    full = resp.data?.data || paper
  } catch (e) {}
  currentAuditPaper.value = normalizePaperForAudit(full)
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
  const url = resolvedAuditFileUrl.value
  if (url) {
    previewUrl.value = url
    filePreviewDialog.value = true
  }
}

// 下载文件
const openDownloadById = (id) => {
  if (!id) return
  // 通过受保护的下载端点，确保权限和原始文件名
  window.open(`/api/papers/${id}/download`, '_blank')
}

const downloadFromUrl = async (url, suggestedName) => {
  try {
    if (!url) return
    const response = await fetch(url)
    const blob = await response.blob()
    const link = document.createElement('a')
    const objectUrl = window.URL.createObjectURL(blob)
    link.href = objectUrl
    link.download = suggestedName || getFileNameFromUrl(url) || 'paper'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(objectUrl)
  } catch (e) {
    // 失败则直接打开链接让浏览器处理
    window.open(url, '_blank')
  }
}

const downloadFile = () => {
  const url = resolvedAuditFileUrl.value
  if (!url) return
  // 优先走受保护下载接口，可获取正确文件名与权限校验
  downloadByApi(currentAuditPaper.value?.id, currentAuditPaper.value?.file_name)
    .catch(() => downloadFromUrl(url, currentAuditPaper.value?.file_name))
}

// 下载当前文件
const downloadCurrentFile = () => {
  if (previewUrl.value) {
    const link = document.createElement('a')
    link.href = previewUrl.value
    link.download = `论文原文_${currentAuditPaper.value?.title || 'paper'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// 在新标签页打开文件
const openFileInNewTab = () => {
  const url = resolvedAuditFileUrl.value
  if (url) window.open(url, '_blank')
}

// 获取文件大小（模拟，实际应该从后端获取）
const getFileSize = (url) => {
  if (!url) return '未知'
  // 这里应该从后端获取实际文件大小
  // 暂时返回模拟数据
  const sizes = ['2.5MB', '1.8MB', '3.2MB', '4.1MB', '2.9MB']
  return sizes[Math.floor(Math.random() * sizes.length)]
}

// 获取预览URL（添加预览参数）
const getPreviewUrl = (url) => {
  if (!url) return ''
  
  // 对于PDF文件，可以添加预览参数
  if (url.toLowerCase().includes('.pdf')) {
    return `${url}#view=FitH&toolbar=1&navpanes=1`
  }
  return url
}

const openUrlInPreview = (url) => {
  if (!url) return
  previewUrl.value = resolveFileUrl(url)
  previewError.value = ''
  filePreviewDialog.value = true
}

// 通过受保护端点下载，带上认证头并解析文件名
const downloadByApi = async (paperId, fallbackName) => {
  if (!paperId) throw new Error('no id')
  const response = await api.get(`/papers/${paperId}/download`, { responseType: 'blob' })
  const blob = new Blob([response.data])
  // 从header解析文件名
  const disp = response.headers['content-disposition'] || response.headers['Content-Disposition']
  let filename = fallbackName || 'paper'
  if (disp) {
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^;"]+)"?/i.exec(disp)
    const raw = match?.[1] || match?.[2]
    if (raw) {
      try {
        filename = decodeURIComponent(raw)
      } catch {
        filename = raw
      }
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
}

// 从URL获取文件名
const getFileNameFromUrl = (url) => {
  if (!url) return ''
  try {
    const parts = url.split('/')
    const name = parts[parts.length - 1]
    // 仅当包含百分号时尝试解码，避免非编码中文被误处理
    return name.includes('%') ? decodeURIComponent(name) : name
  } catch (e) {
    return ''
  }
}

// 从URL获取文件类型
const getFileTypeFromUrl = (url) => {
  if (!url) return '未知'
  const extension = url.toLowerCase().split('.').pop()
  const typeMap = {
    'pdf': 'PDF文档',
    'doc': 'Word文档',
    'docx': 'Word文档',
    'txt': '文本文档',
    'rtf': 'RTF文档'
  }
  return typeMap[extension] || `${extension.toUpperCase()}文件`
}

// 处理预览错误
const handlePreviewError = () => {
  previewError.value = '文件预览失败，可能是文件格式不支持或文件已损坏'
}

// 刷新预览
const refreshPreview = () => {
  previewError.value = ''
  // 重新触发预览
  const url = previewUrl.value
  previewUrl.value = ''
  setTimeout(() => {
    previewUrl.value = url
  }, 100)
}

// 提交编辑
const submitEdit = async () => {
  if (!editFormRef.value || !currentEditPaper.value) return
  
  try {
    const valid = await editFormRef.value.validate()
    if (!valid) return
    
    editSubmitting.value = true
    
    // 构建更新数据
    const updateData = {
      title: editForm.title,
      type: editForm.type,
      publish_year: Number(editForm.publish_year),
      journal_name: editForm.journal_name,
      issn: editForm.issn,
      partition_info: editForm.partition_info,
      first_author: editForm.first_author,
      corresponding_author: editForm.corresponding_author,
      doi: editForm.doi,
      
    }
    
    // 调用更新API
    await papersApi.updatePaper(currentEditPaper.value.id, updateData)
    
    ElMessage.success('论文信息更新成功')
    editDialog.value = false
    
    // 刷新数据
    loadPendingPapers()
    
    // 如果当前正在审核的是同一篇论文，更新审核对话框中的显示
    if (currentAuditPaper.value && currentAuditPaper.value.id === currentEditPaper.value.id) {
      Object.assign(currentAuditPaper.value, updateData)
    }
    
  } catch (error) {
    console.error('更新论文失败:', error)
    ElMessage.error('更新论文信息失败: ' + (error.response?.data?.message || error.message))
  } finally {
    editSubmitting.value = false
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
      status: auditForm.result === 'revision' ? 'rejected' : auditForm.result,
      audit_comment: auditForm.comment
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
      status: result,
      audit_comment: result === 'approved' ? '批量审核通过' : '批量审核拒绝'
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
    const payload = response.data?.data || {}
    pendingPapers.value = payload.papers || []
    pagination.total = payload.pagination?.total || 0
  } catch (error) {
    console.error('加载待审核论文失败:', error)
    // 使用模拟数据
    pendingPapers.value = [
      {
        id: 1,
        title: '基于深度学习的图像识别算法研究',
        type: 'journal',
        journal_name: 'Pattern Recognition',
        partition_info: 'Q1',
        first_author: '张三',
        corresponding_author: '张三',
        publish_year: 2024,
        user_name: '张三',
        created_at: '2024-01-10 10:30:00',
        priority: 'high',
        file_url: '/files/paper1.pdf',
        file_name: 'paper1.pdf',
        keywords: '深度学习,图像识别,算法',
        abstract: '本文提出了一种基于深度学习的图像识别算法...'
      },
      {
        id: 2,
        title: '机器学习在自然语言处理中的应用',
        type: 'journal',
        journal_name: 'Computer Science',
        partition_info: 'Q2',
        first_author: '李四',
        corresponding_author: '李四',
        publish_year: 2024,
        user_name: '李四',
        created_at: '2024-01-08 14:20:00',
        priority: 'normal',
        file_url: '/files/paper2.pdf',
        file_name: 'paper2.pdf',
        keywords: '机器学习,自然语言处理,NLP',
        abstract: '本文探讨了机器学习在自然语言处理领域的应用...'
      }
    ]
    pagination.total = 2
  } finally {
    loading.value = false
  }
}

// 加载审核统计（与数据统计页口径一致）
const loadAuditStats = async () => {
  try {
    // 并行请求概览与“今日趋势”数据
    const today = dayjs().format('YYYY-MM-DD')
    const [overviewResp, trendsResp] = await Promise.all([
      api.get('/statistics/overview', { params: {} }),
      api.get('/statistics/trends', { params: { dimension: 'day', startDate: today, endDate: today } })
    ])

    const overview = overviewResp.data?.data || {}
    const trends = trendsResp.data?.data?.trends || []

    const totalStats = overview.total || {}
    const statusStats = overview.byStatus || []

    const pending = Number(statusStats.find(s => s.status === 'pending')?.count || 0)
    const approvedTotal = Number(totalStats.approved_papers || 0)
    const rejectedTotal = Number(statusStats.find(s => s.status === 'rejected')?.count || 0)

    // 今日已审核：取今日趋势中的 approved_papers（注意后端按 created_at 统计）
    const todayApproved = Number(trends[0]?.approvedPapers || 0)

    Object.assign(auditStats, {
      pending,
      todayAudited: todayApproved,
      approved: approvedTotal,
      rejected: rejectedTotal
    })
  } catch (error) {
    console.error('加载审核统计失败:', error)
    // 兜底为 0，避免误导
    Object.assign(auditStats, {
      pending: 0,
      todayAudited: 0,
      approved: 0,
      rejected: 0
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

.publish-year {
  color: var(--text-secondary);
  font-size: 12px;
  background: var(--bg-light);
  padding: 2px 6px;
  border-radius: 4px;
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
  margin-bottom: 16px;
}

.file-name {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary);
}

.file-actions {
  display: flex;
  gap: 8px;
}

.file-details {
  margin-top: 16px;
}

.audit-form h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.file-preview-container {
  width: 100%;
  min-height: 600px;
}

.file-preview-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.file-preview-content {
  position: relative;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-light);
}

.file-preview-content iframe {
  display: block;
  border: none;
  border-radius: 8px;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 600px;
  text-align: center;
  color: var(--text-tertiary);
  background: #fafafa;
  border-radius: 8px;
  border: 2px dashed #ddd;
}

.preview-placeholder p {
  margin-top: 16px;
  font-size: 16px;
}

.preview-error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 600px;
  background: #fafafa;
  border-radius: 8px;
  border: 2px dashed #ddd;
}

.preview-error .el-empty {
  padding: 20px;
}

.file-info {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid var(--primary-color);
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