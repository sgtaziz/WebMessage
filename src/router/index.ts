import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Chat from '@/views/Chat'
import Blank from '@/views/Blank'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Blank,
  },
  {
    path: '/chat/:id',
    name: 'Chat',
    component: Chat,
  },
]

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes,
})

export default router
