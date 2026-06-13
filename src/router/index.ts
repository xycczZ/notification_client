import { createRouter, createWebHistory } from 'vue-router'
import SetupView from '../views/SetupView.vue'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'setup',
      component: SetupView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView
    }
  ]
})

export default router
