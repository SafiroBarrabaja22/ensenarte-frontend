/**
 * Configuracion del cliente.
 *
 * URL DEL BACKEND: se decide SOLO aqui.
 * - Live Server / http.server en el puerto 5500 (desarrollo): el backend de
 *   runserver en BACKEND_LOCAL.
 * - En cualquier otro caso (Docker en la miniPC, detras de Tailscale Funnel):
 *   el mismo dominio de la pagina. El nginx del frontend reenvia /api/,
 *   /admin/, /media/ y /static/ al backend (docker/nginx.conf).
 * Va sin barra final y sin /api: API_BASE_URL se arma abajo.
 */
const CONFIG = {
  BACKEND_LOCAL: "http://127.0.0.1:8000",
  PUERTO_DESARROLLO: "5500",
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
  (window.location.port === CONFIG.PUERTO_DESARROLLO ? CONFIG.BACKEND_LOCAL : window.location.origin) + "/api";

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

/**
 * Aplica los estilos de data-css="propiedad: valor; ..." con element.style.
 * La CSP no permite atributos style="..." en el HTML (scripts/aplicar_csp.py),
 * pero si cambiar estilos desde JavaScript. Las plantillas que necesitan un
 * valor calculado (porcentajes, variables CSS) usan data-css y despues de
 * pintar llaman a aplicarVariablesCss(contenedor).
 */
function aplicarVariablesCss(raiz) {
  raiz.querySelectorAll("[data-css]").forEach((elemento) => {
    elemento.dataset.css.split(";").forEach((declaracion) => {
      const separador = declaracion.indexOf(":");
      if (separador > 0) {
        elemento.style.setProperty(declaracion.slice(0, separador).trim(), declaracion.slice(separador + 1).trim());
      }
    });
    elemento.removeAttribute("data-css");
  });
}

/**
 * Manejador comun para promesas que nadie espera (el arranque de cada pagina,
 * recargas en segundo plano): registra el error y avisa en #mensaje si existe.
 */
function errorInesperado(error) {
  console.error(error);
  if (typeof mostrarMensaje === "function" && document.getElementById("mensaje")) {
    mostrarMensaje("mensaje", error?.message || "Ocurrió un error inesperado. Recarga la página.");
  }
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
