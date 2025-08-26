<template>
  <div class="notifications-container">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">通知公告</h1>
        <p class="page-description">发布和管理系统通知公告</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="createNotification">
          <el-icon><Plus /></el-icon>
          发布通知
        </el-button>
      </div>
    </div>
    
    <!-- 通知列表 -->
    <div class="notifications-list">
      <el-card
        v-for="notification in notificationsList"
        :key="notification.id"
        class="notification-card"
        shadow="hover"
      >
        <template #header>
          <div class="card-header">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-actions">
              <el-tag :type="notification.status === 'published' ? 'success' : 'info'">
                {{ notification.status === 'published' ? '已发布' : '草稿' }}
              </el-tag>
              <el-dropdown @command="(cmd) => handleAction(cmd, notification)">
                <el-button text>
                  操作<el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="publish" v-if="notification.status === 'draft'">
                      发布
                    </el-dropdown-item>
                    <el-dropdown-item command="unpublish" v-if="notification.status === 'published'">
                      撤回
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
        
        <div class="notification-content">
          <p>{{ notification.content }}</p>
        </div>
        
        <div class="notification-footer">
          <div class="notification-meta">
            <span>发布者：{{ notification.author_name || notification.author }}</span>
            <span>创建时间：{{ formatDateTime(notification.created_at) }}</span>
          </div>
          <div class="notification-stats">
            <span>阅读量：{{ notification.read_count || 0 }}</span>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 创建/编辑通知对话框 -->
    <el-dialog
      v-model="notificationDialog"
      :title="editingNotification ? '编辑通知' : '发布通知'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="notificationFormRef"
        :model="notificationForm"
        :rules="notificationRules"
        label-width="100px"
      >
        <el-form-item label="通知标题" prop="title">
          <el-input
            v-model="notificationForm.title"
            placeholder="请输入通知标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="通知内容" prop="content">
          <el-input
            v-model="notificationForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入通知内容"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="发布状态" prop="status">
          <el-radio-group v-model="notificationForm.status">
            <el-radio label="draft">保存为草稿</el-radio>
            <el-radio label="published">立即发布</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="notificationDialog = false">取消</el-button>
          <el-button type="primary" @click="submitNotification" :loading="submitting">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index'
import dayjs from 'dayjs'

const notificationDialog = ref(false)
const submitting = ref(false)
const editingNotification = ref(null)
const notificationsList = ref([])

const notificationFormRef = ref(null)

const notificationForm = reactive({
  title: '',
  content: '',
  status: 'published'
})

const notificationRules = {
  title: [
    { required: true, message: '请输入通知标题', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入通知内容', trigger: 'blur' }
  ]
}

const createNotification = () => {
  editingNotification.value = null
  Object.assign(notificationForm, {
    title: '',
    content: '',
    status: 'published'
  })
  notificationDialog.value = true
}

const handleAction = async (command, notification) => {
  switch (command) {
    case 'edit':
      editNotification(notification)
      break
    case 'publish':
      await publishNotification(notification)
      break
    case 'unpublish':
      await unpublishNotification(notification)
      break
    case 'delete':
      await deleteNotification(notification)
      break
  }
}

const editNotification = (notification) => {
  editingNotification.value = notification
  Object.assign(notificationForm, {
    title: notification.title,
    content: notification.content,
    status: notification.status
  })
  notificationDialog.value = true
}

const submitNotification = async () => {
  if (!notificationFormRef.value) return
  
  try {
    const valid = await notificationFormRef.value.validate()
    if (!valid) return
    
    submitting.value = true
    
    if (editingNotification.value) {
      await api.put(`/notifications/${editingNotification.value.id}`, notificationForm)
      ElMessage.success('通知更新成功')
    } else {
      await api.post('/notifications', notificationForm)
      ElMessage.success('通知发布成功')
    }
    
    notificationDialog.value = false
    loadNotifications()
  } catch (error) {
    console.error('通知操作失败:', error)
    ElMessage.error('操作失败: ' + (error.response?.data?.message || error.message))
  } finally {
    submitting.value = false
  }
}

const publishNotification = async (notification) => {
  try {
    await api.put(`/notifications/${notification.id}/publish`)
    ElMessage.success('通知发布成功')
    loadNotifications()
  } catch (error) {
    console.error('发布失败:', error)
    ElMessage.error('发布失败: ' + (error.response?.data?.message || error.message))
  }
}

const unpublishNotification = async (notification) => {
  try {
    await api.put(`/notifications/${notification.id}/unpublish`)
    ElMessage.success('通知已撤回')
    loadNotifications()
  } catch (error) {
    console.error('撤回失败:', error)
    ElMessage.error('撤回失败: ' + (error.response?.data?.message || error.message))
  }
}

const deleteNotification = async (notification) => {
  try {
    await ElMessageBox.confirm('确定要删除这条通知吗？', '确认删除', {
      type: 'warning'
    })
    
    await api.delete(`/notifications/${notification.id}`)
    ElMessage.success('删除成功')
    loadNotifications()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

const formatDateTime = (datetime) => {
  return dayjs(datetime).format('YYYY-MM-DD HH:mm')
}

const loadNotifications = async () => {
  try {
    const response = await api.get('/notifications')
    // 处理不同的响应格式
    if (response.data.data?.notifications) {
      notificationsList.value = response.data.data.notifications
    } else if (Array.isArray(response.data.data)) {
      notificationsList.value = response.data.data
    } else if (Array.isArray(response.data)) {
      notificationsList.value = response.data
    } else {
      notificationsList.value = []
    }
  } catch (error) {
    console.error('加载通知失败:', error)
    // 使用模拟数据
    notificationsList.value = [
      {
        id: 1,
        title: '系统维护通知',
        content: '系统将于本周日凌晨2:00-4:00进行维护升级，届时将无法访问，请提前做好相关准备工作。',
        status: 'published',
        author_name: '系统管理员',
        created_at: '2024-01-15 10:00:00',
        read_count: 125
      },
      {
        id: 2,
        title: '论文提交截止日期提醒',
        content: '本月论文提交截止日期为月底，请各位研究人员及时提交论文材料。',
        status: 'published',
        author_name: '论文管理员',
        created_at: '2024-01-20 09:30:00',
        read_count: 89
      }
    ]
  }
}

onMounted(() => {
  loadNotifications()
})
</script>

<style scoped>
.notifications-container {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
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

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notification-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.notification-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-content {
  margin: 16px 0;
  line-height: 1.6;
  color: var(--text-secondary);
}

.notification-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  font-size: 12px;
  color: var(--text-tertiary);
}

.notification-meta {
  display: flex;
  gap: 16px;
}

.notification-stats {
  display: flex;
  gap: 16px;
}
</style>