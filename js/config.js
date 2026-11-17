/**
 * Configuracion del cliente.
 *
 * URL DEL BACKEND: se cambia aqui (BACKEND_PRODUCCION / BACKEND_LOCAL) y en
 * scripts/aplicar_csp.py, que la autoriza en la CSP de todas las paginas.
 * - Abierto en localhost o 127.0.0.1 (Live Server, http.server) usa el backend local.
 * - En cualquier otro dominio (GitHub Pages) usa el de produccion: la miniPC
 *   expuesta con Tailscale Funnel. Ver docs/DESPLIEGUE.md del backend.
 * Va sin barra final y sin /api: API_BASE_URL se arma abajo.
 */
const CONFIG = {
  BACKEND_PRODUCCION: "https://cachyos-x8664.tailb93c3e.ts.net",
  BACKEND_LOCAL: "http://127.0.0.1:8000",
  // Carpetas locales donde viven las imagenes y gifs de los cursos.
  // La base de datos guarda solo el nombre del archivo.
  RUTA_IMAGENES: "assets/imagenes/",
  RUTA_VIDEOS: "assets/videos/",
  AVATAR_POR_DEFECTO: "imgPredeterminadaUsuario.png",
  // Slugs de los cursos que ofrecen la evaluacion con camara (el modelo solo
  // reconoce letras). El backend debe rechazar los demas cursos.
  CURSOS_CON_EVALUACION_CAMARA: ["abecedario"],
};

CONFIG.API_BASE_URL =
  (["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
    ? CONFIG.BACKEND_LOCAL
    : CONFIG.BACKEND_PRODUCCION) + "/api";

/**
 * Escapa texto para meterlo en HTML (contenido o atributo entre comillas).
 * Todo dato que venga de la API (nombres, titulos, rutas de imagen) debe pasar
 * por aqui antes de ir a innerHTML: un nombre de usuario como
 * <img src=x onerror=...> se mostraria como texto y no se ejecutaria.
 * Si no hace falta HTML, mejor textContent.
 */
function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function cursoTieneEvaluacionCamara(slug) {
  return CONFIG.CURSOS_CON_EVALUACION_CAMARA.includes(slug);
}

/** Resuelve la ruta de una imagen segun la profundidad de la pagina actual. */
function rutaImagen(archivo) {
  if (!archivo) return prefijoRaiz() + CONFIG.RUTA_IMAGENES + CONFIG.AVATAR_POR_DEFECTO;
  return resolverRutaArchivo(archivo, CONFIG.RUTA_IMAGENES);
}

function rutaVideo(archivo) {
  if (!archivo) return "";
  return resolverRutaArchivo(archivo, CONFIG.RUTA_VIDEOS);
}

function resolverRutaArchivo(archivo, carpetaAssets) {
  const ruta = String(archivo);
  if (/^(https?:|data:|blob:)/i.test(ruta)) return ruta;
  if (ruta.startsWith("/")) return new URL(ruta, CONFIG.API_BASE_URL).href;
  return prefijoRaiz() + carpetaAssets + ruta;
}

/**
 * Las paginas viven en /, /pages/ y /pages/panel/, asi que los assets se
 * referencian con el numero de ".." que corresponda.
 */
function prefijoRaiz() {
  const partes = window.location.pathname.split("/").filter(Boolean);
  if (partes.includes("panel")) return "../../";
  if (partes.includes("pages")) return "../";
  return "";
}
