<template>
  <div class="ip-audit-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">专利/软著审核</h1>
      <p class="page-description">审核待处理的专利和软件著作权，确保信息准确性和完整性</p>
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
            v-model="filters.itemType"
            placeholder="类型"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="全部" value="" />
            <el-option label="专利" value="patent" />
            <el-option label="软著" value="copyright" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="6" v-if="filters.itemType === 'patent'">
          <el-select
            v-model="filters.patentType"
            placeholder="专利类型"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="全部" value="" />
            <el-option label="发明专利" value="invention" />
            <el-option label="实用新型" value="utility_model" />
            <el-option label="外观设计" value="design" />
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
            placeholder="搜索标题或发明人"
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
    <div v-if="selectedItems.length > 0" class="batch-operations">
      <div class="batch-info">
        已选择 {{ selectedItems.length }} 项
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
    
    <!-- 待审核列表 -->
    <div class="items-table">
      <el-table
        :data="pendingItems"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        stripe
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag 
              :type="row.item_type === 'patent' ? 'primary' : 'success'"
              size="small"
            >
              {{ row.item_type === 'patent' ? '专利' : '软著' }}
            </el-tag>
          </template>
        </el-table-column>
        
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
        
        <el-table-column label="基本信息" min-width="350">
          <template #default="{ row }">
            <div class="item-info">
              <div class="item-title" @click="viewItemDetail(row)">
                {{ row.title || row.name }}
              </div>
              <div class="item-meta">
                <el-tag 
                  v-if="row.item_type === 'patent'" 
                  size="small" 
                  class="meta-tag"
                >
                  {{ getPatentTypeText(row.patent_type) }}
                </el-tag>
                <span class="applicant">{{ row.applicant || '未填写' }}</span>
                <span v-if="row.application_number" class="application-number">
                  申请号：{{ row.application_number }}
                </span>
                <span v-if="row.registration_number" class="registration-number">
                  登记号：{{ row.registration_number }}
                </span>
                <span v-if="row.application_date || row.creation_completion_date" class="apply-date">
                  {{ formatDate(row.application_date || row.creation_completion_date) }}
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="第一发明人" width="150">
          <template #default="{ row }">
            <div class="first-inventor">
              {{ row.first_inventor || row.first_applicant || '未填写' }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
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
                type="warning" 
                size="small" 
                @click="editItemInfo(row)"
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
    
    <!-- 审核对话框 -->
    <el-dialog
      v-model="auditDialog"
      title="专利/软著审核"
      width="80%"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="currentAuditItem" class="audit-content">
        <!-- 基本信息展示 -->
        <div class="item-details">
          <h3>{{ currentAuditItem.item_type === 'patent' ? '专利' : '软著' }}基本信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="类型">
              <el-tag :type="currentAuditItem.item_type === 'patent' ? 'primary' : 'success'">
                {{ currentAuditItem.item_type === 'patent' ? '专利' : '软件著作权' }}
              </el-tag>
            </el-descriptions-item>
            
            <!-- 专利特有字段 -->
            <template v-if="currentAuditItem.item_type === 'patent'">
              <el-descriptions-item label="专利类型">
                {{ getPatentTypeText(currentAuditItem.patent_type) }}
              </el-descriptions-item>
              <el-descriptions-item label="专利名称">
                {{ currentAuditItem.title || '未填写' }}
              </el-descriptions-item>
              <el-descriptions-item label="第一发明人">
                {{ currentAuditItem.first_inventor || '未填写' }}
              </el-descriptions-item>
              <el-descriptions-item label="专利权人">
                {{ currentAuditItem.first_patentee || '未填写' }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentAuditItem.patent_number" label="专利号">
                {{ currentAuditItem.patent_number }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentAuditItem.application_number" label="申请号">
                {{ currentAuditItem.application_number }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentAuditItem.application_date" label="申请日期">
                {{ formatDate(currentAuditItem.application_date) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentAuditItem.authorization_date" label="授权日期">
                {{ formatDate(currentAuditItem.authorization_date) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentAuditItem.abstract" label="专利摘要" :span="2">
                {{ currentAuditItem.abstract }}
              </el-descriptions-item>
            </template>
            
            <!-- 软著特有字段 -->
            <template v-else>
              <el-descriptions-item label="软件名称">
                {{ currentAuditItem.software_name || currentAuditItem.title || '未填写' }}
              </el-descriptions-item>
              <el-descriptions-item label="第一申请人">
                {{ currentAuditItem.first_applicant || '未填写' }}
              </el-descriptions-item>
              <el-descriptions-item label="著作权人">
                {{ currentAuditItem.copyright_owner || '未填写' }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentAuditItem.registration_number" label="登记号">
                {{ currentAuditItem.registration_number }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentAuditItem.development_completion_date" label="开发完成日期">
                {{ formatDate(currentAuditItem.development_completion_date) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentAuditItem.creation_completion_date" label="创作完成日期">
                {{ formatDate(currentAuditItem.creation_completion_date) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentAuditItem.description" label="软件描述" :span="2">
                {{ currentAuditItem.description }}
              </el-descriptions-item>
            </template>
            
            <!-- 通用字段 -->
            <el-descriptions-item label="优先级">
              <el-tag :type="getPriorityType(currentAuditItem.priority)" size="small">
                {{ getPriorityText(currentAuditItem.priority) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="提交人">
              {{ currentAuditItem.user_name || '未知' }}
            </el-descriptions-item>
            <el-descriptions-item label="提交时间">
              {{ formatDate(currentAuditItem.created_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        
        <!-- 其他发明人/申请人信息 -->
        <div v-if="getOtherPersons(currentAuditItem)?.length > 0" class="others-section">
          <h3>{{ currentAuditItem.item_type === 'patent' ? '其他发明人' : '其他申请人' }}</h3>
          <div class="others-list">
            <el-tag 
              v-for="(person, index) in getOtherPersons(currentAuditItem)" 
              :key="index"
              type="info"
              style="margin-right: 8px; margin-bottom: 8px;"
            >
              {{ person }}
            </el-tag>
          </div>
        </div>
        
        <!-- 文件预览 -->
        <div v-if="hasAuditFile" class="file-preview">
          <h3>{{ currentAuditItem.item_type === 'patent' ? '专利' : '软著' }}文件</h3>
          <div class="file-info">
            <el-icon><Document /></el-icon>
            <span class="file-name">{{ currentAuditItem.file_name || getFileNameFromUrl(resolvedAuditFileUrl) }}</span>
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
                <el-checkbox label="申请号/登记号错误">申请号/登记号错误</el-checkbox>
                <el-checkbox label="文件格式不正确">文件格式不正确</el-checkbox>
                <el-checkbox label="发明人/作者信息有误">发明人/作者信息有误</el-checkbox>
                <el-checkbox label="材料不符合要求">材料不符合要求</el-checkbox>
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
    
    <!-- 编辑信息对话框 -->
    <el-dialog
      v-model="editDialog"
      :title="`编辑${currentEditItem?.item_type === 'patent' ? '专利' : '软著'}信息`"
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
          <el-col :span="12">
            <el-form-item label="类型" prop="item_type">
              <el-select v-model="editForm.item_type" style="width: 100%" disabled>
                <el-option label="专利" value="patent" />
                <el-option label="软件著作权" value="copyright" />
              </el-select>
            </el-form-item>
          </el-col>
          
          <!-- 专利特有字段 -->
          <template v-if="editForm.item_type === 'patent'">
            <el-col :span="12">
              <el-form-item label="专利类型" prop="patent_type">
                <el-select v-model="editForm.patent_type" style="width: 100%">
                  <el-option label="发明专利" value="invention" />
                  <el-option label="实用新型" value="utility_model" />
                  <el-option label="外观设计" value="design" />
                </el-select>
              </el-form-item>
            </el-col>
            
            <el-col :span="24">
              <el-form-item label="专利名称" prop="title">
                <el-input
                  v-model="editForm.title"
                  placeholder="请输入专利名称"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="第一专利权人" prop="applicant">
                <el-input
                  v-model="editForm.applicant"
                  placeholder="请输入第一专利权人"
                  maxlength="200"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="第一发明人" prop="first_inventor">
                <el-input
                  v-model="editForm.first_inventor"
                  placeholder="请输入第一发明人"
                  maxlength="200"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="申请号" prop="application_number">
                <el-input
                  v-model="editForm.application_number"
                  placeholder="请输入申请号"
                  maxlength="50"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="专利号" prop="patent_number">
                <el-input
                  v-model="editForm.patent_number"
                  placeholder="请输入专利号"
                  maxlength="50"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="申请日期" prop="application_date">
                <el-date-picker
                  v-model="editForm.application_date"
                  type="date"
                  placeholder="选择申请日期"
                  style="width: 100%"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="授权日期" prop="authorization_date">
                <el-date-picker
                  v-model="editForm.authorization_date"
                  type="date"
                  placeholder="选择授权日期"
                  style="width: 100%"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="24">
              <el-form-item label="专利摘要">
                <el-input
                  v-model="editForm.description"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入专利摘要信息..."
                  maxlength="1000"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
          </template>
          
          <!-- 软著特有字段 -->
          <template v-else-if="editForm.item_type === 'copyright'">
            <el-col :span="12"></el-col> <!-- 占位保持布局 -->
            
            <el-col :span="24">
              <el-form-item label="软件名称" prop="title">
                <el-input
                  v-model="editForm.title"
                  placeholder="请输入软件名称"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="著作权人" prop="applicant">
                <el-input
                  v-model="editForm.applicant"
                  placeholder="请输入著作权人"
                  maxlength="200"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="登记号" prop="registration_number">
                <el-input
                  v-model="editForm.registration_number"
                  placeholder="请输入登记号"
                  maxlength="50"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="创作完成日期" prop="creation_completion_date">
                <el-date-picker
                  v-model="editForm.creation_completion_date"
                  type="date"
                  placeholder="选择创作完成日期"
                  style="width: 100%"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="12">
              <el-form-item label="开发完成日期" prop="development_completion_date">
                <el-date-picker
                  v-model="editForm.development_completion_date"
                  type="date"
                  placeholder="选择开发完成日期"
                  style="width: 100%"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="24">
              <el-form-item label="软件描述">
                <el-input
                  v-model="editForm.description"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入软件描述信息..."
                  maxlength="1000"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
          </template>
        </el-row>
      </el-form>
      
      <!-- 当前附件信息 -->
      <div v-if="hasEditFile" class="file-preview">
        <h3>当前附件</h3>
        <div class="file-info">
          <el-icon><Document /></el-icon>
          <span class="file-name">{{ currentEditItem?.file_name || getFileNameFromUrl(resolvedEditFileUrl) }}</span>
          <div class="file-actions">
            <el-button type="primary" size="small" @click="() => openUrlInPreview(resolvedEditFileUrl)">
              <el-icon><View /></el-icon>
              在线预览
            </el-button>
            <el-button type="info" size="small" @click="() => downloadFromApi(currentEditItem?.id)">
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
import { 
  Search, 
  Document, 
  View, 
  Download, 
  Link, 
  Refresh, 
  DocumentRemove, 
  Loading 
} from '@element-plus/icons-vue'
import { piApi } from '../../api/pi'
import dayjs from 'dayjs'

// 响应式数据
const loading = ref(false)
const auditDialog = ref(false)
const filePreviewDialog = ref(false)
const auditSubmitting = ref(false)
const editDialog = ref(false)
const editSubmitting = ref(false)
const pendingItems = ref([])
const selectedItems = ref([])
const currentAuditItem = ref(null)
const currentEditItem = ref(null)
const previewUrl = ref('')
const previewError = ref('')
const currentFileInfo = ref(null)

// 后端基址
const getBackendOrigin = () => {
  const { protocol, hostname, port } = window.location
  if (port === '8080') return `${protocol}//${hostname}:3000`
  return `${protocol}//${hostname}${port ? ':' + port : ''}`
}

// 解析文件URL
const resolveFileUrl = (pathOrUrl) => {
  if (!pathOrUrl) return ''
  if (String(pathOrUrl).startsWith('http')) return pathOrUrl
  if (String(pathOrUrl).startsWith('/uploads')) return `${getBackendOrigin()}${pathOrUrl}`
  if (String(pathOrUrl).startsWith('uploads')) return `${getBackendOrigin()}/${pathOrUrl}`
  return `${getBackendOrigin()}${pathOrUrl}`
}

// 格式化文件大小
const formatFileSize = (size) => {
  if (!size) return '未知'
  const sizeNum = parseInt(size)
  if (sizeNum < 1024) return `${sizeNum} B`
  if (sizeNum < 1024 * 1024) return `${(sizeNum / 1024).toFixed(1)} KB`
  if (sizeNum < 1024 * 1024 * 1024) return `${(sizeNum / 1024 / 1024).toFixed(1)} MB`
  return `${(sizeNum / 1024 / 1024 / 1024).toFixed(1)} GB`
}

const hasAuditFile = computed(() => !!(currentAuditItem.value?.file_url || currentAuditItem.value?.file_path))
const resolvedAuditFileUrl = computed(() => resolveFileUrl(currentAuditItem.value?.file_url || currentAuditItem.value?.file_path))

const hasEditFile = computed(() => !!(currentEditItem.value?.file_url || currentEditItem.value?.file_path))
const resolvedEditFileUrl = computed(() => resolveFileUrl(currentEditItem.value?.file_url || currentEditItem.value?.file_path))

// 表单引用
const auditFormRef = ref(null)
const editFormRef = ref(null)

// 筛选条件
const filters = reactive({
  itemType: '',
  patentType: '',
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
  comment: []
}

// 编辑表单
const editForm = reactive({
  item_type: '',
  patent_type: '',
  title: '',
  applicant: '', // 专利权人/著作权人
  first_inventor: '', // 第一发明人
  application_number: '',
  patent_number: '',
  registration_number: '',
  application_date: '',
  authorization_date: '',
  creation_completion_date: '',
  development_completion_date: '',
  description: ''
})

// 编辑表单验证规则
const editRules = {
  title: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 200, message: '名称长度在 2 到 200 个字符', trigger: 'blur' }
  ],
  applicant: [
    { required: true, message: '请输入申请人/著作权人', trigger: 'blur' }
  ]
}

// 文件预览标题
const filePreviewTitle = computed(() => {
  if (currentAuditItem.value) {
    return `文件预览 - ${currentAuditItem.value.title || currentAuditItem.value.name}`
  }
  return '文件预览'
})

// 获取专利类型文本
const getPatentTypeText = (type) => {
  const typeMap = {
    'invention': '发明专利',
    'utility_model': '实用新型',
    'design': '外观设计'
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

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD HH:mm')
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
  loadPendingItems()
}

// 处理搜索
const handleSearch = () => {
  pagination.current = 1
  loadPendingItems()
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedItems.value = selection
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.current = page
  loadPendingItems()
}

// 处理页大小变化
const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  loadPendingItems()
}

// 查看详情
const viewItemDetail = (item) => {
  ElMessage.info('详情功能开发中...')
}

// 查看文件
const viewItemFile = (item) => {
  const url = resolveFileUrl(item.file_url || item.file_path)
  if (url) {
    previewUrl.value = url
    previewError.value = ''
    
    // 设置文件信息
    currentFileInfo.value = {
      name: item.file_name || getFileNameFromUrl(url) || `${item.title || item.software_name || item.name}.pdf`,
      type: getFileTypeFromUrl(url),
      size: item.file_size ? formatFileSize(item.file_size) : '未知'
    }
    
    filePreviewDialog.value = true
  } else {
    ElMessage.error('文件不存在')
  }
}

// 下载单个文件
const downloadItemFile = (item) => {
  const url = resolveFileUrl(item.file_url || item.file_path)
  if (url) {
    const link = document.createElement('a')
    link.href = url
    const fileName = item.file_name || `${item.title || item.software_name || 'file'}.pdf`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } else {
    ElMessage.error('文件不存在')
  }
}

// 编辑信息
const editItemInfo = async (item) => {
  try {
    console.log('开始编辑项目:', item)
    
    // 根据类型获取详细信息
    let detailData = null
    if (item.item_type === 'patent') {
      console.log('获取专利详情用于编辑:', item.id)
      const response = await piApi.getPatentDetail(item.id)
      detailData = response.data || response || item
    } else if (item.item_type === 'copyright') {
      console.log('获取软著详情用于编辑:', item.id)
      const response = await piApi.getCopyrightDetail(item.id)
      detailData = response.data || response || item
    }
    
    console.log('编辑获取到的详细数据:', detailData)
    
    // 合并基本信息和详细信息
    const itemData = {
      ...item,
      ...detailData,
      item_type: item.item_type // 确保类型字段正确
    }
    
    currentEditItem.value = itemData
    console.log('编辑合并后的数据:', itemData)
    
    // 根据类型填充编辑表单
    if (item.item_type === 'patent') {
      // 专利编辑表单
      Object.assign(editForm, {
        item_type: 'patent',
        patent_type: itemData.patent_type || '',
        title: itemData.title || '',
        applicant: itemData.first_patentee || '', // 第一专利权人
        first_inventor: itemData.first_inventor || '', // 第一发明人
        application_number: itemData.application_number || '',
        patent_number: itemData.patent_number || '',
        application_date: itemData.application_date ? dayjs(itemData.application_date).format('YYYY-MM-DD') : '',
        authorization_date: itemData.authorization_date ? dayjs(itemData.authorization_date).format('YYYY-MM-DD') : '',
        description: itemData.abstract || itemData.description || ''
      })
    } else {
      // 软著编辑表单
      Object.assign(editForm, {
        item_type: 'copyright',
        patent_type: '',
        title: itemData.software_name || itemData.title || '',
        applicant: itemData.copyright_owner || itemData.first_applicant || '',
        registration_number: itemData.registration_number || '',
        application_number: '',
        patent_number: '',
        application_date: '',
        authorization_date: '',
        creation_completion_date: itemData.creation_completion_date ? dayjs(itemData.creation_completion_date).format('YYYY-MM-DD') : '',
        development_completion_date: itemData.development_completion_date ? dayjs(itemData.development_completion_date).format('YYYY-MM-DD') : '',
        description: itemData.description || ''
      })
    }
    
    console.log('填充后的编辑表单:', editForm)
    editDialog.value = true
    
  } catch (error) {
    console.error('获取详细信息失败:', error)
    ElMessage.error('获取详细信息失败: ' + (error.response?.data?.message || error.message))
  }
}

// 开始审核
const startAudit = async (item) => {
  try {
    console.log('开始审核项目:', item)
    
    // 根据类型获取详细信息
    let detailData = null
    if (item.item_type === 'patent') {
      console.log('获取专利详情:', item.id)
      const response = await piApi.getPatentDetail(item.id)
      detailData = response.data || response || item
    } else if (item.item_type === 'copyright') {
      console.log('获取软著详情:', item.id)
      const response = await piApi.getCopyrightDetail(item.id)
      detailData = response.data || response || item
    }
    
    console.log('获取到的详细数据:', detailData)
    
    // 合并基本信息和详细信息
    currentAuditItem.value = {
      ...item,
      ...detailData,
      item_type: item.item_type // 确保类型字段正确
    }
    
    console.log('合并后的审核数据:', currentAuditItem.value)
    
    // 重置表单
    Object.assign(auditForm, {
      result: '',
      comment: '',
      rejectReasons: [],
      priority: item.priority || 'normal'
    })
    
    auditDialog.value = true
  } catch (error) {
    console.error('获取详细信息失败:', error)
    // 如果获取详情失败，使用基本信息
    currentAuditItem.value = item
    auditDialog.value = true
  }
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
const downloadFile = () => {
  const url = resolvedAuditFileUrl.value
  if (url) {
    const link = document.createElement('a')
    link.href = url
    link.download = currentAuditItem.value?.file_name || `${currentAuditItem.value?.title || 'file'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// 下载当前文件
const downloadCurrentFile = () => {
  if (previewUrl.value) {
    const link = document.createElement('a')
    link.href = previewUrl.value
    link.download = `文件_${currentAuditItem.value?.title || 'file'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// 在新标签页打开文件
const openFileInNewTab = () => {
  const url = previewUrl.value || resolvedAuditFileUrl.value
  if (url) window.open(url, '_blank')
}

// 刷新预览
const refreshPreview = () => {
  previewError.value = ''
  // 重新加载预览
  if (previewUrl.value) {
    const iframe = document.querySelector('.file-preview-content iframe')
    if (iframe) {
      iframe.src = iframe.src
    }
  }
}

// 处理预览错误
const handlePreviewError = (error) => {
  console.error('文件预览错误:', error)
  previewError.value = '文件预览失败，可能文件格式不支持在线预览'
}

// 获取预览URL
const getPreviewUrl = (url) => {
  if (!url) return ''
  
  // 对于PDF文件，可以添加预览参数
  if (url.toLowerCase().includes('.pdf')) {
    return `${url}#view=FitH&toolbar=1&navpanes=1`
  }
  return url
}

// 从URL获取文件名
const getFileNameFromUrl = (url) => {
  if (!url) return ''
  try {
    const parts = url.split('/')
    const name = parts[parts.length - 1]
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

// 获取其他发明人/申请人列表
const getOtherPersons = (item) => {
  if (!item) return []
  
  const otherPersons = item.other_inventors || item.other_applicants || []
  if (!otherPersons) return []
  
  // 如果是字符串，尝试解析为JSON
  if (typeof otherPersons === 'string') {
    try {
      const parsed = JSON.parse(otherPersons)
      if (Array.isArray(parsed)) {
        return parsed.map(person => {
          if (typeof person === 'string') return person
          return person.name || person.toString()
        })
      }
    } catch (e) {
      // 如果JSON解析失败，按逗号分隔
      return otherPersons.split(',').map(name => name.trim()).filter(name => name)
    }
  }
  
  // 如果已经是数组
  if (Array.isArray(otherPersons)) {
    return otherPersons.map(person => {
      if (typeof person === 'string') return person
      return person.name || person.toString()
    })
  }
  
  return []
}



// 打开预览
const openUrlInPreview = (url) => {
  if (!url) return
  previewUrl.value = resolveFileUrl(url)
  previewError.value = ''
  filePreviewDialog.value = true
}

// 通过API下载文件
const downloadFromApi = async (itemId) => {
  if (!itemId) return
  try {
    const endpoint = currentEditItem.value?.item_type === 'patent' 
      ? `/pi/patents/${itemId}/download`
      : `/pi/copyrights/${itemId}/download`
    window.open(endpoint, '_blank')
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

// 提交编辑
const submitEdit = async () => {
  if (!editFormRef.value || !currentEditItem.value) return
  
  try {
    const valid = await editFormRef.value.validate()
    if (!valid) return
    
    editSubmitting.value = true
    console.log('开始保存编辑:', currentEditItem.value.item_type, editForm)
    
    // 根据类型构建更新数据
    let updateData = {}
    
    if (currentEditItem.value.item_type === 'patent') {
      // 专利更新数据
      updateData = {
        title: editForm.title,
        patent_type: editForm.patent_type,
        first_patentee: editForm.applicant, // 第一专利权人
        first_inventor: editForm.first_inventor, // 第一发明人
        application_number: editForm.application_number,
        patent_number: editForm.patent_number,
        application_date: editForm.application_date || null,
        authorization_date: editForm.authorization_date || null,
        abstract: editForm.description
      }
      console.log('专利更新数据:', updateData)
      
      // 调用专利更新API
      await piApi.updatePatent(currentEditItem.value.id, updateData)
      
    } else if (currentEditItem.value.item_type === 'copyright') {
      // 软著更新数据
      updateData = {
        software_name: editForm.title,
        copyright_owner: editForm.applicant,
        first_applicant: editForm.applicant, // 可能需要同时更新申请人
        registration_number: editForm.registration_number,
        creation_completion_date: editForm.creation_completion_date || null,
        development_completion_date: editForm.development_completion_date || null,
        description: editForm.description
      }
      console.log('软著更新数据:', updateData)
      
      // 调用软著更新API
      await piApi.updateCopyright(currentEditItem.value.id, updateData)
    }
    
    ElMessage.success('信息更新成功')
    editDialog.value = false
    
    // 刷新数据
    loadPendingItems()
    loadAuditStats()
    
  } catch (error) {
    console.error('更新失败:', error)
    ElMessage.error('更新信息失败: ' + (error.response?.data?.message || error.message))
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
    
    // 调用审核API
    if (currentAuditItem.value.item_type === 'patent') {
      await piApi.auditPatent(currentAuditItem.value.id, auditData)
    } else {
      await piApi.auditCopyright(currentAuditItem.value.id, auditData)
    }
    
    ElMessage.success('审核提交成功')
    auditDialog.value = false
    loadPendingItems()
    loadAuditStats()
    
  } catch (error) {
    console.error('审核失败:', error)
    ElMessage.error('审核提交失败: ' + (error.response?.data?.message || error.message))
  } finally {
    auditSubmitting.value = false
  }
}

// 批量审核
const batchAudit = async (result) => {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请选择要审核的项目')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要批量${result === 'approved' ? '通过' : '拒绝'}选中的 ${selectedItems.value.length} 项吗？`,
      '批量审核确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 分别处理专利和软著
    const patents = selectedItems.value.filter(item => item.item_type === 'patent')
    const copyrights = selectedItems.value.filter(item => item.item_type === 'copyright')
    
    const auditData = {
      status: result,
      audit_comment: result === 'approved' ? '批量审核通过' : '批量审核拒绝'
    }
    
    // 批量审核专利
    if (patents.length > 0) {
      const patentPromises = patents.map(patent => 
        piApi.auditPatent(patent.id, auditData)
      )
      await Promise.all(patentPromises)
    }
    
    // 批量审核软著
    if (copyrights.length > 0) {
      const copyrightPromises = copyrights.map(copyright => 
        piApi.auditCopyright(copyright.id, auditData)
      )
      await Promise.all(copyrightPromises)
    }
    
    ElMessage.success('批量审核成功')
    selectedItems.value = []
    loadPendingItems()
    loadAuditStats()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量审核失败:', error)
      ElMessage.error('批量审核失败')
    }
  }
}

// 加载待审核项目
const loadPendingItems = async () => {
  loading.value = true
  
  try {
    // 直接获取所有专利和软著数据，然后过滤出待审核的项目
    let allItems = []
    
    try {
      const promises = []
      
      // 获取专利数据
      if (!filters.itemType || filters.itemType === 'patent') {
        promises.push(
          piApi.getPatents({ page: 1, pageSize: 1000 })
            .then(res => {
              const data = res.data?.data || {}
              const patents = (data.patents || []).map(item => ({
                ...item,
                item_type: 'patent',
                title: item.title,
                applicant: item.first_patentee || item.first_inventor
              }))
              return patents
            })
            .catch(error => {
              console.error('专利API调用失败:', error)
              return []
            })
        )
      }
      
      // 获取软著数据
      if (!filters.itemType || filters.itemType === 'copyright') {
        promises.push(
          piApi.getCopyrights({ page: 1, pageSize: 1000 })
            .then(res => {
              const data = res.data?.data || {}
              const copyrights = (data.copyrights || []).map(item => ({
                ...item,
                item_type: 'copyright',
                title: item.software_name,
                applicant: item.copyright_owner || item.first_applicant
              }))
              return copyrights
            })
            .catch(error => {
              console.error('软著API调用失败:', error)
              return []
            })
        )
      }
      
      const results = await Promise.all(promises)
      allItems = results.flat()
    } catch (error) {
      console.error('API请求失败:', error)
      allItems = []
    }
    
    // 应用筛选条件
    let filteredItems = allItems.filter(item => {
      // 状态筛选
      if (item.status !== 'pending') return false
      
      // 类型筛选
      if (filters.itemType && item.item_type !== filters.itemType) return false
      
      // 专利子类型筛选
      if (filters.patentType && item.item_type === 'patent' && item.patent_type !== filters.patentType) return false
      
      // 优先级筛选
      if (filters.priority && item.priority !== filters.priority) return false
      
      // 关键词筛选
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase()
        const title = (item.title || '').toLowerCase()
        const applicant = (item.applicant || '').toLowerCase()
        const inventor = (item.first_inventor || '').toLowerCase()
        
        if (!title.includes(keyword) && !applicant.includes(keyword) && !inventor.includes(keyword)) {
          return false
        }
      }
      
      // 日期范围筛选
      if (filters.dateRange && filters.dateRange.length === 2) {
        const createdAt = new Date(item.created_at)
        const startDate = new Date(filters.dateRange[0])
        const endDate = new Date(filters.dateRange[1])
        if (createdAt < startDate || createdAt > endDate) return false
      }
      
      return true
    })
    
    // 分页处理
    const start = (pagination.current - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    
    pendingItems.value = filteredItems.slice(start, end)
    pagination.total = filteredItems.length
    
  } catch (error) {
    console.error('加载待审核项目失败:', error)
    // 使用模拟数据
    pendingItems.value = [
      {
        id: 1,
        item_type: 'patent',
        patent_type: 'invention',
        title: '一种基于AI的图像识别方法',
        applicant: '科技公司',
        application_number: 'CN202410001',
        application_date: '2024-01-15',
        status: 'pending',
        priority: 'high',
        user_name: '张三',
        created_at: '2024-01-10 10:30:00',
        inventors: [
          { name: '张三', id_number: '11010119900101****', nationality: '中国', address: '北京市' },
          { name: '李四', id_number: '11010119900102****', nationality: '中国', address: '北京市' }
        ]
      },
      {
        id: 2,
        item_type: 'copyright',
        title: '智能管理系统V1.0',
        applicant: '软件公司',
        registration_number: '2024SR001',
        creation_completion_date: '2024-01-10',
        status: 'pending',
        priority: 'normal',
        user_name: '李四',
        created_at: '2024-01-08 14:20:00',
        inventors: [
          { name: '李四', id_number: '11010119900103****', nationality: '中国', address: '上海市' }
        ]
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
    console.log('开始加载审核统计数据...')
    
    // 获取统计数据 - 不指定type参数，获取所有统计数据
    const statsResponse = await piApi.getStatistics({}).catch(err => {
      console.error('统计API失败:', err)
      return { data: {} }
    })
    
    console.log('统计数据:', statsResponse)
    console.log('统计数据结构:', statsResponse.data)
    
    // 解析统计数据 - 修正数据路径
    const pStats = statsResponse.data?.data?.patents || {}
    const cStats = statsResponse.data?.data?.copyrights || {}
    
    console.log('解析后的专利统计:', pStats)
    console.log('解析后的软著统计:', cStats)
    
    // 合并统计数据 - 修正字段名映射和数据路径
    const todayAudited = statsResponse.data?.data?.today_audited || {}
    const newStats = {
      pending: (parseInt(pStats.pending) || 0) + (parseInt(cStats.pending) || 0),
      todayAudited: (parseInt(todayAudited.patents) || 0) + (parseInt(todayAudited.copyrights) || 0),
      approved: (parseInt(pStats.approved) || 0) + (parseInt(cStats.approved) || 0),
      rejected: (parseInt(pStats.rejected) || 0) + (parseInt(cStats.rejected) || 0)
    }
    
    console.log('合并后的统计数据:', newStats)
    Object.assign(auditStats, newStats)
    
  } catch (error) {
    console.error('加载审核统计失败:', error)
    // 使用当前已加载的数据作为兜底
    const pending = pendingItems.value.length
    const fallbackStats = {
      pending: pending,
      todayAudited: 0,
      approved: 0,
      rejected: 0
    }
    console.log('使用兜底统计数据:', fallbackStats)
    Object.assign(auditStats, fallbackStats)
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadPendingItems()
  loadAuditStats()
})
</script>

<style scoped>
.ip-audit-container {
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

.items-table {
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.item-info {
  padding: 8px 0;
}

.item-title {
  font-weight: 500;
  color: var(--primary-color);
  cursor: pointer;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 350px;
}

.item-title:hover {
  text-decoration: underline;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.meta-tag {
  margin-right: 4px;
}

.applicant {
  font-weight: 500;
  color: var(--text-secondary);
}

.application-number,
.registration-number {
  background: var(--bg-light);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 11px;
}

.apply-date {
  color: var(--text-tertiary);
  font-size: 11px;
}

.auth-year {
  color: var(--success-color);
  font-size: 11px;
  background: var(--success-light);
  padding: 2px 6px;
  border-radius: 4px;
}

.inventors {
  font-size: 12px;
}

.inventor-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inventor {
  color: var(--text-secondary);
}

.more-inventors {
  color: var(--text-tertiary);
  font-size: 11px;
}

.no-inventor {
  color: var(--text-tertiary);
}

.first-inventor {
  font-size: 12px;
  color: var(--text-secondary);
  word-wrap: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
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

.item-details {
  margin-bottom: 24px;
}

.item-details h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.inventors-section {
  margin-bottom: 24px;
}

.inventors-section h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.others-section {
  margin-bottom: 24px;
}

.others-section h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.others-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  flex-wrap: wrap;
}

.audit-form h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.file-preview-container {
  width: 100%;
  min-height: 600px;
}

.file-preview-content {
  position: relative;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-light);
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

/* 响应式适配 */
@media (max-width: 768px) {
  .ip-audit-container {
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
  
  .item-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .file-actions {
    flex-direction: column;
    gap: 4px;
  }
}
</style>




