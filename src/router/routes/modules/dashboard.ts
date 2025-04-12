import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const DASHBOARD: AppRouteRecordRaw = {
  path: '/dashboard',
  name: 'dashboard',
  component: DEFAULT_LAYOUT,
  meta: {
    locale: 'menu.dashboard',
    requiresAuth: true,
    icon: 'icon-dashboard',
    order: 0,
  },
  children: [
    {
      path: 'workplace',
      name: 'Workplace',
      component: () => import('@/views/dashboard/workplace/index.vue'),
      meta: {
        locale: 'menu.dashboard.workplace.doran',
        requiresAuth: true,
        icon: 'icon-command',
        roles: ['*'],
      },
    },
    {
      path: 'ground-imagery',
      name: 'GroundImagery',
      component: () => import('@/views/dashboard/ground-imagery/index.vue'),
      meta: {
        locale: 'menu.dashboard.groundImagery',
        requiresAuth: true,
        icon: 'icon-camera',
        order: 5,
      },
    },
  ],
};

export default DASHBOARD;
