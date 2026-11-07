/** Rutas de partida en vivo (jugador o anfitrión), no el formulario de unirse. */
export function isLiveSessionPath(pathname: string) {
  return /^\/app\/jugar\/[^/]+$/.test(pathname) || /^\/app\/evaluaciones\/sala\/[^/]+$/.test(pathname);
}
