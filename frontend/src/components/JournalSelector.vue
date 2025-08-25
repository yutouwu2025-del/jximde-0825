<template>
  <el-dialog
    v-model="visible"
    title="选择期刊"
    width="80%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="journal-selector">
      <!-- 搜索条件 -->
      <div class="search-form">
        <el-form :model="searchForm" inline>
          <el-form-item label="年份">
            <el-select v-model="searchForm.year" placeholder="选择年份" style="width: 120px">
              <el-option label="2023" value="2023" />
              <el-option label="2022" value="2022" />
              <el-option label="2021" value="2021" />
              <el-option label="2020" value="2020" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="searchForm.keyword"
              placeholder="请输入期刊名称或ISSN"
              style="width: 300px"
              @keyup.enter="searchJournals"
            />
          </el-form-item>
          <el-form-item>
            <el-button 
              type="primary" 
              @click="searchJournals"
              :loading="loading"
              :disabled="!searchForm.keyword || searchForm.keyword.length < 2"
            >
              搜索
            </el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 搜索结果 -->
      <div class="search-results" v-if="journals.length > 0 || loading">
        <el-table
          :data="journals"
          v-loading="loading"
          stripe
          highlight-current-row
          @current-change="handleCurrentChange"
          height="400px"
        >
          <el-table-column type="index" width="50" />
          <el-table-column prop="name" label="期刊名称" min-width="200">
            <template #default="{ row }">
              <div class="journal-name">{{ row.name }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="issn" label="ISSN" width="120" />
          <el-table-column prop="publisher" label="出版商" width="150">
            <template #default="{ row }">
              <el-text truncated>{{ row.publisher || '-' }}</el-text>
            </template>
          </el-table-column>
          <el-table-column prop="partitionInfo" label="分区" width="80">
            <template #default="{ row }">
              <el-tag :type="getPartitionType(row.partitionLevel)" size="small">
                {{ row.partitionInfo || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="impactFactor" label="影响因子" width="100">
            <template #default="{ row }">
              {{ row.impactFactor || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="subjectCategories" label="学科分类" min-width="150">
            <template #default="{ row }">
              <el-text truncated>{{ row.subjectCategories || '-' }}</el-text>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper" v-if="total > 0">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading && searched" class="empty-state">
        <el-empty description="未找到匹配的期刊" />
      </div>

      <!-- 初始状态 -->
      <div v-else class="initial-state">
        <el-empty description="请输入关键词搜索期刊">
          <template #image>
            <el-icon size="60"><Search /></el-icon>
          </template>
        </el-empty>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm"
          :disabled="!selectedJournal"
        >
          确认选择
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { journalsApi } from '@/api/journals'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const searchForm = reactive({
  year: '2023',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20
})

const journals = ref([])
const selectedJournal = ref(null)
const loading = ref(false)
const searched = ref(false)
const total = ref(0)

// 搜索期刊
const searchJournals = async () => {
  if (!searchForm.keyword || searchForm.keyword.trim().length < 2) {
    ElMessage.warning('请输入至少2个字符的关键词')
    return
  }

  loading.value = true
  searched.value = true
  
  try {
    const response = await journalsApi.searchJournals({
      keyword: searchForm.keyword.trim(),
      year: searchForm.year,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    
    journals.value = response.data.data || []
    total.value = response.data.pagination?.total || response.data.total || journals.value.length
    
    if (journals.value.length === 0) {
      ElMessage.info('未找到匹配的期刊')
    } else {
      ElMessage.success(`找到 ${journals.value.length} 个期刊`)
    }
  } catch (error) {
    console.error('搜索期刊失败:', error)
    
    // 根据错误类型显示不同提示
    if (error.code === 'ECONNABORTED') {
      ElMessage.warning('搜索请求超时，请尝试更具体的关键词或稍后重试')
    } else if (error.message?.includes('timeout')) {
      ElMessage.warning('网络响应较慢，请稍后重试')
    } else {
      ElMessage.error('搜索期刊失败，请检查网络连接')
    }
    
    journals.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 重置搜索
const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.year = '2023'
  pagination.page = 1
  pagination.pageSize = 20
  journals.value = []
  selectedJournal.value = null
  searched.value = false
  total.value = 0
}

// 表格选择变化
const handleCurrentChange = (currentRow) => {
  selectedJournal.value = currentRow
}

// 分页大小改变
const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.page = 1
  searchJournals()
}

// 页码改变
const handlePageChange = (val) => {
  pagination.page = val
  searchJournals()
}

// 获取分区标签类型
const getPartitionType = (partitionLevel) => {
  switch (partitionLevel) {
    case 'Q1':
      return 'danger'
    case 'Q2':
      return 'warning'
    case 'Q3':
      return 'info'
    case 'Q4':
      return 'info'
    default:
      return ''
  }
}

// 取消选择
const handleCancel = () => {
  resetSearch()
  visible.value = false
}

// 确认选择
const handleConfirm = () => {
  if (!selectedJournal.value) {
    ElMessage.warning('请选择一个期刊')
    return
  }
  
  emit('confirm', selectedJournal.value)
  resetSearch()
  visible.value = false
}
</script>

<style scoped>
.journal-selector {
  min-height: 500px;
}

.search-form {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.search-results {
  margin-top: 20px;
}

.journal-name {
  font-weight: 500;
  color: #303133;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.empty-state,
.initial-state {
  margin: 60px 0;
  text-align: center;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row.current-row) {
  background-color: #ecf5ff;
}
</style>