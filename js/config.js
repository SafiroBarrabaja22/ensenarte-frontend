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
};

/** Resuelve la ruta de una imagen segun la profundidad de la pagina actual. */
function rutaImagen(archivo) {
  if (!archivo) return prefijoRaiz() + CONFIG.RUTA_IMAGENES + CONFIG.AVATAR_POR_DEFECTO;
  return prefijoRaiz() + CONFIG.RUTA_IMAGENES + archivo;
}

function rutaVideo(archivo) {
  if (!archivo) return "";
  return prefijoRaiz() + CONFIG.RUTA_VIDEOS + archivo;
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
