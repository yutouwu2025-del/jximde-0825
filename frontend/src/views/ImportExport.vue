<template>
  <div class="import-export-container">
    <div class="page-header">
      <h1 class="page-title">数据导入导出</h1>
      <p class="page-description">批量处理论文数据，支持Excel格式导入导出</p>
    </div>
    
    <el-row :gutter="24">
      <!-- 数据导入 -->
      <el-col :span="12">
        <div class="card">
          <h3><el-icon><Upload /></el-icon> 数据导入</h3>
          <div class="import-section">
            <el-upload
              class="upload-demo"
              :drag="true"
              :auto-upload="false"
              :accept="'.xlsx,.xls'"
              :before-upload="beforeUpload"
              v-model:file-list="importFileList"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将Excel文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  只能上传xlsx/xls文件，且不超过10MB
                </div>
              </template>
            </el-upload>
            
            <div class="import-actions">
              <el-button @click="downloadTemplate">
                <el-icon><Download /></el-icon>
                下载模板
              </el-button>
              <el-button type="primary" @click="importData" :loading="importing">
                开始导入
              </el-button>
            </div>
          </div>
        </div>
      </el-col>
      
      <!-- 数据导出 -->
      <el-col :span="12">
        <div class="card">
          <h3><el-icon><Download /></el-icon> 数据导出</h3>
          <div class="export-section">
            <el-form :model="exportForm" label-width="100px">
              <el-form-item label="导出范围">
                <el-radio-group v-model="exportForm.scope">
                  <el-radio label="all">全部数据</el-radio>
                  <el-radio label="my">我的论文</el-radio>
                  <el-radio label="approved">已审核通过</el-radio>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="论文类型">
                <el-checkbox-group v-model="exportForm.types">
                  <el-checkbox label="journal">期刊论文</el-checkbox>
                  <el-checkbox label="conference">学会论文</el-checkbox>
                  <el-checkbox label="degree">学位论文</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
              
              <el-form-item label="发表年度">
                <el-date-picker
                  v-model="exportForm.yearRange"
                  type="yearrange"
                  range-separator="至"
                  start-placeholder="开始年度"
                  end-placeholder="结束年度"
                  format="YYYY"
                  value-format="YYYY"
                />
              </el-form-item>
              
              <el-form-item label="包含字段">
                <el-checkbox-group v-model="exportForm.fields">
                  <el-checkbox label="basic">基本信息</el-checkbox>
                  <el-checkbox label="author">作者信息</el-checkbox>
                  <el-checkbox label="journal">期刊信息</el-checkbox>
                  <el-checkbox label="audit">审核信息</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-form>
            
            <div class="export-actions">
              <el-button type="primary" @click="exportData" :loading="exporting">
                <el-icon><Download /></el-icon>
                导出数据
              </el-button>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 操作历史 -->
    <div class="card history-card">
      <h3><el-icon><Clock /></el-icon> 操作历史</h3>
      <el-table :data="operationHistory" stripe>
        <el-table-column prop="type" label="操作类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'import' ? 'success' : 'info'">
              {{ row.type === 'import' ? '导入' : '导出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="操作描述" />
        <el-table-column prop="count" label="数据量" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="操作时间" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { papersApi } from '../api/papers'
import api from '../api/index'
import dayjs from 'dayjs'

const importing = ref(false)
const exporting = ref(false)
const importFileList = ref([])

const exportForm = reactive({
  scope: 'my',
  types: ['journal', 'conference', 'degree'],
  yearRange: [],
  fields: ['basic', 'author', 'journal']
})

const operationHistory = ref([
  {
    type: 'export',
    description: '导出我的论文数据',
    count: 15,
    status: 'success',
    created_at: '2024-01-15 14:30:00'
  }
])

const beforeUpload = (file) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                  file.type === 'application/vnd.ms-excel'
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isExcel) {
    ElMessage.error('只能上传Excel文件')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过10MB')
    return false
  }
  return true
}

const downloadTemplate = () => {
  // 创建模板下载
  const link = document.createElement('a')
  link.href = '/templates/paper_import_template.xlsx'
  link.download = '论文导入模板.xlsx'
  link.click()
}

const importData = async () => {
  if (importFileList.value.length === 0) {
    ElMessage.warning('请先选择要导入的文件')
    return
  }
  
  importing.value = true
  try {
    const file = importFileList.value[0].raw
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/upload/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    const result = response.data
    ElMessage.success(`数据导入成功：导入了 ${result.data?.successCount || 0} 条记录`)
    
    // 记录操作历史
    operationHistory.value.unshift({
      type: 'import',
      description: `导入论文数据：${file.name}`,
      count: result.data?.successCount || 0,
      status: 'success',
      created_at: new Date().toLocaleString()
    })
    
    importFileList.value = []
  } catch (error) {
    console.error('数据导入失败:', error)
    
    // 记录失败历史
    operationHistory.value.unshift({
      type: 'import',
      description: `导入论文数据失败：${importFileList.value[0]?.name}`,
      count: 0,
      status: 'failed',
      created_at: new Date().toLocaleString()
    })
    
    ElMessage.error('数据导入失败: ' + (error.response?.data?.message || error.message))
  } finally {
    importing.value = false
  }
}

const exportData = async () => {
  exporting.value = true
  try {
    const params = {
      format: 'csv',
      scope: exportForm.scope,
      types: exportForm.types.join(','),
      startYear: exportForm.yearRange?.[0],
      endYear: exportForm.yearRange?.[1],
      fields: exportForm.fields.join(',')
    }
    
    // 使用统计API导出数据
    const response = await api.get('/statistics/export', {
      params: {
        format: 'csv',
        type: exportForm.scope === 'my' ? 'personal' : 'overview',
        ...params
      },
      responseType: 'blob'
    })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    
    // 生成文件名
    const scopeText = exportForm.scope === 'all' ? '全部' : 
                     exportForm.scope === 'my' ? '我的' : '已审核'
    const fileName = `论文数据_${scopeText}_${dayjs().format('YYYY-MM-DD')}.csv`
    link.download = fileName
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    // 记录操作历史
    operationHistory.value.unshift({
      type: 'export',
      description: `导出${scopeText}论文数据`,
      count: 'N/A', // 导出时无法知道具体数量
      status: 'success',
      created_at: new Date().toLocaleString()
    })
    
    ElMessage.success('数据导出成功')
  } catch (error) {
    console.error('数据导出失败:', error)
    
    // 记录失败历史
    operationHistory.value.unshift({
      type: 'export',
      description: '导出论文数据失败',
      count: 0,
      status: 'failed',
      created_at: new Date().toLocaleString()
    })
    
    ElMessage.error('数据导出失败: ' + (error.response?.data?.message || error.message))
  } finally {
    exporting.value = false
  }
}

const formatDateTime = (datetime) => {
  return dayjs(datetime).format('YYYY-MM-DD HH:mm')
}
</script>

<style scoped>
.import-export-container {
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

.card {
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  padding: 24px;
  margin-bottom: 24px;
}

.card h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.import-section,
.export-section {
  padding: 20px 0;
}

.import-actions,
.export-actions {
  margin-top: 20px;
  display: flex;
  gap: 16px;
}

.history-card {
  margin-top: 24px;
}

.upload-demo {
  margin-bottom: 20px;
}
</style>