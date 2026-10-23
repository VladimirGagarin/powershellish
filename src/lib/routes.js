const basePath = import.meta.env.BASE_URL.replace(/\/+$/, '')

export function routeHref(route) {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`
  const canonicalRoute = normalizedRoute === '/'
    ? '/'
    : normalizedRoute.endsWith('/') ? normalizedRoute : `${normalizedRoute}/`

  return basePath
    ? `${basePath}${canonicalRoute === '/' ? '/' : canonicalRoute}`
    : canonicalRoute
}

export function getPage(pathname = window.location.pathname) {
  const appPath = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
    ? pathname.slice(basePath.length) || '/'
    : pathname
  const normalizedPath = appPath.replace(/\/+$/, '') || '/'

  if (normalizedPath === '/terminal') return '/terminal/'
  if (normalizedPath === '/help') return '/help/'
  return '/'
}
