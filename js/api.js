/**
 * Cliente HTTP de la API.
 * Se encarga del token JWT, del refresco automatico y del manejo de errores.
 */

const TOKENS_KEY = "ensenarte_tokens";
const USUARIO_KEY = "ensenarte_usuario";

const Sesion = {
  guardar(tokens, usuario) {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    if (usuario) localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  },
  tokens() {
    try {
      return JSON.parse(localStorage.getItem(TOKENS_KEY));
    } catch {
      return null;
    }
  },
  usuario() {
    try {
      return JSON.parse(localStorage.getItem(USUARIO_KEY));
    } catch {
      return null;
    }
  },
  actualizarUsuario(usuario) {
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  },
  activa() {
    const t = Sesion.tokens();
    return Boolean(t && t.access);
  },
  cerrar() {
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(USUARIO_KEY);
  },
};

/** Error con el detalle que devolvio la API, para mostrarlo en pantalla. */
class ApiError extends Error {
  constructor(mensaje, status, datos) {
    super(mensaje);
    this.status = status;
    this.datos = datos;
  }
}

function mensajeDeError(datos, status) {
  if (!datos) return `Error ${status}`;
  if (typeof datos === "string") return datos;
  if (datos.detail) return datos.detail;
  // Errores de validacion de DRF: {campo: ["mensaje"]}
  const primero = Object.values(datos)[0];
  if (Array.isArray(primero)) return primero[0];
  return `Error ${status}`;
}

async function refrescarToken() {
  const tokens = Sesion.tokens();
  if (!tokens || !tokens.refresh) return false;

  const respuesta = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });

  if (!respuesta.ok) return false;

  const datos = await respuesta.json();
  Sesion.guardar({ ...tokens, access: datos.access });
  return true;
}

/**
 * Peticion generica a la API.
 * @param {string} ruta   Ruta relativa, por ejemplo "/cursos/".
 * @param {object} opciones  { metodo, cuerpo, autenticado, esFormData }
 */
async function api(ruta, opciones = {}) {
  const {
    metodo = "GET",
    cuerpo = null,
    autenticado = true,
    esFormData = false,
    reintento = false,
  } = opciones;

  const headers = {};
  if (!esFormData) headers["Content-Type"] = "application/json";

  if (autenticado) {
    const tokens = Sesion.tokens();
    if (tokens && tokens.access) {
      headers["Authorization"] = `Bearer ${tokens.access}`;
    }
  }

  const respuesta = await fetch(`${CONFIG.API_BASE_URL}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo ? (esFormData ? cuerpo : JSON.stringify(cuerpo)) : null,
  });

  // Token vencido: se intenta refrescar una sola vez.
  if (respuesta.status === 401 && autenticado && !reintento) {
    const ok = await refrescarToken();
    if (ok) return api(ruta, { ...opciones, reintento: true });
    Sesion.cerrar();
    irALogin();
    throw new ApiError("Tu sesion expiro.", 401, null);
  }

  if (respuesta.status === 204) return null;

  let datos = null;
  const tipo = respuesta.headers.get("content-type") || "";
  if (tipo.includes("application/json")) {
    datos = await respuesta.json();
  }

  if (!respuesta.ok) {
    throw new ApiError(mensajeDeError(datos, respuesta.status), respuesta.status, datos);
  }

  return datos;
}

/** DRF pagina por defecto: devuelve siempre un array. */
function comoLista(datos) {
  if (Array.isArray(datos)) return datos;
  if (datos && Array.isArray(datos.results)) return datos.results;
  return [];
}

function irALogin() {
  window.location.href = prefijoRaiz() + "pages/login.html";
}

/** Bloquea una pagina si no hay sesion iniciada. */
function requiereSesion() {
  if (!Sesion.activa()) {
    irALogin();
    return false;
  }
  return true;
}
