<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapsed ? '64px' : '200px'" class="layout-aside">
      <div class="sidebar-header">
        <div v-show="!isCollapsed" class="sidebar-logo">📊</div>
        <h3 v-show="!isCollapsed" class="sidebar-title">论文管理平台</h3>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :unique-opened="true"
        class="sidebar-menu"
        background-color="#001529"
        text-color="rgba(255, 255, 255, 0.65)"
        active-text-color="#fff"
        @select="handleMenuSelect"
      >
        <template v-for="item in menuItems" :key="item.name">
          <el-menu-item
            :index="item.path"
            :class="{ 'is-active': $route.path === item.path }"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    
    <!-- 主要内容区域 -->
    <div class="layout-main">
      <!-- 顶部导航 -->
      <el-header class="layout-header" height="64px">
        <div class="header-left">
          <!-- 折叠按钮 -->
          <el-button
            text
            size="large"
            @click="toggleCollapse"
          >
            <el-icon><Expand v-if="isCollapsed" /><Fold v-else /></el-icon>
          </el-button>
          
          <!-- 面包屑导航 -->
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentPageTitle">{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <!-- 通知铃铛 -->
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
            <el-button text size="large" @click="showNotifications">
              <el-icon><Bell /></el-icon>
            </el-button>
          </el-badge>
          
          <!-- 用户信息下拉菜单 -->
          <el-dropdown @command="handleUserCommand">
            <div class="user-info">
              <el-avatar :size="36" class="user-avatar">
                {{ userStore.user?.name?.charAt(0) || 'U' }}
              </el-avatar>
              <span v-show="!isCollapsed" class="user-name">{{ userStore.user?.name || '用户' }}</span>
              <el-icon class="user-dropdown-icon"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人设置
                </el-dropdown-item>
                <el-dropdown-item command="changePassword">
                  <el-icon><Lock /></el-icon>修改密码
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 内容区域 -->
      <div class="layout-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
    
    <!-- 通知抽屉 -->
    <el-drawer
      v-model="notificationDrawer"
      title="系统通知"
      direction="rtl"
      size="400px"
    >
      <div class="notification-list">
        <el-empty v-if="notifications.length === 0" description="暂无通知" />
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="{ 'unread': !notification.read }"
        >
          <div class="notification-header">
            <h4>{{ notification.title }}</h4>
            <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
          </div>
          <p class="notification-content">{{ notification.content }}</p>
          <el-button 
            v-if="!notification.read" 
            text 
            size="small"
            @click="markAsRead(notification.id)"
          >
            标记为已读
          </el-button>
        </div>
      </div>
    </el-drawer>
    
    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="changePasswordDialog"
      title="修改密码"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            show-password
            placeholder="请输入原密码"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
            placeholder="请输入新密码"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="changePasswordDialog = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword" :loading="changePasswordLoading">
          确认修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { authApi } from '../api/auth'
import { notificationsApi } from '../api/notifications'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 响应式数据
const isCollapsed = ref(false)
const notificationDrawer = ref(false)
const changePasswordDialog = ref(false)
const changePasswordLoading = ref(false)
const unreadCount = ref(0)
const notifications = ref([])

// 表单引用
const passwordFormRef = ref(null)

// 修改密码表单
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码验证规则
const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入原密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '新密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 计算属性
const menuItems = computed(() => userStore.getMenuItems())
const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => route.meta.title)

// 切换侧边栏折叠状态
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 处理菜单选择
const handleMenuSelect = (index) => {
  if (route.path !== index) {
    router.push(index)
  }
}

// 处理用户下拉菜单命令
const handleUserCommand = async (command) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人设置功能开发中...')
      break
    case 'changePassword':
      changePasswordDialog.value = true
      break
    case 'logout':
      await handleLogout()
      break
  }
}

// 处理退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await userStore.logout()
    ElMessage.success('已成功退出登录')
    router.push('/login')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('退出登录失败')
    }
  }
}

// 显示通知
const showNotifications = async () => {
  notificationDrawer.value = true
  await loadNotifications()
}

// 加载通知列表
const loadNotifications = async () => {
  try {
    const response = await notificationsApi.getUserNotifications({ limit: 50 })
    notifications.value = response.data.notifications || []
  } catch (error) {
    console.error('加载通知失败:', error)
  }
}

// 标记通知为已读
const markAsRead = async (id) => {
  try {
    await notificationsApi.markAsRead(id)
    
    // 更新本地数据
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    
    ElMessage.success('已标记为已读')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 处理修改密码
const handleChangePassword = async () => {
  if (!passwordFormRef.value) return
  
  try {
    const valid = await passwordFormRef.value.validate()
    if (!valid) return
    
    changePasswordLoading.value = true
    
    await authApi.changePassword({
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })
    
    ElMessage.success('密码修改成功')
    changePasswordDialog.value = false
    
    // 重置表单
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    passwordFormRef.value.resetFields()
    
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '密码修改失败')
  } finally {
    changePasswordLoading.value = false
  }
}

// 格式化时间
const formatTime = (time) => {
  return dayjs(time).format('MM-DD HH:mm')
}

// 加载未读通知数量
const loadUnreadCount = async () => {
  try {
    const response = await notificationsApi.getUnreadCount()
    unreadCount.value = response.data.count || 0
  } catch (error) {
    console.error('加载未读通知数量失败:', error)
  }
}

// 监听路由变化，自动收起移动端侧边栏
watch(() => route.path, () => {
  if (window.innerWidth <= 768) {
    isCollapsed.value = true
  }
})

// 组件挂载时初始化
onMounted(async () => {
  await loadUnreadCount()
  
  // 定期检查未读通知
  setInterval(loadUnreadCount, 30000) // 30秒检查一次
  
  // 响应式处理
  const handleResize = () => {
    if (window.innerWidth <= 768) {
      isCollapsed.value = true
    }
  }
  
  window.addEventListener('resize', handleResize)
  handleResize()
  
  // 组件卸载时清理
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
})
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  background-color: var(--bg-light);
}

.layout-aside {
  background-color: var(--bg-dark);
  transition: width 0.3s ease;
  overflow: hidden;
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-logo {
  width: 32px;
  height: 32px;
  margin-right: 12px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-title {
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
}

.sidebar-menu {
  border: none;
  height: calc(100vh - 64px);
}

.sidebar-menu :deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background-color: var(--primary-color) !important;
}

.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-header {
  background-color: var(--bg-white);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: var(--shadow-card);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-badge {
  margin-right: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

.user-info:hover {
  background-color: var(--bg-light);
}

.user-avatar {
  background-color: var(--primary-color);
  color: white;
  font-weight: 600;
}

.user-name {
  font-size: 14px;
  color: var(--text-primary);
}

.user-dropdown-icon {
  color: var(--text-tertiary);
  font-size: 12px;
}

.layout-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-light);
}

.notification-list {
  padding: 16px 0;
}

.notification-item {
  padding: 16px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.notification-item:hover {
  background-color: var(--bg-light);
}

.notification-item.unread {
  background-color: #f0f9ff;
  border-left: 4px solid var(--primary-color);
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.notification-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.notification-time {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.notification-content {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* 页面切换动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 响应式布局 */
@media (max-width: 768px) {
  .layout-header {
    padding: 0 16px;
  }
  
  .header-left {
    gap: 8px;
  }
  
  .header-right {
    gap: 8px;
  }
  
  .user-name {
    display: none;
  }
}
</style>