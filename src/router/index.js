import AppChildren from '@/router/app/index'
import { useCoreStore } from '@/store/coreStore'
import { createRouter, createWebHistory } from '@ionic/vue-router'

const routes = [
  {
    path: '/',
    name: 'App',
    component: () => import('@/modules/app/Index.vue'),
    children: AppChildren,
  },
  {
    path: '/redirect',
    name: 'Redirect',
    component: () => import('@/modules/redirect/Redirect.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/modules/not_found/views/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  linkExactActiveClass: 'active',
  routes,
})

export default router
