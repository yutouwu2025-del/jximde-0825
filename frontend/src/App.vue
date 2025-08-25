<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from './stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

// 应用初始化
onMounted(async () => {
  // 检查本地存储的token
  const token = localStorage.getItem('token')
  if (token) {
    try {
      // 验证token有效性并获取用户信息
      await userStore.getCurrentUser()
      // 如果当前在登录页，跳转到工作台
      if (router.currentRoute.value.path === '/login') {
        router.push('/dashboard')
      }
    } catch (error) {
      // token无效，清除并跳转到登录页
      localStorage.removeItem('token')
      router.push('/login')
    }
  } else if (router.currentRoute.value.path !== '/login') {
    // 没有token且不在登录页，跳转到登录页
    router.push('/login')
  }
})
</script>

<style>
#app {
  height: 100vh;
  width: 100vw;
}
</style>