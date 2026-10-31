import type { RouteRecordRaw } from 'vue-router';
import { createWebHashHistory, createRouter } from 'vue-router';

import HomeView from '@renderer/views/HomeView.vue';
import SettingsView from '@renderer/views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView
  }
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
