import { type RouteConfig, index, route, layout } from '@react-router/dev/routes';

export default [
  // Public / auth routes (no sidebar)
  route('login', 'routes/login.tsx'),
  route('logout', 'routes/logout.tsx'),
  route('setup', 'routes/setup.tsx'),
  route('api/auth/*', 'routes/api.auth.$.tsx'),

  // Protected app (sidebar layout checks session)
  layout('layouts/sidebar.tsx', [
    index('routes/dashboard.tsx'),
    route('products', 'routes/products.tsx'),
    route('products/new', 'routes/product.new.tsx'),
    route('products/:id/edit', 'routes/product.edit.tsx'),
    route('orders', 'routes/orders.tsx'),
    route('orders/new', 'routes/order.new.tsx'),
    route('ads', 'routes/ads.tsx'),
    route('finances', 'routes/finances.tsx'),
    route('profit', 'routes/profit.tsx'),
  ]),
] satisfies RouteConfig;
