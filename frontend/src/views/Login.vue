<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="bg-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>
    </div>
    
    <!-- 登录表单 -->
    <div class="login-card">
      <div class="login-header">
        <div class="logo">📊</div>
        <h1 class="system-title">科研成果数据管理平台</h1>
        <p class="system-subtitle">Research Paper Management System</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        size="large"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <div class="login-options">
            <el-checkbox v-model="loginForm.remember">记住密码</el-checkbox>
            <el-link type="primary" :underline="false">忘记密码？</el-link>
          </div>
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <!-- 演示账号提示 -->
      <div class="demo-accounts">
        <el-divider>演示账号</el-divider>
        <div class="account-list">
          <el-tag 
            v-for="account in demoAccounts" 
            :key="account.username"
            class="account-tag"
            @click="selectAccount(account)"
          >
            {{ account.username }} - {{ account.role }}
          </el-tag>
        </div>
      </div>
      
      <div class="login-footer">
        <p>&copy; 2025 科研论文数据管理平台. </p>
        <p>人事教育处、山地科学数据中心联合开发.</p>
        <p>All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// 表单引用
const loginFormRef = ref(null)
const loading = ref(false)

// 表单数据
const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 演示账号
const demoAccounts = [
  { username: 'researcher1', password: '123456', role: '科研人员' },
  { username: 'manager1', password: '123456', role: '论文管理员' },
  { username: 'secretary1', password: '123456', role: '课题组秘书' },
  { username: 'admin', password: '123456', role: '系统管理员' }
]

// 选择演示账号
const selectAccount = (account) => {
  loginForm.username = account.username
  loginForm.password = account.password
}

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    const result = await userStore.login(loginForm)
    
    if (result.success) {
      ElMessage.success('登录成功')
      
      // 如果选择记住密码，保存到本地存储
      if (loginForm.remember) {
        localStorage.setItem('savedUsername', loginForm.username)
        localStorage.setItem('savedPassword', loginForm.password)
      } else {
        localStorage.removeItem('savedUsername')
        localStorage.removeItem('savedPassword')
      }
      
      // 跳转到工作台
      router.push('/dashboard')
    } else {
      ElMessage.error(result.message || '登录失败')
    }
  } catch (error) {
    ElMessage.error('登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 页面初始化时恢复保存的账号信息
const initSavedAccount = () => {
  const savedUsername = localStorage.getItem('savedUsername')
  const savedPassword = localStorage.getItem('savedPassword')
  
  if (savedUsername && savedPassword) {
    loginForm.username = savedUsername
    loginForm.password = savedPassword
    loginForm.remember = true
  }
}

// 组件挂载时初始化
onMounted(() => {
  initSavedAccount()
})
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #001529 0%, #1890ff 100%);
  position: relative;
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.bg-shapes {
  position: relative;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.shape-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
  animation: float 6s ease-in-out infinite;
}

.shape-2 {
  width: 300px;
  height: 300px;
  top: 60%;
  right: 10%;
  animation: float 8s ease-in-out infinite reverse;
}

.shape-3 {
  width: 150px;
  height: 150px;
  top: 30%;
  right: 30%;
  animation: float 7s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

.login-card {
  width: 440px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 48px 40px;
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  font-size: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.system-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  background: linear-gradient(135deg, #1890ff, #001529);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.system-subtitle {
  font-size: 14px;
  color: var(--text-tertiary);
  letter-spacing: 1px;
}

.login-form {
  margin-bottom: 24px;
}

.login-form :deep(.el-input__inner) {
  height: 48px;
  line-height: 48px;
  border-radius: 8px;
}

.login-form :deep(.el-input__prefix) {
  left: 16px;
}

.login-form :deep(.el-input__inner) {
  padding-left: 48px;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.login-button {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  border: none;
  transition: all 0.3s ease;
}

.login-button:hover {
  background: linear-gradient(135deg, #40a9ff, #1890ff);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(24, 144, 255, 0.3);
}

.demo-accounts {
  margin-bottom: 24px;
}

.demo-accounts :deep(.el-divider__text) {
  color: var(--text-tertiary);
  font-size: 12px;
}

.account-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.account-tag {
  cursor: pointer;
  transition: all 0.3s ease;
}

.account-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.login-footer {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
}

@media (max-width: 768px) {
  .login-card {
    width: 90%;
    padding: 32px 24px;
    margin: 20px;
  }
  
  .system-title {
    font-size: 24px;
  }
  
  .account-list {
    flex-direction: column;
    align-items: center;
  }
}
</style>