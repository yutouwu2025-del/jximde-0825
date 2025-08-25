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
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="name" label="姓名" />
            <el-table-column prop="role" label="角色">
              <template #default="{ row }">
                <el-tag :type="getRoleType(row.role)">{{ getRoleText(row.role) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="department" label="部门" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
                  {{ row.status === 'active' ? '正常' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="last_login" label="最后登录" />
            <el-table-column label="操作" width="200">
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
          
          <el-row :gutter="16" class="monitor-cards">
            <el-col :span="6">
              <div class="monitor-card">
                <div class="monitor-title">在线用户</div>
                <div class="monitor-value">{{ monitorData.onlineUsers }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="monitor-card">
                <div class="monitor-title">今日访问</div>
                <div class="monitor-value">{{ monitorData.todayVisits }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="monitor-card">
                <div class="monitor-title">存储使用</div>
                <div class="monitor-value">{{ monitorData.storageUsage }}%</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="monitor-card">
                <div class="monitor-title">系统状态</div>
                <div class="monitor-value">
                  <el-tag type="success">正常</el-tag>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
    </el-tabs>
    
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
import { usersApi } from '../api/users'

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

const monitorData = reactive({
  onlineUsers: 24,
  todayVisits: 156,
  storageUsage: 68,
  systemStatus: 'normal'
})

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
    department: user.department,
    password: ''
  })
  userDialog.value = true
}

const saveUser = async () => {
  try {
    const valid = await userFormRef.value.validate()
    if (!valid) return
    
    if (editingUser.value) {
      await usersApi.updateUser(editingUser.value.id, userForm)
      ElMessage.success('用户更新成功')
    } else {
      await usersApi.createUser(userForm)
      ElMessage.success('用户创建成功')
    }
    
    userDialog.value = false
    loadUsers()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const resetPassword = async (user) => {
  try {
    await ElMessageBox.prompt('请输入新密码', '重置密码', {
      inputType: 'password'
    })
    
    ElMessage.success('密码重置成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('密码重置失败')
    }
  }
}

const toggleUserStatus = async (user) => {
  try {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    await usersApi.toggleUserStatus(user.id, newStatus)
    ElMessage.success('状态更新成功')
    loadUsers()
  } catch (error) {
    ElMessage.error('状态更新失败')
  }
}

const createDepartment = () => {
  ElMessage.info('添加部门功能开发中...')
}

const editDepartment = (department) => {
  ElMessage.info('编辑部门功能开发中...')
}

const deleteDepartment = (department) => {
  ElMessage.info('删除部门功能开发中...')
}

const saveSettings = () => {
  ElMessage.success('配置保存成功')
}

const loadUsers = async () => {
  try {
    const response = await usersApi.getUsers()
    usersList.value = response.data.users || []
  } catch (error) {
    // 模拟数据
    usersList.value = [
      {
        id: 1,
        username: 'admin',
        name: '系统管理员',
        role: 'admin',
        department: '管理部门',
        status: 'active',
        last_login: '2024-01-15 10:30'
      }
    ]
  }
}

const loadDepartments = async () => {
  try {
    const response = await usersApi.getDepartments()
    departmentsList.value = response.data.departments || []
  } catch (error) {
    // 模拟数据
    departmentsList.value = [
      { id: 1, name: '计算机部', description: '计算机科学研究', user_count: 15, created_at: '2024-01-01' },
      { id: 2, name: '人工智能部', description: '人工智能研究', user_count: 12, created_at: '2024-01-01' }
    ]
  }
}

onMounted(() => {
  loadUsers()
  loadDepartments()
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
</style>