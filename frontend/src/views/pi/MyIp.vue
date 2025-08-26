<template>
  <div class="my-ip-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">我的专利/软著</h1>
        <p class="page-description">管理您提交的所有专利和软件著作权，支持编辑和状态跟踪</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="$router.push('/ip-submit')">
          <el-icon><Plus /></el-icon>
          提交新申请
        </el-button>
      </div>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-cards">
      <el-col :xs="12" :sm="6">
        <div class="stat-card total">
          <div class="stat-number">{{ stats.totalPatents + stats.totalCopyrights }}</div>
          <div class="stat-label">总数量</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card patent">
          <div class="stat-number">{{ stats.totalPatents }}</div>
          <div class="stat-label">专利</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card copyright">
          <div class="stat-number">{{ stats.totalCopyrights }}</div>
          <div class="stat-label">软著</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card approved">
          <div class="stat-number">{{ stats.approved }}</div>
          <div class="stat-label">已通过</div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <el-row :gutter="16" class="filter-row">
        <el-col :xs="24" :sm="6">
          <el-select
            v-model="filters.type"
            placeholder="类型筛选"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="全部" value="" />
            <el-option label="专利" value="patent" />
            <el-option label="软著" value="copyright" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="6">
          <el-select
            v-model="filters.status"
            placeholder="状态筛选"
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
        <el-col :xs="24" :sm="8">
          <el-input
            v-model="filters.keyword"
            placeholder="请输入关键词搜索"
            clearable
            @change="handleFilterChange"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :xs="24" :sm="4">
          <el-button type="primary" @click="loadData">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </el-col>
      </el-row>
    </div>
    
    <!-- 数据表格 -->
    <div class="table-section">
      <el-table
        v-loading="tableLoading"
        :data="tableData"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.item_type === 'patent' ? 'warning' : 'success'" size="small">
              {{ row.item_type === 'patent' ? '专利' : '软著' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="title-cell">
              <div class="title">{{ row.title || row.software_name }}</div>
              <div v-if="row.patent_type" class="subtitle">
                {{ getPatentTypeLabel(row.patent_type) }}
              </div>
              <div v-else-if="row.version_number" class="subtitle">
                版本：{{ row.version_number }}
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="负责人" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.first_inventor || row.first_applicant }}
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="提交时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="审核时间" width="120">
          <template #default="{ row }">
            {{ row.audit_time ? formatDate(row.audit_time) : '-' }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <!-- 已通过状态：仅显示查看 -->
              <el-button
                v-if="row.status === 'approved'"
                text
                type="primary"
                size="small"
                @click="viewDetail(row)"
              >
                查看
              </el-button>
              
              <!-- 待审核状态：仅显示撤回 -->
              <el-button
                v-if="canWithdraw(row.status)"
                text
                type="info"
                size="small"
                @click="withdrawItem(row)"
              >
                撤回
              </el-button>
              
              <!-- 草稿/已拒绝状态：显示编辑、提交、删除 -->
              <template v-if="row.status === 'draft' || row.status === 'rejected'">
                <el-button
                  text
                  type="warning"
                  size="small"
                  @click="editItem(row)"
                >
                  编辑
                </el-button>
                
                <el-button
                  text
                  type="success"
                  size="small"
                  @click="submitForAudit(row)"
                >
                  提交
                </el-button>
                
                <el-button
                  text
                  type="danger"
                  size="small"
                  @click="deleteItem(row)"
                >
                  删除
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
    
    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentDetail?.item_type === 'patent' ? '专利详情' : '软著详情'"
      width="80%"
      top="5vh"
    >
      <div v-if="currentDetail" class="detail-content">
        <!-- 专利详情 -->
        <template v-if="currentDetail.item_type === 'patent'">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="专利名称" :span="2">
              {{ currentDetail.title }}
            </el-descriptions-item>
            <el-descriptions-item label="专利类型">
              {{ getPatentTypeLabel(currentDetail.patent_type) }}
            </el-descriptions-item>
            <el-descriptions-item label="所属部门">
              {{ currentDetail.department_name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="第一发明人">
              {{ currentDetail.first_inventor }}
            </el-descriptions-item>
            <el-descriptions-item label="第一专利权人">
              {{ currentDetail.first_patentee || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="申请日期">
              {{ currentDetail.application_date || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="授权年度">
              {{ currentDetail.authorization_year || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="专利号">
              {{ currentDetail.patent_number || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="授权公告日">
              {{ currentDetail.authorization_date || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="其他发明人" :span="2">
              {{ currentDetail.other_inventors?.join('、') || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="专利摘要" :span="2">
              {{ currentDetail.abstract || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
        
        <!-- 软著详情 -->
        <template v-else>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="软件名称" :span="2">
              {{ currentDetail.software_name }}
            </el-descriptions-item>
            <el-descriptions-item label="版本号">
              {{ currentDetail.version_number || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="登记号">
              {{ currentDetail.registration_number || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="所属部门">
              {{ currentDetail.department_name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="著作权人">
              {{ currentDetail.copyright_owner }}
            </el-descriptions-item>
            <el-descriptions-item label="第一申请人">
              {{ currentDetail.first_applicant }}
            </el-descriptions-item>
            <el-descriptions-item label="登记日期">
              {{ currentDetail.registration_date || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="公告日期">
              {{ currentDetail.publication_date || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="开发完成日">
              {{ currentDetail.development_completion_date || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="其他申请人" :span="2">
              {{ currentDetail.other_applicants?.join('、') || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="软件描述" :span="2">
              {{ currentDetail.description || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
        
        <!-- 通用信息 -->
        <el-descriptions :column="2" border style="margin-top: 20px">
          <el-descriptions-item label="提交时间">
            {{ formatDate(currentDetail.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentDetail.status)">
              {{ getStatusLabel(currentDetail.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审核人">
            {{ currentDetail.auditor_name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="审核时间">
            {{ currentDetail.audit_time ? formatDate(currentDetail.audit_time) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="审核意见" :span="2">
            {{ currentDetail.audit_comment || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
    
    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="`编辑${currentEditItem?.item_type === 'patent' ? '专利' : '软著'}信息`"
      width="80%"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editFormRules"
        label-width="120px"
        size="default"
      >
        <!-- 专利编辑表单 -->
        <template v-if="currentEditItem?.item_type === 'patent'">
          <el-form-item label="专利名称" prop="title">
            <el-input
              v-model="editForm.title"
              placeholder="请输入专利名称"
              maxlength="300"
              show-word-limit
            />
          </el-form-item>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="专利类型" prop="patent_type">
                <el-select v-model="editForm.patent_type" placeholder="请选择专利类型">
                  <el-option label="发明专利" value="invention" />
                  <el-option label="实用新型" value="utility_model" />
                  <el-option label="外观设计" value="design" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="所属部门">
                <el-select v-model="editForm.department_id" placeholder="请选择所属部门" clearable>
                  <el-option
                    v-for="dept in departments"
                    :key="dept.id"
                    :label="dept.name"
                    :value="dept.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="第一专利权人">
            <el-input
              v-model="editForm.first_patentee"
              placeholder="请输入第一专利权人"
            />
          </el-form-item>
          
          <el-form-item label="第一发明人" prop="first_inventor">
            <el-input
              v-model="editForm.first_inventor"
              placeholder="请输入第一发明人姓名"
            />
          </el-form-item>
          
          <el-form-item label="其他发明人">
            <div class="inventors-section">
              <div
                v-for="(inventor, index) in editForm.other_inventors"
                :key="index"
                class="inventor-item"
              >
                <el-input
                  v-model="editForm.other_inventors[index]"
                  placeholder="请输入发明人姓名"
                  style="flex: 1; margin-right: 8px"
                />
                <el-button
                  type="danger"
                  size="small"
                  circle
                  @click="removeInventor(index)"
                >
                  ×
                </el-button>
              </div>
              <el-button
                type="dashed"
                style="width: 100%; margin-top: 8px"
                @click="addInventor"
              >
                添加发明人
              </el-button>
            </div>
          </el-form-item>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="专利申请日">
                <el-date-picker
                  v-model="editForm.application_date"
                  type="date"
                  placeholder="请选择专利申请日"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="授权公告日">
                <el-date-picker
                  v-model="editForm.authorization_date"
                  type="date"
                  placeholder="请选择授权公告日"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="专利号">
                <el-input
                  v-model="editForm.patent_number"
                  placeholder="请输入专利号"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="授权年度">
                <el-date-picker
                  v-model="editForm.authorization_year"
                  type="year"
                  placeholder="请选择授权年度"
                  format="YYYY"
                  value-format="YYYY"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="专利摘要">
            <el-input
              v-model="editForm.abstract"
              type="textarea"
              :rows="4"
              placeholder="请输入专利摘要"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>
        </template>
        
        <!-- 软著编辑表单 -->
        <template v-else>
          <el-form-item label="软件名称" prop="software_name">
            <el-input
              v-model="editForm.software_name"
              placeholder="请输入软件名称"
              maxlength="300"
              show-word-limit
            />
          </el-form-item>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="版本号">
                <el-input
                  v-model="editForm.version_number"
                  placeholder="请输入版本号"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="所属部门">
                <el-select v-model="editForm.department_id" placeholder="请选择所属部门" clearable>
                  <el-option
                    v-for="dept in departments"
                    :key="dept.id"
                    :label="dept.name"
                    :value="dept.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="著作权人">
            <el-input
              v-model="editForm.copyright_owner"
              placeholder="请输入著作权人"
            />
          </el-form-item>
          
          <el-form-item label="第一申请人" prop="first_applicant">
            <el-input
              v-model="editForm.first_applicant"
              placeholder="请输入第一申请人姓名"
            />
          </el-form-item>
          
          <el-form-item label="其他申请人">
            <div class="applicants-section">
              <div
                v-for="(applicant, index) in editForm.other_applicants"
                :key="index"
                class="applicant-item"
              >
                <el-input
                  v-model="editForm.other_applicants[index]"
                  placeholder="请输入申请人姓名"
                  style="flex: 1; margin-right: 8px"
                />
                <el-button
                  type="danger"
                  size="small"
                  circle
                  @click="removeApplicant(index)"
                >
                  ×
                </el-button>
              </div>
              <el-button
                type="dashed"
                style="width: 100%; margin-top: 8px"
                @click="addApplicant"
              >
                添加申请人
              </el-button>
            </div>
          </el-form-item>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="登记号">
                <el-input
                  v-model="editForm.registration_number"
                  placeholder="请输入登记号"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="登记日期">
                <el-date-picker
                  v-model="editForm.registration_date"
                  type="date"
                  placeholder="请选择登记日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="公告日期">
                <el-date-picker
                  v-model="editForm.publication_date"
                  type="date"
                  placeholder="请选择公告日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="开发完成日">
                <el-date-picker
                  v-model="editForm.development_completion_date"
                  type="date"
                  placeholder="请选择开发完成日"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="软件描述">
            <el-input
              v-model="editForm.description"
              type="textarea"
              :rows="4"
              placeholder="请输入软件功能描述"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>
        </template>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEdit">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, ArrowDown } from '@element-plus/icons-vue'
import { piApi } from '../../api/pi.js'
import dayjs from 'dayjs'

const router = useRouter()

// 页面状态
const tableLoading = ref(false)
const detailDialogVisible = ref(false)
const currentDetail = ref(null)
const selectedRows = ref([])
const departments = ref([])

// 编辑弹窗相关
const editDialogVisible = ref(false)
const editFormRef = ref(null)
const currentEditItem = ref(null)
const editFormRules = reactive({
  title: [{ required: true, message: '请输入专利名称', trigger: 'blur' }],
  software_name: [{ required: true, message: '请输入软件名称', trigger: 'blur' }],
  patent_type: [{ required: true, message: '请选择专利类型', trigger: 'change' }],
  first_inventor: [{ required: true, message: '请输入第一发明人', trigger: 'blur' }],
  first_applicant: [{ required: true, message: '请输入第一申请人', trigger: 'blur' }]
})
const editForm = reactive({
  // 专利字段
  title: '',
  patent_type: '',
  department_id: null,
  first_patentee: '',
  application_date: '',
  patent_number: '',
  authorization_date: '',
  authorization_year: '',
  first_inventor: '',
  other_inventors: [],
  abstract: '',
  
  // 软著字段
  software_name: '',
  version_number: '',
  registration_number: '',
  copyright_owner: '',
  first_applicant: '',
  other_applicants: [],
  registration_date: '',
  publication_date: '',
  development_completion_date: '',
  description: ''
})

// 统计数据
const stats = reactive({
  totalPatents: 0,
  totalCopyrights: 0,
  approved: 0
})

// 筛选条件
const filters = reactive({
  type: '',
  status: '',
  keyword: ''
})

// 表格数据
const tableData = ref([])

// 分页信息
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 方法
const loadData = async () => {
  try {
    tableLoading.value = true
    
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      type: filters.type,
      status: filters.status,
      keyword: filters.keyword
    }
    
    const response = await piApi.getMyItems(params)
    const data = response.data?.data || {}
    
    // 处理表格数据，统一处理专利和软著
    const allItems = []
    
    if (data.patents) {
      data.patents.forEach(patent => {
        allItems.push({ ...patent, item_type: 'patent' })
      })
    }
    
    if (data.copyrights) {
      data.copyrights.forEach(copyright => {
        allItems.push({ ...copyright, item_type: 'copyright' })
      })
    }
    
    // 按创建时间排序
    allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    
    tableData.value = allItems
    
    // 更新分页信息
    const patentTotal = data.pagination?.patents?.total || 0
    const copyrightTotal = data.pagination?.copyrights?.total || 0
    pagination.total = patentTotal + copyrightTotal
    
    // 更新统计数据
    updateStats(allItems)
    
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    tableLoading.value = false
  }
}

const updateStats = (items) => {
  const patents = items.filter(item => item.item_type === 'patent')
  const copyrights = items.filter(item => item.item_type === 'copyright')
  
  stats.totalPatents = patents.length
  stats.totalCopyrights = copyrights.length
  stats.approved = items.filter(item => item.status === 'approved').length
}

const handleFilterChange = () => {
  pagination.page = 1
  loadData()
}

const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadData()
}

// 查看详情
const viewDetail = async (row) => {
  try {
    let response
    if (row.item_type === 'patent') {
      response = await piApi.getPatentDetail(row.id)
    } else {
      response = await piApi.getCopyrightDetail(row.id)
    }
    
    currentDetail.value = { ...response.data, item_type: row.item_type }
    detailDialogVisible.value = true
    
  } catch (error) {
    console.error('加载详情失败:', error)
    ElMessage.error('加载详情失败')
  }
}

// 编辑项目 - 直接打开编辑弹窗
const editItem = (row) => {
  openEditDialog(row)
}

// 打开编辑弹窗
const openEditDialog = async (row) => {
  try {
    currentEditItem.value = row
    
    // 获取详细信息
    let response
    if (row.item_type === 'patent') {
      response = await piApi.getPatentDetail(row.id)
    } else {
      response = await piApi.getCopyrightDetail(row.id)
    }
    
    const data = response.data?.data || response.data
    
    console.log('API response:', response)
    console.log('Data to fill:', data)
    console.log('Authorization year from API:', data.authorization_year, typeof data.authorization_year)
    
    // 重置表单
    Object.keys(editForm).forEach(key => {
      if (Array.isArray(editForm[key])) {
        editForm[key] = []
      } else if (key === 'department_id') {
        editForm[key] = null
      } else {
        editForm[key] = ''
      }
    })
    console.log('Form reset:', editForm)
    
    // 解析可能的JSON字符串字段
    const parseJsonField = (field) => {
      if (!field) return []
      if (typeof field === 'string') {
        try {
          return JSON.parse(field)
        } catch {
          return []
        }
      }
      return Array.isArray(field) ? field : []
    }
    
    // 填充表单数据
    if (row.item_type === 'patent') {
      editForm.title = data.title || ''
      editForm.patent_type = data.patent_type || ''
      editForm.department_id = data.department_id || null
      editForm.first_patentee = data.first_patentee || ''
      editForm.application_date = data.application_date || ''
      editForm.patent_number = data.patent_number || ''
      editForm.authorization_date = data.authorization_date || ''
      // 处理授权年度：YEAR类型需要转换为字符串格式
      if (data.authorization_year) {
        // 确保是4位年份格式
        const year = String(data.authorization_year)
        editForm.authorization_year = year.length === 4 ? year : ''
      } else {
        editForm.authorization_year = ''
      }
      editForm.first_inventor = data.first_inventor || ''
      editForm.other_inventors = parseJsonField(data.other_inventors)
      editForm.abstract = data.abstract || ''
    } else {
      editForm.software_name = data.software_name || ''
      editForm.version_number = data.version_number || ''
      editForm.registration_number = data.registration_number || ''
      editForm.copyright_owner = data.copyright_owner || ''
      editForm.first_applicant = data.first_applicant || ''
      editForm.other_applicants = parseJsonField(data.other_applicants)
      editForm.registration_date = data.registration_date || ''
      editForm.publication_date = data.publication_date || ''
      editForm.development_completion_date = data.development_completion_date || ''
      editForm.description = data.description || ''
      editForm.department_id = data.department_id || null
    }
    
    console.log('Filled form data:', editForm)
    console.log('Authorization year filled:', editForm.authorization_year, typeof editForm.authorization_year)
    
    editDialogVisible.value = true
    
    // 确保DOM更新后强制刷新表单
    await nextTick()
    console.log('After nextTick - authorization_year:', editForm.authorization_year)
  } catch (error) {
    console.error('加载编辑数据失败:', error)
    ElMessage.error('加载编辑数据失败')
  }
}

// 提交编辑
const submitEdit = async () => {
  if (!currentEditItem.value) return
  
  try {
    // 验证表单
    await editFormRef.value?.validate()
    
    const itemType = currentEditItem.value.item_type
    const updateData = {}
    
    if (itemType === 'patent') {
      updateData.title = editForm.title
      updateData.patent_type = editForm.patent_type
      updateData.department_id = editForm.department_id
      updateData.first_patentee = editForm.first_patentee
      updateData.application_date = editForm.application_date || null
      updateData.patent_number = editForm.patent_number
      updateData.authorization_date = editForm.authorization_date || null
      // 处理授权年度：确保是有效的年份格式
      if (editForm.authorization_year && editForm.authorization_year.length === 4) {
        updateData.authorization_year = Number(editForm.authorization_year)
      } else {
        updateData.authorization_year = null
      }
      console.log('Saving authorization_year:', editForm.authorization_year, '->', updateData.authorization_year)
      updateData.first_inventor = editForm.first_inventor
      updateData.other_inventors = editForm.other_inventors.filter(name => name.trim())
      updateData.abstract = editForm.abstract
    } else {
      updateData.software_name = editForm.software_name
      updateData.version_number = editForm.version_number
      updateData.registration_number = editForm.registration_number
      updateData.copyright_owner = editForm.copyright_owner
      updateData.first_applicant = editForm.first_applicant
      updateData.other_applicants = editForm.other_applicants.filter(name => name.trim())
      updateData.registration_date = editForm.registration_date || null
      updateData.publication_date = editForm.publication_date || null
      updateData.development_completion_date = editForm.development_completion_date || null
      updateData.description = editForm.description
    }
    
    if (itemType === 'patent') {
      await piApi.updatePatent(currentEditItem.value.id, updateData)
    } else {
      await piApi.updateCopyright(currentEditItem.value.id, updateData)
    }
    
    ElMessage.success('保存成功')
    editDialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('保存失败:', error)
    const errorMsg = error.response?.data?.message || '保存失败'
    ElMessage.error(errorMsg)
  }
}

// 添加发明人/申请人
const addInventor = () => {
  editForm.other_inventors.push('')
}

const addApplicant = () => {
  editForm.other_applicants.push('')
}

// 删除发明人/申请人
const removeInventor = (index) => {
  editForm.other_inventors.splice(index, 1)
}

const removeApplicant = (index) => {
  editForm.other_applicants.splice(index, 1)
}

// 撤回项目
const withdrawItem = async (row) => {
  try {
    await ElMessageBox.confirm(
      '撤回后将变为草稿状态，可重新编辑后再次提交，是否继续？',
      '确认撤回',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 使用更新接口修改状态为草稿
    if (row.item_type === 'patent') {
      await piApi.withdrawPatent(row.id)
    } else {
      await piApi.withdrawCopyright(row.id)
    }
    
    ElMessage.success('撤回成功，现在可以编辑该项目')
    loadData()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('撤回失败:', error)
      const errorMsg = error.response?.data?.message || '撤回失败'
      ElMessage.error(errorMsg)
    }
  }
}

// 权限判断函数
const canWithdraw = (status) => {
  return ['pending'].includes(status)
}

// 提交审核
const submitForAudit = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确认提交该${row.item_type === 'patent' ? '专利' : '软著'}进行审核？提交后将无法编辑。`,
      '确认提交',
      {
        confirmButtonText: '确认提交',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (row.item_type === 'patent') {
      await piApi.updatePatent(row.id, { status: 'pending' })
    } else {
      await piApi.updateCopyright(row.id, { status: 'pending' })
    }
    
    ElMessage.success('提交成功，请等待审核')
    loadData()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交失败:', error)
      const errorMsg = error.response?.data?.message || '提交失败'
      ElMessage.error(errorMsg)
    }
  }
}

// 删除项目
const deleteItem = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确认删除该${row.item_type === 'patent' ? '专利' : '软著'}？删除后无法恢复。`,
      '确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )
    
    if (row.item_type === 'patent') {
      await piApi.deletePatent(row.id)
    } else {
      await piApi.deleteCopyright(row.id)
    }
    
    ElMessage.success('删除成功')
    loadData()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      const errorMsg = error.response?.data?.message || '删除失败'
      ElMessage.error(errorMsg)
    }
  }
}

// 下载文件
const downloadFile = (row) => {
  // 构建下载链接
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  const downloadUrl = `${baseUrl}${row.file_path}`
  
  // 创建下载链接
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = row.file_name || `${row.title || row.software_name}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 工具函数
const getPatentTypeLabel = (type) => {
  const typeMap = {
    invention: '发明专利',
    utility_model: '实用新型',
    design: '外观设计'
  }
  return typeMap[type] || type
}

const getStatusType = (status) => {
  const typeMap = {
    draft: 'info',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusLabel = (status) => {
  const labelMap = {
    draft: '草稿',
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return labelMap[status] || status
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return dayjs(dateStr).format('YYYY-MM-DD')
}

// 加载部门列表
const loadDepartments = async () => {
  try {
    const response = await piApi.getDepartments()
    departments.value = response.data || []
  } catch (error) {
    console.error('加载部门失败:', error)
  }
}

// 初始化
onMounted(() => {
  loadData()
  loadDepartments()
})
</script>

<style scoped>
.my-ip-container {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 8px 0;
}

.page-description {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0;
}

.header-right {
  margin-left: 24px;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
}

.stat-card.total .stat-number {
  color: #1890ff;
}

.stat-card.patent .stat-number {
  color: #fa8c16;
}

.stat-card.copyright .stat-number {
  color: #52c41a;
}

.stat-card.approved .stat-number {
  color: #722ed1;
}

.filter-section {
  background: #ffffff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

.filter-row {
  align-items: center;
}

.table-section {
  background: #ffffff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

.title-cell .title {
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
}

.title-cell .subtitle {
  font-size: 12px;
  color: #8c8c8c;
}

.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-content :deep(.el-descriptions__body) {
  background: #fafafa;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  margin: 0;
  padding: 4px 8px;
}

/* 编辑弹窗样式 */
.inventors-section,
.applicants-section {
  margin-top: 8px;
}

.inventor-item,
.applicant-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.dialog-footer {
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .my-ip-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-right {
    margin: 16px 0 0 0;
  }
  
  .filter-section {
    padding: 16px;
  }
  
  .table-section {
    padding: 16px;
    overflow-x: auto;
  }
  
  .filter-row .el-col {
    margin-bottom: 12px;
  }
}

</style>

