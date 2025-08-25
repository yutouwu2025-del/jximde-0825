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
                <span class="journal-name">{{ row.journal }}</span>
                <el-tag size="small" :type="getPartitionType(row.partition)">
                  {{ row.partition }}分区
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="first_author" label="第一作者" width="120" />
        <el-table-column prop="publish_year" label="发表年度" width="100" />
        <el-table-column prop="approved_at" label="审核时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.approved_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="viewPaper(row)">
              查看详情
            </el-button>
            <el-button text type="info" size="small" @click="downloadFile(row)">
              下载
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { papersApi } from '../api/papers'
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

const viewPaper = (paper) => {
  ElMessage.info('查看详情功能开发中...')
}

const downloadFile = (paper) => {
  if (paper.file_url) {
    window.open(paper.file_url, '_blank')
  } else {
    ElMessage.error('文件不存在')
  }
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
    
    papersList.value = response.data.papers || []
    pagination.total = response.data.total || 0
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