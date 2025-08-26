<template>
  <div class="submit-ip-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">专利/软著提交</h1>
      <p class="page-description">请选择提交类型并填写完整信息，提交后将进入审核流程</p>
    </div>
    
    <!-- 类型选择 -->
    <div class="type-selector">
      <el-radio-group v-model="submitType" size="large" @change="onTypeChange">
        <el-radio-button label="patent">
          <el-icon><Medal /></el-icon>
          专利提交
        </el-radio-button>
        <el-radio-button label="copyright">
          <el-icon><CopyDocument /></el-icon>
          软著提交
        </el-radio-button>
      </el-radio-group>
    </div>
    
    <!-- 步骤指示器 -->
    <el-steps :active="currentStep" align-center class="submit-steps">
      <el-step title="基本信息" :description="submitType === 'patent' ? '填写专利基础信息' : '填写软著基础信息'" />
      <el-step title="人员信息" :description="submitType === 'patent' ? '发明人信息' : '申请人信息'" />
      <el-step title="文件上传" description="上传相关文件" />
      <el-step title="提交审核" description="确认并提交" />
    </el-steps>
    
    <!-- 表单内容 -->
    <div class="form-container">
      <el-form
        ref="ipFormRef"
        :model="ipForm"
        :rules="currentRules"
        label-width="120px"
        size="large"
      >
        <!-- 步骤1：基本信息（合并了原来的基本信息和详细信息） -->
        <div v-show="currentStep === 0" class="step-content">
          <div class="step-title">
            <el-icon><Document /></el-icon>
            基本信息
          </div>
          
          <!-- 专利基本信息 -->
          <template v-if="submitType === 'patent'">
            <el-form-item label="专利名称" prop="title">
              <el-input
                v-model="ipForm.title"
                placeholder="请输入专利名称"
                maxlength="300"
                show-word-limit
              />
            </el-form-item>
            
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="专利类型" prop="patent_type">
                  <el-select v-model="ipForm.patent_type" placeholder="请选择专利类型">
                    <el-option label="发明专利" value="invention" />
                    <el-option label="实用新型" value="utility_model" />
                    <el-option label="外观设计" value="design" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="所属部门" prop="department_id">
                  <el-select v-model="ipForm.department_id" placeholder="请选择所属部门" clearable>
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
            
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="专利申请日" prop="application_date">
                  <el-date-picker
                    v-model="ipForm.application_date"
                    type="date"
                    placeholder="请选择专利申请日（可选）"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="授权公告日" prop="authorization_date">
                  <el-date-picker
                    v-model="ipForm.authorization_date"
                    type="date"
                    placeholder="请选择授权公告日（可选）"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="专利号" prop="patent_number">
                  <el-input
                    v-model="ipForm.patent_number"
                    placeholder="请输入专利号（可选）"
                    maxlength="50"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="授权年度" prop="authorization_year">
                  <el-date-picker
                    v-model="ipForm.authorization_year"
                    type="year"
                    placeholder="请选择授权年度（可选）"
                    format="YYYY"
                    value-format="YYYY"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-form-item label="专利摘要" prop="abstract">
              <el-input
                v-model="ipForm.abstract"
                type="textarea"
                :rows="4"
                placeholder="请输入专利摘要（可选）"
                maxlength="2000"
                show-word-limit
              />
            </el-form-item>
          </template>
          
          <!-- 软著基本信息 -->
          <template v-else>
            <el-form-item label="软件名称" prop="software_name">
              <el-input
                v-model="ipForm.software_name"
                placeholder="请输入软件名称"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
            
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="版本号" prop="version_number">
                  <el-input
                    v-model="ipForm.version_number"
                    placeholder="请输入版本号（如：V1.0）"
                    maxlength="50"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="所属部门" prop="department_id">
                  <el-select v-model="ipForm.department_id" placeholder="请选择所属部门" clearable>
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
            
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="登记号" prop="registration_number">
                  <el-input
                    v-model="ipForm.registration_number"
                    placeholder="请输入登记号"
                    maxlength="50"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="登记日期" prop="registration_date">
                  <el-date-picker
                    v-model="ipForm.registration_date"
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
                <el-form-item label="公告日期" prop="publication_date">
                  <el-date-picker
                    v-model="ipForm.publication_date"
                    type="date"
                    placeholder="请选择公告日期（可选）"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="开发完成日" prop="development_completion_date">
                  <el-date-picker
                    v-model="ipForm.development_completion_date"
                    type="date"
                    placeholder="请选择开发完成日（可选）"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-form-item label="软件描述" prop="description">
              <el-input
                v-model="ipForm.description"
                type="textarea"
                :rows="4"
                placeholder="请输入软件功能描述（可选）"
                maxlength="2000"
                show-word-limit
              />
            </el-form-item>
          </template>
        </div>
        
        <!-- 步骤2：人员信息 -->
        <div v-show="currentStep === 1" class="step-content">
          <div class="step-title">
            <el-icon><User /></el-icon>
            人员信息
          </div>
          
          <!-- 专利发明人信息 -->
          <template v-if="submitType === 'patent'">
            <el-form-item label="第一专利权人" prop="first_patentee">
              <el-input
                v-model="ipForm.first_patentee"
                placeholder="请输入第一专利权人"
                maxlength="100"
              />
            </el-form-item>
            
            <el-form-item label="第一发明人" prop="first_inventor">
              <el-input
                v-model="ipForm.first_inventor"
                placeholder="请输入第一发明人姓名"
                maxlength="100"
              />
            </el-form-item>
            
            <el-form-item label="其他发明人">
              <div class="inventors-section">
                <div
                  v-for="(inventor, index) in ipForm.other_inventors"
                  :key="index"
                  class="inventor-item"
                >
                  <el-input
                    v-model="ipForm.other_inventors[index]"
                    placeholder="请输入发明人姓名"
                    maxlength="100"
                    style="flex: 1; margin-right: 8px"
                  />
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    size="small"
                    @click="removeInventor(index)"
                  />
                </div>
                <el-button
                  type="dashed"
                  :icon="Plus"
                  style="width: 100%; margin-top: 8px"
                  @click="addInventor"
                >
                  添加发明人
                </el-button>
              </div>
            </el-form-item>
          </template>
          
          <!-- 软著申请人信息 -->
          <template v-else>
            <el-form-item label="著作权人" prop="copyright_owner">
              <el-input
                v-model="ipForm.copyright_owner"
                placeholder="请输入著作权人"
                maxlength="100"
              />
            </el-form-item>
            
            <el-form-item label="第一申请人" prop="first_applicant">
              <el-input
                v-model="ipForm.first_applicant"
                placeholder="请输入第一申请人姓名"
                maxlength="100"
              />
            </el-form-item>
            
            <el-form-item label="其他申请人">
              <div class="applicants-section">
                <div
                  v-for="(applicant, index) in ipForm.other_applicants"
                  :key="index"
                  class="applicant-item"
                >
                  <el-input
                    v-model="ipForm.other_applicants[index]"
                    placeholder="请输入申请人姓名"
                    maxlength="100"
                    style="flex: 1; margin-right: 8px"
                  />
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    size="small"
                    @click="removeApplicant(index)"
                  />
                </div>
                <el-button
                  type="dashed"
                  :icon="Plus"
                  style="width: 100%; margin-top: 8px"
                  @click="addApplicant"
                >
                  添加申请人
                </el-button>
              </div>
            </el-form-item>
          </template>
        </div>
        
        <!-- 步骤3：文件上传 -->
        <div v-show="currentStep === 2" class="step-content">
          <div class="step-title">
            <el-icon><Upload /></el-icon>
            文件上传
          </div>
          
          <div class="upload-section">
            <el-upload
              ref="uploadRef"
              class="upload-dragger"
              drag
              :auto-upload="false"
              :file-list="fileList"
              :before-upload="beforeUpload"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              accept=".pdf,.doc,.docx"
              :limit="1"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <div class="el-upload__tip">
                支持 PDF、DOC、DOCX 格式，文件大小不超过 50MB
              </div>
            </el-upload>
          </div>
        </div>
        
        <!-- 步骤4：确认提交 -->
        <div v-show="currentStep === 3" class="step-content">
          <div class="step-title">
            <el-icon><Check /></el-icon>
            确认提交
          </div>
          
          <div class="summary-section">
            <el-card class="summary-card">
              <template #header>
                <div class="summary-header">
                  <el-icon><InfoFilled /></el-icon>
                  {{ submitType === 'patent' ? '专利信息确认' : '软著信息确认' }}
                </div>
              </template>
              
              <!-- 专利信息摘要 -->
              <div v-if="submitType === 'patent'" class="summary-content">
                <div class="summary-item">
                  <label>专利名称：</label>
                  <span>{{ ipForm.title }}</span>
                </div>
                <div class="summary-item">
                  <label>专利类型：</label>
                  <span>{{ getPatentTypeLabel(ipForm.patent_type) }}</span>
                </div>
                <div class="summary-item">
                  <label>第一发明人：</label>
                  <span>{{ ipForm.first_inventor }}</span>
                </div>
                <div class="summary-item" v-if="ipForm.other_inventors.length">
                  <label>其他发明人：</label>
                  <span>{{ ipForm.other_inventors.join('、') }}</span>
                </div>
                <div class="summary-item" v-if="ipForm.first_patentee">
                  <label>第一专利权人：</label>
                  <span>{{ ipForm.first_patentee }}</span>
                </div>
              </div>
              
              <!-- 软著信息摘要 -->
              <div v-else class="summary-content">
                <div class="summary-item">
                  <label>软件名称：</label>
                  <span>{{ ipForm.software_name }}</span>
                </div>
                <div class="summary-item" v-if="ipForm.version_number">
                  <label>版本号：</label>
                  <span>{{ ipForm.version_number }}</span>
                </div>
                <div class="summary-item">
                  <label>著作权人：</label>
                  <span>{{ ipForm.copyright_owner }}</span>
                </div>
                <div class="summary-item">
                  <label>第一申请人：</label>
                  <span>{{ ipForm.first_applicant }}</span>
                </div>
                <div class="summary-item" v-if="ipForm.other_applicants.length">
                  <label>其他申请人：</label>
                  <span>{{ ipForm.other_applicants.join('、') }}</span>
                </div>
              </div>
              
              <div class="summary-item" v-if="fileList.length">
                <label>上传文件：</label>
                <span>{{ fileList[0].name }}</span>
              </div>
            </el-card>
          </div>
        </div>
      </el-form>
      
      <!-- 操作按钮 -->
      <div class="form-actions">
        <el-button
          v-if="currentStep > 0"
          size="large"
          @click="prevStep"
        >
          上一步
        </el-button>
        
        <el-button
          v-if="currentStep < 3"
          type="primary"
          size="large"
          @click="nextStep"
        >
          下一步
        </el-button>
        
        <el-button
          v-if="currentStep === 3"
          type="primary"
          size="large"
          :loading="submitLoading"
          @click="submitForm"
        >
          提交审核
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Medal, CopyDocument, Document, InfoFilled, User, Upload,
  Check, UploadFilled, Plus, Delete
} from '@element-plus/icons-vue'
import { piApi } from '../../api/pi.js'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()

// 页面状态
const submitType = ref('patent') // patent 或 copyright
const currentStep = ref(0)
const submitLoading = ref(false)

// 部门列表
const departments = ref([])

// 文件上传
const uploadRef = ref()
const fileList = ref([])

// 表单数据
const ipForm = reactive({
  // 专利字段
  title: '',
  patent_type: '',
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
  description: '',
  
  // 公共字段
  department_id: null
})

// 表单引用
const ipFormRef = ref()

// 专利表单验证规则
const patentRules = {
  title: [{ required: true, message: '请输入专利名称', trigger: 'blur' }],
  patent_type: [{ required: true, message: '请选择专利类型', trigger: 'change' }],
  first_patentee: [{ required: true, message: '请输入第一专利权人', trigger: 'blur' }],
  first_inventor: [{ required: true, message: '请输入第一发明人', trigger: 'blur' }]
}

// 软著表单验证规则
const copyrightRules = {
  software_name: [{ required: true, message: '请输入软件名称', trigger: 'blur' }],
  version_number: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  registration_number: [{ required: true, message: '请输入登记号', trigger: 'blur' }],
  registration_date: [{ required: true, message: '请选择登记日期', trigger: 'change' }],
  copyright_owner: [{ required: true, message: '请输入著作权人', trigger: 'blur' }],
  first_applicant: [{ required: true, message: '请输入第一申请人', trigger: 'blur' }]
}

// 当前验证规则
const currentRules = computed(() => {
  return submitType.value === 'patent' ? patentRules : copyrightRules
})

// 方法
const onTypeChange = () => {
  // 重置表单和步骤
  currentStep.value = 0
  resetForm()
}

const resetForm = () => {
  // 保存当前部门ID
  const currentDepartmentId = ipForm.department_id
  
  Object.keys(ipForm).forEach(key => {
    if (key === 'department_id') {
      return // 跳过部门字段，保持当前用户部门
    }
    if (Array.isArray(ipForm[key])) {
      ipForm[key] = []
    } else {
      ipForm[key] = ''
    }
  })
  
  // 保持部门选择
  ipForm.department_id = currentDepartmentId
  
  // 为软著设置默认的著作权人
  if (submitType.value === 'copyright') {
    ipForm.copyright_owner = '中国科学院、水利部成都山地灾害与环境研究所'
  }
  
  // 为专利设置默认的第一专利权人
  if (submitType.value === 'patent') {
    ipForm.first_patentee = '中国科学院、水利部成都山地灾害与环境研究所'
  }
  
  fileList.value = []
}

const nextStep = async () => {
  // 验证当前步骤的表单
  if (currentStep.value < 2) {
    const valid = await validateCurrentStep()
    if (!valid) return
  }
  
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const validateCurrentStep = async () => {
  try {
    // 根据当前步骤验证不同的字段
    const fieldsToValidate = getFieldsForCurrentStep()
    
    if (fieldsToValidate.length === 0) {
      return true // 如果没有需要验证的字段，直接返回true
    }
    
    // 验证指定字段
    await ipFormRef.value?.validateField(fieldsToValidate)
    return true
  } catch (error) {
    console.log('验证失败:', error)
    return false
  }
}

// 获取当前步骤需要验证的字段
const getFieldsForCurrentStep = () => {
  const stepFields = {
    0: submitType.value === 'patent' 
      ? ['title', 'patent_type'] 
      : ['software_name', 'version_number', 'registration_number', 'registration_date'],
    1: submitType.value === 'patent'
      ? ['first_patentee', 'first_inventor']
      : ['copyright_owner', 'first_applicant'],
    2: [], // 文件上传步骤不需要表单验证
    3: []  // 确认步骤不需要验证
  }
  
  return stepFields[currentStep.value] || []
}

// 发明人管理
const addInventor = () => {
  ipForm.other_inventors.push('')
}

const removeInventor = (index) => {
  ipForm.other_inventors.splice(index, 1)
}

// 申请人管理
const addApplicant = () => {
  ipForm.other_applicants.push('')
}

const removeApplicant = (index) => {
  ipForm.other_applicants.splice(index, 1)
}

// 文件上传
const beforeUpload = (file) => {
  const isValidType = ['application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
  const isValidSize = file.size / 1024 / 1024 < 50
  
  if (!isValidType) {
    ElMessage.error('只支持 PDF、DOC、DOCX 格式文件')
    return false
  }
  if (!isValidSize) {
    ElMessage.error('文件大小不能超过 50MB')
    return false
  }
  
  return false // 阻止自动上传
}

const handleFileChange = (file) => {
  fileList.value = [file]
}

const handleFileRemove = () => {
  fileList.value = []
}

// 获取专利类型标签
const getPatentTypeLabel = (type) => {
  const typeMap = {
    invention: '发明专利',
    utility_model: '实用新型',
    design: '外观设计'
  }
  return typeMap[type] || type
}

// 提交表单
const submitForm = async () => {
  try {
    submitLoading.value = true
    
    // 准备提交数据
    const submitData = {}
    
    if (submitType.value === 'patent') {
      submitData.title = ipForm.title
      submitData.patent_type = ipForm.patent_type
      submitData.department_id = ipForm.department_id
      submitData.first_patentee = ipForm.first_patentee
      submitData.application_date = ipForm.application_date || null
      submitData.patent_number = ipForm.patent_number
      submitData.authorization_date = ipForm.authorization_date || null
      submitData.authorization_year = ipForm.authorization_year || null
      submitData.first_inventor = ipForm.first_inventor
      submitData.other_inventors = ipForm.other_inventors.filter(name => name.trim())
      submitData.abstract = ipForm.abstract
    } else {
      submitData.software_name = ipForm.software_name
      submitData.version_number = ipForm.version_number
      submitData.registration_number = ipForm.registration_number
      submitData.department_id = ipForm.department_id
      submitData.copyright_owner = ipForm.copyright_owner
      submitData.first_applicant = ipForm.first_applicant
      submitData.other_applicants = ipForm.other_applicants.filter(name => name.trim())
      submitData.registration_date = ipForm.registration_date || null
      submitData.publication_date = ipForm.publication_date || null
      submitData.development_completion_date = ipForm.development_completion_date || null
      submitData.description = ipForm.description
    }
    
    // 提交基本信息
    let response
    if (submitType.value === 'patent') {
      response = await piApi.createPatent(submitData)
    } else {
      response = await piApi.createCopyright(submitData)
    }
    
    const itemId = response?.data?.data?.id
    
    // 如果有文件，上传文件
    if (fileList.value.length > 0) {
      const file = fileList.value[0].raw
      if (submitType.value === 'patent') {
        await piApi.uploadPatentFile(itemId, file)
      } else {
        await piApi.uploadCopyrightFile(itemId, file)
      }
    }
    
    ElMessage.success('提交成功，请等待审核')
    router.push('/my-ip')
    
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data?.message || '提交失败')
  } finally {
    submitLoading.value = false
  }
}

// 加载部门列表
const loadDepartments = async () => {
  try {
    const response = await piApi.getDepartments()
    departments.value = response.data || []
    console.log('部门列表加载成功:', departments.value)
    
    // 确保用户信息已加载并自动设置当前用户的部门
    if (!userStore.user) {
      try {
        await userStore.getCurrentUser()
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    }
    
    console.log('当前用户信息:', userStore.user)
    if (userStore.user && userStore.user.department_id) {
      ipForm.department_id = userStore.user.department_id
      console.log('设置用户部门ID:', userStore.user.department_id)
    }
  } catch (error) {
    console.error('加载部门失败:', error)
  }
}

onMounted(() => {
  loadDepartments()
  
  // 为软著设置默认的著作权人
  if (submitType.value === 'copyright') {
    ipForm.copyright_owner = '中国科学院、水利部成都山地灾害与环境研究所'
  }
  
  // 为专利设置默认的第一专利权人
  if (submitType.value === 'patent') {
    ipForm.first_patentee = '中国科学院、水利部成都山地灾害与环境研究所'
  }
})
</script>

<style scoped>
.submit-ip-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
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

.type-selector {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.type-selector :deep(.el-radio-button__inner) {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
}

.submit-steps {
  margin-bottom: 48px;
}

.form-container {
  background: #ffffff;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

.step-content {
  min-height: 400px;
}

.step-title {
  display: flex;
  align-items: center;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.step-title .el-icon {
  font-size: 22px;
  margin-right: 8px;
  color: #1890ff;
}

.form-item {
  margin-bottom: 24px;
}

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

.upload-section {
  text-align: center;
}

.upload-dragger {
  margin: 0 auto;
}

.upload-dragger :deep(.el-upload-dragger) {
  width: 400px;
  height: 200px;
}

.summary-section {
  max-width: 600px;
  margin: 0 auto;
}

.summary-card {
  border: 1px solid #e6f7ff;
  background: #f6ffed;
}

.summary-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #262626;
}

.summary-header .el-icon {
  margin-right: 8px;
  color: #1890ff;
}

.summary-content {
  padding: 0;
}

.summary-item {
  display: flex;
  margin-bottom: 12px;
  font-size: 14px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-item label {
  font-weight: 600;
  color: #595959;
  min-width: 120px;
}

.summary-item span {
  flex: 1;
  color: #262626;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.form-actions .el-button {
  min-width: 120px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .submit-ip-container {
    padding: 16px;
  }
  
  .form-container {
    padding: 24px 16px;
  }
  
  .upload-dragger :deep(.el-upload-dragger) {
    width: 100%;
  }
  
  .summary-section {
    max-width: none;
  }
  
  .type-selector :deep(.el-radio-button__inner) {
    padding: 8px 16px;
    font-size: 14px;
  }
}
</style>
