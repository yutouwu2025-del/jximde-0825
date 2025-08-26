<template>
  <div class="submit-paper-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">论文提交</h1>
      <p class="page-description">请填写完整的论文信息，提交后将进入审核流程</p>
    </div>
    
    <!-- 步骤指示器 -->
    <el-steps :active="currentStep" align-center class="submit-steps">
      <el-step title="基本信息" description="填写论文基础信息" />
      <el-step title="期刊信息" description="选择发表期刊" />
      <el-step title="作者信息" description="填写作者详情" />
      <el-step title="文件上传" description="上传论文文件" />
      <el-step title="提交审核" description="确认并提交" />
    </el-steps>
    
    <!-- 表单内容 -->
    <div class="form-container">
      <el-form
        ref="paperFormRef"
        :model="paperForm"
        :rules="paperRules"
        label-width="120px"
        size="large"
      >
        <!-- 步骤1：基本信息 -->
        <div v-show="currentStep === 0" class="step-content">
          <div class="step-title">
            <el-icon><Document /></el-icon>
            基本信息
          </div>
          
          <el-form-item label="论文标题" prop="title">
            <el-input
              v-model="paperForm.title"
              placeholder="请输入论文标题（中英文均可）"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
          
          <el-form-item label="论文类型" prop="type">
            <el-select v-model="paperForm.type" placeholder="请选择论文类型">
              <el-option label="期刊论文" value="journal" />
              <el-option label="学会论文" value="conference" />
              <el-option label="学位论文" value="degree" />
            </el-select>
          </el-form-item>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="发表年度" prop="publishYear">
                <el-date-picker
                  v-model="paperForm.publishYear"
                  type="year"
                  placeholder="请选择发表年度"
                  format="YYYY"
                  value-format="YYYY"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="语种" prop="language">
                <el-select v-model="paperForm.language" placeholder="请选择语种">
                  <el-option label="中文" value="chinese" />
                  <el-option label="英文" value="english" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="DOI" prop="doi">
            <el-input
              v-model="paperForm.doi"
              placeholder="请输入DOI（如：10.1038/nature12373）"
            />
          </el-form-item>
        </div>
        
        <!-- 步骤2：期刊信息 -->
        <div v-show="currentStep === 1" class="step-content">
          <div class="step-title">
            <el-icon><Search /></el-icon>
            期刊信息
          </div>
          
          <el-form-item label="期刊搜索" prop="journal">
            <div class="journal-search-wrapper">
              <el-autocomplete
                v-model="journalSearchKeyword"
                :fetch-suggestions="searchJournals"
                placeholder="请输入期刊名称或ISSN号进行搜索"
                clearable
                style="flex: 1; margin-right: 12px"
                @select="selectJournal"
                :loading="journalSearchLoading"
              >
                <template #default="{ item }">
                  <div class="journal-suggestion">
                    <div class="journal-name">{{ item.name }}</div>
                    <div class="journal-info">
                      <el-tag size="small" type="info">{{ item.issn }}</el-tag>
                      <el-tag size="small" :type="getPartitionType(item.partitionLevel)">
                        {{ item.partitionInfo }}
                      </el-tag>
                    </div>
                  </div>
                </template>
              </el-autocomplete>
              <el-button 
                type="primary" 
                @click="showJournalSelector = true"
                :icon="Search"
              >
                选择期刊
              </el-button>
            </div>
          </el-form-item>
          
          <el-form-item label="期刊名称" prop="journalName">
            <el-input
              v-model="paperForm.journalName"
              placeholder="期刊全称"
              readonly
            />
          </el-form-item>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="ISSN编号" prop="issn">
                <el-input
                  v-model="paperForm.issn"
                  placeholder="ISSN编号"
                  readonly
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="期刊分区" prop="partition">
                <el-input
                  v-model="paperForm.partition"
                  placeholder="期刊分区"
                  readonly
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="发表单位排序" prop="institutionOrder">
            <el-input-number
              v-model="paperForm.institutionOrder"
              :min="1"
              :max="10"
              placeholder="本单位在作者单位中的排序"
            />
          </el-form-item>
        </div>
        
        <!-- 步骤3：作者信息 -->
        <div v-show="currentStep === 2" class="step-content">
          <div class="step-title">
            <el-icon><User /></el-icon>
            作者信息
          </div>
          
          <el-form-item label="第一作者" prop="firstAuthor">
            <el-input
              v-model="paperForm.firstAuthor"
              placeholder="第一作者姓名"
            />
          </el-form-item>
          
          <el-form-item label="通讯作者" prop="correspondingAuthor">
            <el-input
              v-model="paperForm.correspondingAuthor"
              placeholder="通讯作者姓名"
            />
          </el-form-item>
          
          <el-form-item label="所有作者" prop="allAuthors">
            <el-input
              v-model="paperForm.allAuthors"
              type="textarea"
              :rows="3"
              placeholder="请按顺序输入所有作者姓名，用分号分隔"
            />
          </el-form-item>
          
          <el-form-item label="作者单位" prop="authorInstitutions">
            <el-input
              v-model="paperForm.authorInstitutions"
              type="textarea"
              :rows="3"
              placeholder="请输入所有作者单位，与作者顺序对应"
            />
          </el-form-item>
        </div>
        
        <!-- 步骤4：文件上传 -->
        <div v-show="currentStep === 3" class="step-content">
          <div class="step-title">
            <el-icon><Upload /></el-icon>
            文件上传
          </div>
          
          <el-form-item label="论文原文" prop="paperFile">
            <el-upload
              ref="uploadRef"
              class="paper-upload"
              :drag="true"
              :multiple="false"
              :accept="'.pdf,.docx'"
              :before-upload="beforeUpload"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              :auto-upload="false"
              v-model:file-list="fileList"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持PDF、DOCX格式，文件大小不超过50MB
                </div>
              </template>
            </el-upload>
          </el-form-item>
          
          <!-- 已选择文件显示 -->
          <div v-if="selectedFile" class="selected-file">
            <div class="file-info">
              <el-icon><Document /></el-icon>
              <span>{{ selectedFile.name }}</span>
              <el-tag type="info" size="small">已选择</el-tag>
              <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 步骤5：提交审核 -->
        <div v-show="currentStep === 4" class="step-content">
          <div class="step-title">
            <el-icon><Check /></el-icon>
            提交审核
          </div>
          
          <!-- 上传进度 -->
          <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
            <el-progress :percentage="uploadProgress" :status="uploadStatus" />
            <p>正在上传文件，请稍候...</p>
          </div>
          
          <!-- 信息预览 -->
          <div v-else class="paper-preview">
            <h3>论文信息预览</h3>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="论文标题">{{ paperForm.title }}</el-descriptions-item>
              <el-descriptions-item label="论文类型">{{ getTypeText(paperForm.type) }}</el-descriptions-item>
              <el-descriptions-item label="期刊名称">{{ paperForm.journalName }}</el-descriptions-item>
              <el-descriptions-item label="期刊分区">{{ paperForm.partition }}</el-descriptions-item>
              <el-descriptions-item label="第一作者">{{ paperForm.firstAuthor }}</el-descriptions-item>
              <el-descriptions-item label="通讯作者">{{ paperForm.correspondingAuthor }}</el-descriptions-item>
              <el-descriptions-item label="发表年度">{{ paperForm.publishYear }}</el-descriptions-item>
              <el-descriptions-item label="语种">{{ getLanguageText(paperForm.language) }}</el-descriptions-item>
              <el-descriptions-item label="DOI">{{ paperForm.doi || '未填写' }}</el-descriptions-item>
              <el-descriptions-item label="论文文件">
                {{ selectedFile ? selectedFile.name : '未选择' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
        
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
            v-if="currentStep < 4"
            type="primary"
            size="large"
            @click="nextStep"
          >
            下一步
          </el-button>
          
          <div v-if="currentStep === 4" class="submit-actions">
            <el-button
              size="large"
              @click="saveDraft"
              :loading="savingDraft"
            >
              保存草稿
            </el-button>
            <el-button
              type="primary"
              size="large"
              @click="submitPaper"
              :loading="submitting"
            >
              提交审核
            </el-button>
          </div>
        </div>
      </el-form>
    </div>
    
    <!-- 期刊选择弹窗 -->
    <JournalSelector
      v-model="showJournalSelector"
      @confirm="handleJournalSelected"
    />
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { papersApi } from '@/api/papers'
import { journalsApi } from '@/api/journals'
import JournalSelector from '@/components/JournalSelector.vue'

const router = useRouter()
const route = useRoute()

// 响应式数据
const paperFormRef = ref(null)
const uploadRef = ref(null)
const currentStep = ref(0)
const journalSearchKeyword = ref('')
const journalSearchLoading = ref(false)
const showJournalSelector = ref(false)
const fileList = ref([])
const selectedFile = ref(null)
const uploadProgress = ref(0)
const uploadStatus = ref('success')
const savingDraft = ref(false)
const submitting = ref(false)
const isEditMode = ref(false)
const editingPaperId = ref(null)

// 表单数据
const paperForm = reactive({
  title: '',
  type: '',
  publishYear: '',
  language: '',
  doi: '',
  journalName: '',
  issn: '',
  partition: '',
  institutionOrder: 1,
  firstAuthor: '',
  correspondingAuthor: '',
  allAuthors: '',
  authorInstitutions: '',
  paperFile: null
})

// 表单验证规则
const paperRules = {
  title: [
    { required: true, message: '请输入论文标题', trigger: 'blur' },
    { min: 5, max: 200, message: '标题长度在 5 到 200 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择论文类型', trigger: 'change' }
  ],
  publishYear: [
    { required: true, message: '请选择发表年度', trigger: 'change' }
  ],
  language: [
    { required: true, message: '请选择语种', trigger: 'change' }
  ],
  journalName: [
    { required: true, message: '请选择期刊', trigger: 'blur' }
  ],
  firstAuthor: [
    { required: true, message: '请输入第一作者', trigger: 'blur' }
  ],
  correspondingAuthor: [
    { required: true, message: '请输入第一通讯作者', trigger: 'blur' }
  ],
  allAuthors: [
    { required: true, message: '请输入所有作者', trigger: 'blur' },
    { validator: (_rule, value, callback) => {
        const names = String(value || '')
          .split(';')
          .map(s => s.trim())
          .filter(Boolean)
        if (names.length < 1) {
          callback(new Error('至少需要一位作者'))
        } else {
          callback()
        }
      }, trigger: 'blur' }
  ]
}

// 搜索期刊
const searchJournals = async (queryString, callback) => {
  if (!queryString || queryString.length < 2) {
    callback([])
    return
  }
  
  journalSearchLoading.value = true
  
  try {
    const response = await journalsApi.searchJournals({
      keyword: queryString,
      year: '2023'
    })
    
    const results = response.data.map(journal => ({
      value: journal.name,
      name: journal.name,
      issn: journal.issn,
      partition: journal.partition,
      ...journal
    }))
    
    callback(results)
  } catch (error) {
    console.error('搜索期刊失败:', error)
    // 返回模拟数据
    const mockJournals = [
      {
        value: 'Nature',
        name: 'Nature',
        issn: '0028-0836',
        partition: 'Q1'
      },
      {
        value: 'Science',
        name: 'Science',
        issn: '0036-8075',
        partition: 'Q1'
      },
      {
        value: 'Cell',
        name: 'Cell',
        issn: '0092-8674',
        partition: 'Q1'
      }
    ].filter(journal => 
      journal.name.toLowerCase().includes(queryString.toLowerCase()) ||
      journal.issn.includes(queryString)
    )
    
    callback(mockJournals)
  } finally {
    journalSearchLoading.value = false
  }
}

// 选择期刊
const selectJournal = (journal) => {
  paperForm.journalName = journal.name
  paperForm.issn = journal.issn
  paperForm.partition = journal.partitionInfo || journal.partition
  paperForm.journalId = journal.id
}

// 处理期刊选择器确认
const handleJournalSelected = (journal) => {
  paperForm.journalName = journal.name
  paperForm.issn = journal.issn
  paperForm.partition = journal.partitionInfo
  paperForm.journalId = journal.id
  
  // 更新自动完成输入框显示
  journalSearchKeyword.value = journal.name
  
  ElMessage.success('期刊选择成功')
}

// 获取分区类型
const getPartitionType = (partition) => {
  if (partition === 'Q1') return 'success'
  if (partition === 'Q2') return 'info'
  if (partition === 'Q3') return 'warning'
  return 'danger'
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

// 获取语种文本
const getLanguageText = (language) => {
  const languageMap = {
    'chinese': '中文',
    'english': '英文',
    'other': '其他'
  }
  return languageMap[language] || '未知'
}

// 文件上传前检查
const beforeUpload = (file) => {
  const isValidType = file.type === 'application/pdf' || 
                     file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  const isValidSize = file.size / 1024 / 1024 < 50
  
  if (!isValidType) {
    ElMessage.error('文件格式不正确，请上传PDF或DOCX文件')
    return false
  }
  
  if (!isValidSize) {
    ElMessage.error('文件大小不能超过50MB')
    return false
  }
  
  return true
}

// 文件上传进度
const handleUploadProgress = (evt) => {
  uploadProgress.value = Math.round((evt.loaded * 100) / evt.total)
}

// 文件选择变化
const handleFileChange = (uploadFile, uploadFiles) => {
  if (uploadFile.status === 'ready') {
    selectedFile.value = uploadFile.raw
    console.log('文件已选择:', selectedFile.value.name)
  }
}

// 文件移除
const handleFileRemove = (uploadFile, uploadFiles) => {
  selectedFile.value = null
  console.log('文件已移除')
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 下一步
const nextStep = async () => {
  if (!paperFormRef.value) return
  
  // 验证当前步骤的字段
  const fieldsToValidate = getStepFields(currentStep.value)
  
  try {
    await paperFormRef.value.validateField(fieldsToValidate)
    
    // 特殊验证 - 文件上传步骤
    if (currentStep.value === 3 && !selectedFile.value) {
      ElMessage.error('请选择论文文件')
      return
    }
    
    currentStep.value++
  } catch (error) {
    ElMessage.error('请完善当前步骤的信息')
  }
}

// 上一步
const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 获取步骤对应的字段
const getStepFields = (step) => {
  const stepFieldsMap = {
    0: ['title', 'type', 'publishYear', 'language'],
    1: ['journalName'],
    2: ['firstAuthor', 'correspondingAuthor', 'allAuthors'],
    3: [],
    4: []
  }
  return stepFieldsMap[step] || []
}

// 保存草稿
const saveDraft = async () => {
  savingDraft.value = true
  
  try {
    // 1. 先创建论文草稿记录
    const buildAuthors = () => {
      const names = String(paperForm.allAuthors || '')
        .split(';')
        .map(s => s.trim())
        .filter(s => s)
      const institutions = String(paperForm.authorInstitutions || '')
        .split(';')
        .map(s => s.trim())
      return names.map((name, idx) => ({
        name,
        institution: institutions[idx] || '',
        email: ''
      }))
    }
    const paperData = {
      title: paperForm.title,
      type: paperForm.type,
      publish_year: Number(paperForm.publishYear) || undefined,
      doi: paperForm.doi,
      journal_name: paperForm.journalName,
      issn: paperForm.issn,
      journal_id: paperForm.journalId ? String(paperForm.journalId) : '',
      partition_info: paperForm.partition,
      first_author: paperForm.firstAuthor,
      corresponding_author: paperForm.correspondingAuthor,
      authors: buildAuthors(),
      status: 'draft'
    }
    
    const createResponse = await papersApi.submitPaper(paperData)
    const paperId = createResponse.data?.data?.id
    
    // 2. 如果有文件，上传文件
    if (selectedFile.value) {
      try {
        await papersApi.uploadPaperFile(paperId, selectedFile.value)
      } catch (uploadError) {
        console.error('文件上传失败:', uploadError)
        ElMessage.warning('草稿已保存，但文件上传失败，请稍后重新上传')
      }
    }
    
    ElMessage.success('草稿保存成功')
    router.push('/my-papers')
  } catch (error) {
    console.error('保存草稿失败:', error)
    ElMessage.error('保存草稿失败')
  } finally {
    savingDraft.value = false
  }
}

// 提交论文
const submitPaper = async () => {
  try {
    if (!isEditMode.value) {
      await ElMessageBox.confirm(
        '确定要提交论文进行审核吗？提交后将无法修改。',
        '确认提交',
        {
          confirmButtonText: '确定提交',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    }
    
    submitting.value = true
    
    // 1. 构建论文数据（创建/更新共用）
    const buildAuthors = () => {
      const names = String(paperForm.allAuthors || '')
        .split(';')
        .map(s => s.trim())
        .filter(s => s)
      const institutions = String(paperForm.authorInstitutions || '')
        .split(';')
        .map(s => s.trim())
      return names.map((name, idx) => ({
        name,
        institution: institutions[idx] || '',
        email: ''
      }))
    }
    const paperData = {
      title: paperForm.title,
      type: paperForm.type,
      publish_year: Number(paperForm.publishYear) || undefined,
      doi: paperForm.doi,
      journal_name: paperForm.journalName,
      issn: paperForm.issn,
      journal_id: paperForm.journalId ? String(paperForm.journalId) : '',
      partition_info: paperForm.partition,
      first_author: paperForm.firstAuthor,
      corresponding_author: paperForm.correspondingAuthor,
      authors: buildAuthors(),
      status: isEditMode.value ? undefined : 'pending'
    }
    
    let paperId = editingPaperId.value
    if (isEditMode.value) {
      await papersApi.updatePaper(editingPaperId.value, paperData)
    } else {
      const createResponse = await papersApi.submitPaper(paperData)
      paperId = createResponse.data?.data?.id
    }
    
    // 2. 如果有文件，上传文件
    if (selectedFile.value) {
      try {
        await papersApi.uploadPaperFile(paperId, selectedFile.value, (progressEvent) => {
          uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        })
      } catch (uploadError) {
        console.error('文件上传失败:', uploadError)
        ElMessage.warning('论文已创建，但文件上传失败，请稍后在"我的论文"中重新上传')
      }
    }
    
    ElMessage.success(isEditMode.value ? '论文更新成功' : '论文提交成功，请等待审核')
    router.push('/my-papers')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交失败:', error)
      ElMessage.error(isEditMode.value ? '更新失败，请稍后重试' : '提交失败，请稍后重试')
    }
  } finally {
    submitting.value = false
    uploadProgress.value = 0
  }
}

// 加载编辑模式
const loadEditingPaper = async (id) => {
  try {
    const resp = await papersApi.getPaperDetail(id)
    const p = resp.data?.data || {}
    paperForm.title = p.title || ''
    paperForm.type = p.type || ''
    paperForm.publishYear = p.publish_year ? String(p.publish_year) : ''
    paperForm.language = p.language || ''
    paperForm.doi = p.doi || ''
    paperForm.journalName = p.journal_name || ''
    paperForm.issn = p.issn || ''
    paperForm.partition = p.partition_info || ''
    paperForm.firstAuthor = p.first_author || ''
    paperForm.correspondingAuthor = p.corresponding_author || ''
    const authors = Array.isArray(p.authors) ? p.authors : []
    paperForm.allAuthors = authors.map(a => a.name).filter(Boolean).join(';')
    paperForm.authorInstitutions = authors.map(a => a.institution || '').join(';')
  } catch (e) {
    console.error('加载编辑论文失败:', e)
    ElMessage.error('加载论文信息失败')
  }
}

onMounted(() => {
  const editId = route.query.edit
  if (editId) {
    isEditMode.value = true
    editingPaperId.value = Number(editId)
    loadEditingPaper(editingPaperId.value)
  }
})
</script>

<style scoped>
.submit-paper-container {
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
  text-align: center;
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

.submit-steps {
  margin-bottom: 48px;
}

.form-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: var(--shadow-card);
}

.step-content {
  min-height: 400px;
}

.step-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--primary-color);
}

.journal-suggestion {
  padding: 8px 0;
}

.journal-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.journal-info {
  display: flex;
  gap: 8px;
}

.paper-upload {
  width: 100%;
}

.paper-upload :deep(.el-upload-dragger) {
  border-radius: 8px;
  border: 2px dashed var(--border-color);
  transition: border-color 0.3s ease;
}

.paper-upload :deep(.el-upload-dragger:hover) {
  border-color: var(--primary-color);
}

.upload-progress {
  margin-top: 16px;
  padding: 16px;
  background: var(--bg-light);
  border-radius: 8px;
  text-align: center;
}

.selected-file {
  margin-top: 16px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.uploaded-file {
  margin-top: 16px;
  padding: 16px;
  background: var(--primary-light);
  border-radius: 8px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.file-size {
  font-size: 12px;
  color: #9ca3af;
  margin-left: auto;
}

.file-info span {
  flex: 1;
  font-weight: 500;
}

.paper-preview {
  background: var(--bg-light);
  padding: 24px;
  border-radius: 8px;
}

.paper-preview h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light);
}

.submit-actions {
  display: flex;
  gap: 16px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .submit-paper-container {
    padding: 16px;
  }
  
  .form-container {
    padding: 24px 16px;
  }
  
  .submit-steps {
    margin-bottom: 24px;
  }
  
  .step-content {
    min-height: 300px;
  }
  
  .form-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .submit-actions {
    flex-direction: column;
    width: 100%;
  }
}

.journal-search-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
}
</style>