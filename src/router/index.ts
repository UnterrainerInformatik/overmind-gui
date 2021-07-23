import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    redirect: '/app/main'
  },
  {
    path: '/app/main',
    name: 'main',
    component: () => import('../views/Main.vue')
  },
  {
    path: '/app/colortest',
    name: 'colortest',
    component: () => import('../views/ColorTest.vue')
  },
  {
    path: '/settings/about',
    name: 'about',
    component: () => import('../views/About.vue')
  },
  {
    path: '/:catchAll(.*)',
    name: 'catchAll',
    component: () => import('../views/page404.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
