import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

// 路由组件懒加载
const Login = () => import('../views/Login.vue')
const Layout = () => import('../views/Layout.vue')
const Dashboard = () => import('../views/Dashboard.vue')
const SubmitPaper = () => import('../views/SubmitPaper.vue')
const MyPapers = () => import('../views/MyPapers.vue')
const PaperAudit = () => import('../views/PaperAudit.vue')
const PaperDatabase = () => import('../views/PaperDatabase.vue')
const Statistics = () => import('../views/Statistics.vue')
const ImportExport = () => import('../views/ImportExport.vue')
const Notifications = () => import('../views/Notifications.vue')
const SystemManagement = () => import('../views/SystemManagement.vue')

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '用户登录',
      requiresAuth: false
    }
  },
  {
    path: '/',
    component: Layout,
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: {
          title: '工作台',
          icon: 'House'
        }
      },
      {
        path: 'submit-paper',
        name: 'SubmitPaper',
        component: SubmitPaper,
        meta: {
          title: '论文提交',
          icon: 'EditPen',
          roles: ['user', 'manager', 'admin']
        }
      },
      {
        path: 'my-papers',
        name: 'MyPapers',
        component: MyPapers,
        meta: {
          title: '我的论文',
          icon: 'Document',
          roles: ['user', 'manager', 'admin']
        }
      },
      {
        path: 'paper-audit',
        name: 'PaperAudit',
        component: PaperAudit,
        meta: {
          title: '论文审核',
          icon: 'Check',
          roles: ['manager', 'admin']
        }
      },
      {
        path: 'paper-database',
        name: 'PaperDatabase',
        component: PaperDatabase,
        meta: {
          title: '论文数据库',
          icon: 'FolderOpened',
          roles: ['manager', 'admin']
        }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: Statistics,
        meta: {
          title: '数据统计',
          icon: 'PieChart',
          roles: ['user', 'manager', 'secretary', 'admin']
        }
      },
      {
        path: 'import-export',
        name: 'ImportExport',
        component: ImportExport,
        meta: {
          title: '数据导入导出',
          icon: 'Upload',
          roles: ['user', 'manager', 'secretary', 'admin']
        }
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: Notifications,
        meta: {
          title: '通知公告',
          icon: 'Bell',
          roles: ['admin']
        }
      },
      {
        path: 'system-management',
        name: 'SystemManagement',
        component: SystemManagement,
        meta: {
          title: '系统管理',
          icon: 'Setting',
          roles: ['admin']
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const token = localStorage.getItem('token')
  
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 科研论文数据管理平台` : '科研论文数据管理平台'
  
  // 检查是否需要认证
  if (to.meta.requiresAuth !== false) {
    if (!token) {
      next('/login')
      return
    }
    
    // 检查用户角色权限
    if (to.meta.roles && userStore.user) {
      const userRole = userStore.user.role
      if (!to.meta.roles.includes(userRole)) {
        // 没有权限访问该页面，跳转到工作台
        next('/dashboard')
        return
      }
    }
  }
  
  // 如果已登录用户访问登录页，跳转到工作台
  if (to.path === '/login' && token && userStore.user) {
    next('/dashboard')
    return
  }
  
  next()
})

export default router