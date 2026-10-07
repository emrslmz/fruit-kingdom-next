const routes = [
  {
    path: '/',
    name: 'MainMenu',
    component: () => import('@/modules/app/views/MainMenu.vue'),
    meta: {
      title: 'MainMenu',
    },
  },
  {
    path: '/game',
    name: 'Game',
    component: () => import('@/modules/app/views/Game.vue'),
    meta: {
      title: 'Game',
    },
  },
  {
    path: '/purchase/:currency',
    name: 'Purchase',
    component: () => import('@/modules/app/views/PurchaseView.vue'),
    props: true,
    meta: {
      title: 'Purchase',
    },
  },
  {
    path: '/market',
    name: 'Market',
    component: () => import('@/modules/app/views/MarketView.vue'),
    meta: {
      title: 'Market',
    },
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/modules/app/views/InventoryView.vue'),
    meta: {
      title: 'Inventory',
    },
  },
  {
    path: '/cases',
    name: 'Cases',
    component: () => import('@/modules/app/views/CasesView.vue'),
    meta: {
      title: 'Cases',
    },
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/modules/app/views/OrdersView.vue'),
    meta: {
      title: 'Orders',
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/modules/app/views/SettingsView.vue'),
    meta: {
      title: 'Settings',
    },
  },
]

export default routes
