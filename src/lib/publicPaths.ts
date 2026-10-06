/**
 * Pages a guest can open without an account. Everything else (the user's
 * collection, lists, paints, messages, settings, admin) asks to sign in.
 * Keep in sync with `publicRoutes` in App.tsx.
 */
const PUBLIC_PATHS = [
  /^\/articulos\/(?!nuevo$)[^/]+$/,
  /^\/guias(\/(?!nueva$)[^/]+)?$/,
  /^\/catalogo-puntos(\/[^/]+){0,2}$/,
  /^\/descargas$/,
  /^\/cambios-puntos$/,
  /^\/competitivo(\/(listas|torneos)\/[^/]+)?$/,
  /^\/comunidad(\/listas\/[^/]+)?$/,
  /^\/perfil\/[^/]+$/,
  /^\/partidas(\/(?!nueva$)[^/]+)?$/,
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((re) => re.test(pathname));
}
