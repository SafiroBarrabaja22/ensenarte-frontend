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
  /**
   * Cierra la sesion: borra access, refresh y usuario del navegador y pide al
   * servidor que invalide el refresh (lista negra). Sin ese paso, un refresh
   * copiado antes seguiria sirviendo hasta 7 dias.
   */
  cerrar() {
    const tokens = Sesion.tokens();
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(USUARIO_KEY);
    if (tokens && tokens.refresh) {
      // keepalive: la peticion se completa aunque la pagina navegue al login.
      fetch(`${CONFIG.API_BASE_URL}/auth/logout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: tokens.refresh }),
        keepalive: true,
      }).catch(() => {});
    }
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

/**
 * Renueva el access con el refresh. Devuelve true si hay tokens nuevos.
 *
 * - Si varias peticiones vencen a la vez, comparten UN solo refresco. El backend
 *   rota el refresh y anula el anterior, asi que dos refrescos en paralelo con el
 *   mismo refresh harian fallar al segundo y botarian al usuario.
 * - Si otra pestana ya renovo (el localStorage es compartido), se usa lo suyo.
 * - Un error de red NO cierra la sesion: se propaga como error normal.
 */
let refrescoEnCurso = null;

function refrescarToken() {
  if (!refrescoEnCurso) {
    refrescoEnCurso = pedirRefresco().finally(() => {
      refrescoEnCurso = null;
    });
  }
  return refrescoEnCurso;
}

async function pedirRefresco() {
  const tokens = Sesion.tokens();
  if (!tokens || !tokens.refresh) return false;

  let respuesta;
  try {
    respuesta = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });
  } catch (error) {
    throw new ApiError("No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.", 0, null);
  }

  if (!respuesta.ok) {
    // Otra pestana pudo rotar el refresh mientras tanto: si cambio, vale ese.
    const actuales = Sesion.tokens();
    return Boolean(actuales && actuales.refresh && actuales.refresh !== tokens.refresh);
  }

  const datos = await respuesta.json();
  // Con rotacion el servidor devuelve tambien un refresh nuevo: hay que
  // guardarlo, porque el anterior ya quedo invalidado.
  Sesion.guardar({ access: datos.access, refresh: datos.refresh || tokens.refresh });
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
    irALogin("expirada");
    throw new ApiError("Tu sesión expiró. Inicia sesión de nuevo.", 401, null);
  }

  if (respuesta.status === 204) return null;

  let datos = null;
  const tipo = respuesta.headers.get("content-type") || "";
  if (tipo.includes("application/json")) {
    datos = await respuesta.json();
  }

  // Permiso denegado: el rol del usuario no alcanza para esta accion.
  if (respuesta.status === 403) {
    const detalle = datos && datos.detail ? ` ${datos.detail}` : "";
    throw new ApiError(
      `Permiso denegado: tu rol no permite realizar esta acción.${detalle}`,
      403,
      datos
    );
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

/** @param {string} [motivo] p. ej. "expirada": login.html muestra un aviso. */
function irALogin(motivo) {
  const consulta = motivo ? `?sesion=${encodeURIComponent(motivo)}` : "";
  window.location.href = prefijoRaiz() + "pages/login.html" + consulta;
}

/** Bloquea una pagina si no hay sesion iniciada. */
function requiereSesion() {
  if (!Sesion.activa()) {
    irALogin();
    return false;
  }
  return true;
}

// ==========================================================
// ROLES
// ==========================================================

/**
 * Nombres de los roles. Deben coincidir EXACTAMENTE con
 * ensenarte-backend/apps/usuarios/roles.py: no escribir estos strings en otro lugar.
 */
const ROLES = Object.freeze({
  ESTUDIANTE: "Estudiante",
  PROFESOR: "Profesor",
  INTERPRETE: "Interprete",
  CREADOR: "CreadorDeCursos",
  ADMINISTRADOR: "Administrador",
});

/** Quien entra a cada tipo de pagina. Refleja apps/cursos/permissions.py. */
const ACCESO = Object.freeze({
  // Cursos, diccionario, evaluaciones, perfil: cualquier rol.
  APRENDIZAJE: Object.values(ROLES),
  // Panel de cursos, preguntas y diccionario.
  PANEL_CONTENIDO: [ROLES.PROFESOR, ROLES.CREADOR, ROLES.ADMINISTRADOR],
  // Biblioteca visual (recursos, avatares e insignias).
  BIBLIOTECA: [ROLES.INTERPRETE, ROLES.ADMINISTRADOR],
});

/** True si el usuario tiene al menos uno de los roles indicados. */
function tieneRol(usuario, roles) {
  const propios = (usuario && Array.isArray(usuario.roles)) ? usuario.roles : [];
  return roles.some((rol) => propios.includes(rol));
}

/** Pagina de inicio segun el rol (ruta desde la raiz del sitio), o null si no tiene rol. */
function paginaInicioDe(usuario) {
  if (tieneRol(usuario, ACCESO.PANEL_CONTENIDO)) return "pages/panel/index.html";
  if (tieneRol(usuario, ACCESO.BIBLIOTECA)) return "pages/panel/recursos.html";
  if (tieneRol(usuario, ACCESO.APRENDIZAJE)) return "pages/inicio-usuario.html";
  return null;
}

/**
 * Verifica sesion y rol ANTES de mostrar la pagina.
 *
 * Las paginas protegidas tienen <body class="paginaProtegida">, que extra.css
 * deja oculto hasta que esta funcion agrega "accesoVerificado". Los roles se
 * piden al servidor en cada carga (no se confia en el localStorage, que el
 * usuario puede editar y que queda viejo si le cambian el rol).
 *
 * Devuelve el usuario si puede entrar; si no, redirige y devuelve null.
 */
async function exigirRol(rolesPermitidos) {
  if (!Sesion.activa()) {
    irALogin();
    return null;
  }

  let usuario;
  try {
    usuario = await api("/auth/perfil/");
    Sesion.actualizarUsuario(usuario);
  } catch (error) {
    if (error.status !== 401) {
      mostrarBloqueoAcceso(`No se pudo verificar tu acceso: ${error.message}`);
    }
    return null;
  }

  if (!tieneRol(usuario, rolesPermitidos)) {
    const destino = paginaInicioDe(usuario);
    if (destino) {
      window.location.replace(`${prefijoRaiz()}${destino}?acceso=denegado`);
    } else {
      mostrarBloqueoAcceso(
        "Tu cuenta no tiene ningún rol asignado. Pide a un administrador que te asigne uno."
      );
    }
    return null;
  }

  document.body.classList.add("accesoVerificado");
  avisarSiAccesoDenegado();
  return usuario;
}

/** Reemplaza la pagina por un mensaje cuando no se puede entrar. */
function mostrarBloqueoAcceso(texto) {
  const raiz = prefijoRaiz();
  document.body.innerHTML = `
    <main class="bloqueoAcceso" role="alert">
      <h1>Permiso denegado</h1>
      <p></p>
      <a href="${raiz}index.html">Ir al inicio</a>
      <a href="#" id="bloqueoCerrarSesion">Cerrar sesión</a>
    </main>`;
  document.querySelector(".bloqueoAcceso p").textContent = texto;
  document.getElementById("bloqueoCerrarSesion").addEventListener("click", (evento) => {
    evento.preventDefault();
    Sesion.cerrar();
    irALogin();
  });
  document.body.classList.add("accesoVerificado");
}

/** Si se llego aqui redirigido desde una pagina sin permiso, lo explica. */
function avisarSiAccesoDenegado() {
  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get("acceso") !== "denegado") return;
  const aviso = document.createElement("div");
  aviso.className = "avisoAccesoDenegado";
  aviso.setAttribute("role", "alert");
  aviso.textContent =
    "Permiso denegado: tu rol no tiene acceso a la página que intentaste abrir. Te trajimos a tu inicio.";
  document.body.prepend(aviso);
  parametros.delete("acceso");
  const consulta = parametros.toString();
  window.history.replaceState(null, "", window.location.pathname + (consulta ? `?${consulta}` : ""));
}
