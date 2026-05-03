const PATHS = [
  '/admin', '/admin/login', '/admin/dashboard', '/administrator',
  '/api', '/api/v1', '/api/v2', '/api/health', '/api/status', '/api/docs',
  '/login', '/logout', '/signup', '/register', '/auth', '/oauth',
  '/dashboard', '/profile', '/settings', '/account',
  '/wp-admin', '/wp-login.php', '/wp-content', '/wp-includes',
  '/phpmyadmin', '/phpinfo.php',
  '/config', '/config.json', '/config.yaml', '/env', '/.env',
  '/robots.txt', '/sitemap.xml', '/sitemap_index.xml',
  '/favicon.ico', '/manifest.json',
  '/search', '/help', '/support', '/contact', '/about',
  '/blog', '/news', '/shop', '/store', '/cart', '/checkout',
  '/upload', '/uploads', '/files', '/assets', '/static', '/media',
  '/css', '/js', '/images', '/fonts',
  '/health', '/status', '/ping', '/metrics',
  '/users', '/user', '/accounts', '/members',
  '/docs', '/documentation', '/swagger', '/swagger-ui', '/openapi.json',
  '/graphql', '/graphiql',
  '/feed', '/rss', '/atom',
  '/download', '/downloads',
  '/.git', '/.gitignore', '/.well-known/security.txt',
  '/security.txt', '/humans.txt',
  '/500', '/404', '/403',
  '/test', '/dev', '/staging', '/backup',
];

export function getWordlistPaths(baseUrl: string): Array<{ url: string; source: string }> {
  const base = baseUrl.replace(/\/$/, '');
  return PATHS.map((p) => ({ url: base + p, source: 'wordlist' }));
}
