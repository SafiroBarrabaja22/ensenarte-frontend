/**
 * Configuracion del cliente.
 * Cambia API_BASE_URL por la URL del backend desplegado cuando publiques.
 */
const CONFIG = {
  API_BASE_URL: "http://127.0.0.1:8000/api",
  // Carpetas locales donde viven las imagenes y gifs de los cursos.
  // La base de datos guarda solo el nombre del archivo.
  RUTA_IMAGENES: "assets/imagenes/",
  RUTA_VIDEOS: "assets/videos/",
  AVATAR_POR_DEFECTO: "imgPredeterminadaUsuario.png",
  // Slugs de los cursos que ofrecen la evaluacion con camara (el modelo solo
  // reconoce letras). El backend debe rechazar los demas cursos.
  CURSOS_CON_EVALUACION_CAMARA: ["abecedario"],
};

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
