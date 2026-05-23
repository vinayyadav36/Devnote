import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/auth',
    component: () => import('../views/Auth.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/snap',
    component: () => import('../views/SnapShop.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/stories',
    component: () => import('../views/Stories.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/library',
    component: () => import('../views/Library.vue'),
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('authToken');
  const isAuthenticated = !!token;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/auth');
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;
