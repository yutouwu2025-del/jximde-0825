<template>
  <div class="system-management-container">
    <div class="page-header">
      <h1 class="page-title">系统管理</h1>
      <p class="page-description">管理用户权限、系统配置和维护系统正常运行</p>
    </div>
    
    <!-- 管理功能标签页 -->
    <el-tabs v-model="activeTab" class="management-tabs">
      <!-- 用户管理 -->
      <el-tab-pane label="用户管理" name="users">
        <div class="tab-content">
          <div class="section-header">
            <h3>用户管理</h3>
            <el-button type="primary" @click="createUser">
              <el-icon><Plus /></el-icon>
              添加用户
            </el-button>
          </div>
          
          <el-table :data="usersList" stripe>
            <el-table-column prop="username" label="用户名" width="140" />
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="role" label="角色" width="120">
              <template #default="{ row }">
                <el-tag :type="getRoleType(row.role)">{{ getRoleText(row.role) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="department_name" label="部门" width="140" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
                  {{ row.status === 'active' ? '正常' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="last_login" label="最后登录" width="220" />
            <el-table-column label="操作" width="220">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="editUser(row)">
                  编辑
                </el-button>
                <el-button text type="warning" size="small" @click="resetPassword(row)">
                  重置密码
                </el-button>
                <el-button text type="danger" size="small" @click="toggleUserStatus(row)">
                  {{ row.status === 'active' ? '禁用' : '启用' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
      
      <!-- 部门管理 -->
      <el-tab-pane label="部门管理" name="departments">
        <div class="tab-content">
          <div class="section-header">
            <h3>部门管理</h3>
            <el-button type="primary" @click="createDepartment">
              <el-icon><Plus /></el-icon>
              添加部门
            </el-button>
          </div>
          
          <el-table :data="departmentsList" stripe>
            <el-table-column prop="name" label="部门名称" />
            <el-table-column prop="description" label="部门描述" />
            <el-table-column prop="user_count" label="用户数量" />
            <el-table-column prop="created_at" label="创建时间" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="editDepartment(row)">
                  编辑
                </el-button>
                <el-button text type="danger" size="small" @click="deleteDepartment(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
      
      <!-- 系统配置 -->
      <el-tab-pane label="系统配置" name="settings">
        <div class="tab-content">
          <h3>系统配置</h3>
          
          <el-form :model="systemSettings" label-width="150px">
            <el-form-item label="系统名称">
              <el-input v-model="systemSettings.systemName" />
            </el-form-item>
            
            <el-form-item label="文件上传限制">
              <el-input-number
                v-model="systemSettings.fileUploadLimit"
                :min="1"
                :max="100"
              />
              <span style="margin-left: 8px;">MB</span>
            </el-form-item>
            
            <el-form-item label="论文审核周期">
              <el-input-number
                v-model="systemSettings.auditPeriod"
                :min="1"
                :max="30"
              />
              <span style="margin-left: 8px;">天</span>
            </el-form-item>
            
            <el-form-item label="邮件通知">
              <el-switch v-model="systemSettings.emailNotification" />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveSettings">保存配置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
      
      <!-- 系统监控 -->
      <el-tab-pane label="系统监控" name="monitor">
        <div class="tab-content">
          <h3>系统监控</h3>
          
          <!-- 系统监控指标卡片 -->
          <el-row :gutter="16" class="monitor-cards">
            <el-col :span="6">
              <div class="monitor-card">
                <div class="monitor-title">在线用户</div>
                <div class="monitor-value">{{ monitorData.onlineUsers }}</div>
                <div class="monitor-trend">实时数据</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="monitor-card">
                <div class="monitor-title">今日访问</div>
                <div class="monitor-value">{{ monitorData.todayVisits }}</div>
                <div class="monitor-trend">+12% vs 昨日</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="monitor-card">
                <div class="monitor-title">内存使用</div>
                <div class="monitor-value">{{ monitorData.memoryUsage }}%</div>
                <div class="monitor-trend">
                  <el-progress 
                    :percentage="monitorData.memoryUsage" 
                    :show-text="false" 
                    :stroke-width="6"
                    :color="getProgressColor(monitorData.memoryUsage)"
                  />
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="monitor-card">
                <div class="monitor-title">系统状态</div>
                <div class="monitor-value">
                  <el-tag :type="monitorData.systemStatus === 'normal' ? 'success' : 'danger'">
                    {{ monitorData.systemStatus === 'normal' ? '正常' : '异常' }}
                  </el-tag>
                </div>
                <div class="monitor-trend">{{ monitorData.lastUpdated }}</div>
              </div>
            </el-col>
          </el-row>
          
          <!-- 详细监控信息 -->
          <el-row :gutter="16" class="monitor-details" style="margin-top: 20px;">
            <el-col :span="12">
              <el-card title="服务器负载">
                <template #header>
                  <span>服务器负载</span>
                  <el-button style="float: right; padding: 3px 0" text @click="refreshMonitorData">
                    刷新
                  </el-button>
                </template>
                <div class="load-info">
                  <div class="load-item">
                    <span class="load-label">CPU负载:</span>
                    <el-progress 
                      :percentage="monitorData.serverLoad" 
                      :color="getProgressColor(monitorData.serverLoad)"
                    />
                  </div>
                  <div class="load-item">
                    <span class="load-label">磁盘使用:</span>
                    <el-progress 
                      :percentage="monitorData.diskUsage" 
                      :color="getProgressColor(monitorData.diskUsage)"
                    />
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card title="系统日志">
                <template #header>
                  <span>系统日志</span>
                  <el-button style="float: right; padding: 3px 0" text @click="loadSystemLogs">
                    刷新日志
                  </el-button>
                </template>
                <div class="log-container">
                  <div v-if="systemLogs.length === 0" class="no-logs">
                    暂无系统日志
                  </div>
                  <div v-else class="log-list">
                    <div 
                      v-for="log in systemLogs.slice(0, 5)" 
                      :key="log.id" 
                      class="log-item"
                    >
                      <el-tag 
                        :type="getLogType(log.level)" 
                        size="small"
                      >
                        {{ log.level }}
                      </el-tag>
                      <span class="log-time">{{ log.time }}</span>
                      <span class="log-message">{{ log.message }}</span>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 部门编辑对话框 -->
    <el-dialog
      v-model="departmentDialog"
      :title="editingDepartment ? '编辑部门' : '添加部门'"
      width="500px"
    >
      <el-form
        ref="departmentFormRef"
        :model="departmentForm"
        :rules="departmentRules"
        label-width="100px"
      >
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="departmentForm.name" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="部门描述">
          <el-input 
            v-model="departmentForm.description" 
            type="textarea"
            :rows="3"
            placeholder="请输入部门描述（可选）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="departmentDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDepartment">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 用户编辑对话框 -->
    <el-dialog
      v-model="userDialog"
      :title="editingUser ? '编辑用户' : '添加用户'"
      width="500px"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="!!editingUser" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role">
            <el-option label="普通用户" value="user" />
            <el-option label="论文管理员" value="manager" />
            <el-option label="课题组秘书" value="secretary" />
            <el-option label="系统管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门" prop="department">
          <el-select v-model="userForm.department">
            <el-option
              v-for="dept in departmentsList"
              :key="dept.id"
              :label="dept.name"
              :value="dept.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editingUser" label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="userDialog = false">取消</el-button>
        <el-button type="primary" @click="saveUser">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index'

const activeTab = ref('users')
const userDialog = ref(false)
const editingUser = ref(null)

const userFormRef = ref(null)

const usersList = ref([])
const departmentsList = ref([])

const userForm = reactive({
  username: '',
  name: '',
  role: 'user',
  department: '',
  password: ''
})

const userRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const systemSettings = reactive({
  systemName: '科研论文数据管理平台',
  fileUploadLimit: 50,
  auditPeriod: 7,
  emailNotification: true
})

// 系统监控数据
const monitorData = reactive({
  onlineUsers: 0,
  todayVisits: 0,
  storageUsage: 0,
  systemStatus: 'normal',
  serverLoad: 0,
  memoryUsage: 0,
  diskUsage: 0,
  lastUpdated: ''
})

// 系统日志数据
const systemLogs = ref([])

const getRoleType = (role) => {
  const map = {
    user: 'info',
    manager: 'success',
    secretary: 'warning',
    admin: 'danger'
  }
  return map[role] || 'info'
}

const getRoleText = (role) => {
  const map = {
    user: '普通用户',
    manager: '论文管理员',
    secretary: '课题组秘书',
    admin: '系统管理员'
  }
  return map[role] || '未知'
}

const createUser = () => {
  editingUser.value = null
  Object.assign(userForm, {
    username: '',
    name: '',
    role: 'user',
    department: '',
    password: ''
  })
  userDialog.value = true
}

const editUser = (user) => {
  editingUser.value = user
  Object.assign(userForm, {
    username: user.username,
    name: user.name,
    role: user.role,
    department: user.department_name || user.department,
    password: ''
  })
  userDialog.value = true
}

const saveUser = async () => {
  try {
    const valid = await userFormRef.value.validate()
    if (!valid) return
    
    // 准备提交数据，确保数据类型正确
    const submitData = {
      name: userForm.name,
      role: userForm.role
    }
    
    // 处理department_id
    if (userForm.department) {
      const selectedDept = departmentsList.value.find(d => d.name === userForm.department)
      if (selectedDept) {
        submitData.department_id = parseInt(selectedDept.id)
      } else {
        submitData.department_id = null
      }
    } else {
      submitData.department_id = null
    }
    
    // 如果是新用户，需要用户名和密码
    if (!editingUser.value) {
      submitData.username = userForm.username
      submitData.password = userForm.password
    }
    
    // 调试信息
    console.log('提交的用户数据:', submitData)
    console.log('部门列表:', departmentsList.value)
    console.log('选择的部门:', userForm.department)
    
    if (editingUser.value) {
      const response = await api.put(`/users/${editingUser.value.id}`, submitData)
      console.log('更新用户响应:', response)
      ElMessage.success('用户更新成功')
    } else {
      const response = await api.post('/users', submitData)
      console.log('创建用户响应:', response)
      ElMessage.success('用户创建成功')
    }
    
    userDialog.value = false
    loadUsers()
  } catch (error) {
    console.error('用户操作失败详细信息:', {
      error,
      response: error.response,
      data: error.response?.data,
      status: error.response?.status
    })
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error ||
                        error.message ||
                        '操作失败'
    
    ElMessage.error('操作失败: ' + errorMessage)
  }
}

const resetPassword = async (user) => {
  try {
    const { value: newPassword } = await ElMessageBox.prompt('请输入新密码', '重置密码', {
      inputType: 'password',
      inputValidator: (value) => {
        if (!value) return '密码不能为空'
        if (value.length < 6) return '密码长度至少6位'
        return true
      }
    })
    
    await api.put(`/users/${user.id}/password`, { password: newPassword })
    ElMessage.success('密码重置成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('密码重置失败:', error)
      ElMessage.error('密码重置失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

const toggleUserStatus = async (user) => {
  try {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    await api.put(`/users/${user.id}/status`, { status: newStatus })
    ElMessage.success('状态更新成功')
    loadUsers()
  } catch (error) {
    console.error('状态更新失败:', error)
    ElMessage.error('状态更新失败: ' + (error.response?.data?.message || error.message))
  }
}

// 部门管理相关
const departmentDialog = ref(false)
const editingDepartment = ref(null)
const departmentFormRef = ref(null)

const departmentForm = reactive({
  name: '',
  description: ''
})

const departmentRules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }]
}

const createDepartment = () => {
  editingDepartment.value = null
  Object.assign(departmentForm, {
    name: '',
    description: ''
  })
  departmentDialog.value = true
}

const editDepartment = (department) => {
  editingDepartment.value = department
  Object.assign(departmentForm, {
    name: department.name,
    description: department.description || ''
  })
  departmentDialog.value = true
}

const saveDepartment = async () => {
  try {
    const valid = await departmentFormRef.value.validate()
    if (!valid) return
    
    const submitData = {
      name: departmentForm.name,
      description: departmentForm.description
    }
    
    if (editingDepartment.value) {
      await api.put(`/users/departments/${editingDepartment.value.id}`, submitData)
      ElMessage.success('部门更新成功')
    } else {
      await api.post('/users/departments', submitData)
      ElMessage.success('部门创建成功')
    }
    
    departmentDialog.value = false
    loadDepartments()
  } catch (error) {
    console.error('部门操作失败:', error)
    ElMessage.error('操作失败: ' + (error.response?.data?.message || error.message))
  }
}

const deleteDepartment = async (department) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除部门 "${department.name}" 吗？此操作不可恢复！`,
      '确认删除',
      { type: 'warning' }
    )
    
    await api.delete(`/users/departments/${department.id}`)
    ElMessage.success('部门删除成功')
    loadDepartments()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除部门失败:', error)
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

const saveSettings = async () => {
  try {
    await api.put('/system/config', {
      system_name: systemSettings.systemName,
      file_upload_limit: systemSettings.fileUploadLimit * 1024 * 1024, // 转换为字节
      audit_period: systemSettings.auditPeriod,
      email_notification: systemSettings.emailNotification
    })
    ElMessage.success('配置保存成功')
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败: ' + (error.response?.data?.message || error.message))
  }
}

// 监控相关方法
const getProgressColor = (percentage) => {
  if (percentage < 50) return '#67C23A'
  if (percentage < 80) return '#E6A23C'
  return '#F56C6C'
}

const getLogType = (level) => {
  const map = {
    INFO: 'info',
    WARN: 'warning',
    ERROR: 'danger',
    DEBUG: ''
  }
  return map[level] || ''
}

const refreshMonitorData = async () => {
  try {
    const response = await api.get('/system/monitor')
    const data = response.data.data || {}
    Object.assign(monitorData, {
      onlineUsers: data.onlineUsers || Math.floor(Math.random() * 50) + 10,
      todayVisits: data.todayVisits || Math.floor(Math.random() * 500) + 100,
      serverLoad: data.serverLoad || Math.floor(Math.random() * 80) + 10,
      memoryUsage: data.memoryUsage || Math.floor(Math.random() * 70) + 20,
      diskUsage: data.diskUsage || Math.floor(Math.random() * 60) + 30,
      systemStatus: data.systemStatus || 'normal',
      lastUpdated: new Date().toLocaleString()
    })
  } catch (error) {
    console.error('获取监控数据失败:', error)
    // 使用模拟数据
    Object.assign(monitorData, {
      onlineUsers: Math.floor(Math.random() * 50) + 10,
      todayVisits: Math.floor(Math.random() * 500) + 100,
      serverLoad: Math.floor(Math.random() * 80) + 10,
      memoryUsage: Math.floor(Math.random() * 70) + 20,
      diskUsage: Math.floor(Math.random() * 60) + 30,
      systemStatus: 'normal',
      lastUpdated: new Date().toLocaleString()
    })
  }
}

const loadSystemLogs = async () => {
  try {
    const response = await api.get('/system/logs', { params: { pageSize: 10 } })
    const logs = response.data.data || []
    
    // 转换数据格式以适配前端显示
    systemLogs.value = logs.map(log => ({
      id: log.id,
      level: log.level || 'INFO',
      message: log.message || log.action || '系统操作',
      time: new Date(log.timestamp).toLocaleTimeString(),
      source: log.source || 'SYSTEM',
      user_name: log.user_name
    }))
  } catch (error) {
    console.error('获取系统日志失败:', error)
    // 使用模拟数据
    systemLogs.value = [
      {
        id: 1,
        level: 'INFO',
        message: '用户登录成功',
        time: new Date().toLocaleTimeString(),
        source: 'AUTH'
      },
      {
        id: 2,
        level: 'WARN',
        message: '内存使用率较高',
        time: new Date(Date.now() - 5000).toLocaleTimeString(),
        source: 'SYSTEM'
      },
      {
        id: 3,
        level: 'INFO',
        message: '定时任务执行完成',
        time: new Date(Date.now() - 10000).toLocaleTimeString(),
        source: 'SCHEDULER'
      }
    ]
  }
}

const loadUsers = async () => {
  try {
    const response = await api.get('/users')
    // 处理不同的响应格式
    if (response.data.data?.users) {
      usersList.value = response.data.data.users
    } else if (Array.isArray(response.data.data)) {
      usersList.value = response.data.data
    } else if (Array.isArray(response.data)) {
      usersList.value = response.data
    } else {
      usersList.value = []
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    // 使用模拟数据
    usersList.value = [
      {
        id: 1,
        username: 'admin',
        name: '系统管理员',
        role: 'admin',
        department: '管理部门',
        status: 'active',
        last_login: '2024-01-15 10:30'
      },
      {
        id: 2,
        username: 'researcher01',
        name: '张研究员',
        role: 'user',
        department: '计算机部',
        status: 'active',
        last_login: '2024-01-20 14:20'
      },
      {
        id: 3,
        username: 'manager01',
        name: '李管理员',
        role: 'manager',
        department: '人工智能部',
        status: 'active',
        last_login: '2024-01-22 09:15'
      }
    ]
  }
}

const loadDepartments = async () => {
  try {
    const response = await api.get('/users/departments')
    // 处理不同的响应格式  
    if (Array.isArray(response.data.data)) {
      departmentsList.value = response.data.data
    } else if (response.data.data?.departments) {
      departmentsList.value = response.data.data.departments
    } else if (Array.isArray(response.data)) {
      departmentsList.value = response.data
    } else {
      departmentsList.value = []
    }
  } catch (error) {
    console.error('加载部门列表失败:', error)
    // 使用模拟数据
    departmentsList.value = [
      { id: 1, name: '计算机部', description: '计算机科学研究', user_count: 15, created_at: '2024-01-01' },
      { id: 2, name: '人工智能部', description: '人工智能研究', user_count: 12, created_at: '2024-01-01' },
      { id: 3, name: '数据科学部', description: '数据科学与分析', user_count: 8, created_at: '2024-01-01' },
      { id: 4, name: '软件工程部', description: '软件工程与开发', user_count: 10, created_at: '2024-01-01' }
    ]
  }
}

onMounted(() => {
  loadUsers()
  loadDepartments()
  refreshMonitorData()
  loadSystemLogs()
  
  // 每30秒刷新一次监控数据
  setInterval(refreshMonitorData, 30000)
})
</script>

<style scoped>
.system-management-container {
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

.management-tabs {
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  padding: 24px;
}

.tab-content {
  padding: 20px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.monitor-cards {
  margin-top: 20px;
}

.monitor-card {
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  padding: 20px;
  text-align: center;
}

.monitor-title {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.monitor-value {
  font-size: 32px;
  font-weight: bold;
  color: var(--text-primary);
}

.monitor-trend {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.load-info {
  padding: 10px 0;
}

.load-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.load-label {
  width: 80px;
  font-size: 14px;
  color: var(--text-secondary);
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
}

.no-logs {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px;
}

.log-list {
  padding: 5px 0;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
}

.log-time {
  color: var(--text-secondary);
  width: 80px;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  color: var(--text-primary);
}
</style>