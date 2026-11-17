/**
 * Cabecera y menu compartidos.
 * Sustituye a base.html y baseUsuarios.html del monolito: en vez de heredar
 * plantillas de Django, cada pagina llama a montarLayout() y el HTML se inyecta.
 */

function montarLayout(tipo) {
  const contenedor = document.getElementById("layout");
  if (!contenedor) return;

  const raiz = prefijoRaiz();
  const usuario = Sesion.usuario();
  const enlaceInicio = tipo === "usuario"
    ? `${raiz}pages/inicio-usuario.html`
    : `${raiz}index.html`;

  const enlacesPublicos = `
    <a href="${raiz}index.html">Inicio</a>
    <a href="${raiz}pages/cursos.html">Cursos</a>
    <a href="${raiz}pages/contacto.html">Soporte</a>
    <a href="${raiz}pages/sobre-nosotros.html">Sobre nosotros</a>`;

  // Cada opcion aparece solo si el rol activo puede usarla (ver ACCESO en api.js).
  const puedeAprender = tieneRol(usuario, ACCESO.APRENDIZAJE);
  const puedePanel = tieneRol(usuario, ACCESO.PANEL_CONTENIDO);
  const puedeBiblioteca = tieneRol(usuario, ACCESO.BIBLIOTECA);
  const enlacesUsuario = `
    ${puedeAprender ? `<a href="${raiz}pages/inicio-usuario.html">Inicio</a>` : ""}
    ${puedeAprender ? `<a href="${raiz}pages/cursos-usuario.html">Cursos</a>` : ""}
    ${puedePanel ? `<a href="${raiz}pages/panel/index.html">Panel</a>` : ""}
    ${puedeBiblioteca ? `<a href="${raiz}pages/panel/recursos.html">Biblioteca visual</a>` : ""}
    <a href="${raiz}pages/contacto.html">Soporte</a>
    <a href="#" id="linkCerrarSesion">Cerrar sesion</a>`;

  const bloqueDerecho =
    tipo === "usuario"
      ? `<div class="menuUsuario">
         <a class="perfilUsuarioHeader" href="${raiz}pages/perfil.html" aria-label="Ver perfil de ${escaparHtml(usuario ? usuario.nombre : "usuario")}">
           <img class="avatarHeader" src="${escaparHtml(avatarDe(usuario))}" alt="" loading="lazy">
           <span class="nombreHeader">${escaparHtml(usuario ? usuario.nombre : "")}</span>
         </a>
         ${puedeBiblioteca ? `<a class="perfilHeader" href="${raiz}pages/panel/recursos.html">Biblioteca visual</a>` : ""}
         </div>`
      : `<nav class="menu">
           <a href="${raiz}pages/login.html">Iniciar sesión</a>
           <a href="${raiz}pages/signup.html">Registrarse</a>
         </nav>`;

  contenedor.innerHTML = `
    ${spriteIconos()}
    <header class="header">
      <div class="container">
        <div class="btnMenu"><label for="btnMenu" aria-label="Abrir menú"><svg class="icon icon20" aria-hidden="true"><use href="#i-menu"></use></svg></label></div>
        <div class="logo"><a href="${enlaceInicio}" aria-label="enSEÑArte, inicio"><span>en</span>SEÑArte</a></div>
        ${bloqueDerecho}
      </div>
    </header>
    <input type="checkbox" id="btnMenu">
    <div class="containerMenu">
      <div class="contMenu">
        <nav>${tipo === "usuario" ? enlacesUsuario : enlacesPublicos}</nav>
        <label for="btnMenu" aria-label="Cerrar menú"><svg class="icon icon20" aria-hidden="true"><use href="#i-x"></use></svg></label>
      </div>
    </div>`;

  ocultarSegunRol(usuario);

  const cerrar = document.getElementById("linkCerrarSesion");
  if (cerrar) {
    cerrar.addEventListener("click", (evento) => {
      evento.preventDefault();
      Sesion.cerrar();
      window.location.href = raiz + "index.html";
    });
  }
}

/**
 * Enlaces escritos en el HTML con data-acceso="BIBLIOTECA" (o otra clave de
 * ACCESO) se quitan si el usuario no tiene ese acceso. Solo es presentacion:
 * la pagina destino vuelve a verificar con exigirRol y la API con sus permisos.
 */
function ocultarSegunRol(usuario) {
  document.querySelectorAll("[data-acceso]").forEach((elemento) => {
    const roles = ACCESO[elemento.dataset.acceso];
    if (!roles || !tieneRol(usuario, roles)) elemento.remove();
  });
}

function spriteIconos() {
  return `<svg class="spriteIconos" aria-hidden="true" focusable="false">
    <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
    <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c.8-3.4 3.5-5 8-5s7.2 1.6 8 5"/></symbol>
    <symbol id="i-user-plus" viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 20c.8-3.4 3.5-5 7-5s6.2 1.6 7 5M19 8v6M16 11h6"/></symbol>
    <symbol id="i-at" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 12v1a3 3 0 0 0 6 0v-1a10 10 0 1 0-3 7.2"/></symbol>
    <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></symbol>
    <symbol id="i-key" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 3 3"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></symbol>
    <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2"/></symbol>
    <symbol id="i-eye-off" viewBox="0 0 24 24"><path d="m3 3 18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-3.2 3.8M6.2 6.2C3.5 8.2 2 12 2 12s3.5 6 10 6a10 10 0 0 0 2-.2"/></symbol>
    <symbol id="i-camera" viewBox="0 0 24 24"><path d="M4 7h4l1.5-2h5L16 7h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3"/></symbol>
    <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v12m0 0-4-4m4 4 4-4M5 18v2h14v-2"/></symbol>
    <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5"/></symbol>
    <symbol id="i-edit" viewBox="0 0 24 24"><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13 6 4 4"/></symbol>
    <symbol id="i-x" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol>
    <symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="M19 12H5m7-7-7 7 7 7"/></symbol>
    <symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14m-7-7 7 7-7 7"/></symbol>
    <symbol id="i-play" viewBox="0 0 24 24"><path d="m8 5 11 7-11 7V5Z"/></symbol>
    <symbol id="i-books" viewBox="0 0 24 24"><path d="M4 5h12v14H4zM8 5V3h12v14h-4M7 9h6M7 13h6"/></symbol>
    <symbol id="i-book-2" viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 0v13a3 3 0 0 0 3 3"/></symbol>
    <symbol id="i-checklist" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></symbol>
    <symbol id="i-help-circle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.8 1.7c-1 .8-1.6 1.1-1.6 2.3M12 16h.01"/></symbol>
    <symbol id="i-info-circle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></symbol>
    <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></symbol>
    <symbol id="i-shield-lock" viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3Z"/><rect x="9" y="10" width="6" height="5" rx="1"/><path d="M10 10V9a2 2 0 0 1 4 0v1"/></symbol>
    <symbol id="i-hand" viewBox="0 0 24 24"><path d="M7 12V6a1 1 0 0 1 2 0v5-7a1 1 0 0 1 2 0v7-8a1 1 0 0 1 2 0v8-6a1 1 0 0 1 2 0v8l2-2a1.5 1.5 0 0 1 2 2l-4 5a4 4 0 0 1-3 1H9a4 4 0 0 1-4-4v-3a1 1 0 0 1 2 0Z"/></symbol>
    <symbol id="i-dog" viewBox="0 0 24 24"><path d="M7 10 5 7l3-2 2 3h4l2-3 3 2-2 3v6a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-6Z"/><path d="M9 14h.01M15 14h.01M10 17h4"/></symbol>
    <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></symbol>
    <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></symbol>
    <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.4-3"/></symbol>
    <symbol id="i-circle-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/></symbol>
    <symbol id="i-insignia-curso-completado" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="m8 12-1 9 5-3 5 3-1-9"/><path d="m10 8 1.4 1.4L14.5 6"/></symbol>
    <symbol id="i-abc" viewBox="0 0 24 24"><rect x="2.5" y="4" width="19" height="16" rx="3"/><text x="12" y="15" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none">ABC</text></symbol>
    <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 21a6 6 0 0 0 6-6c0-4-4-5-4-9-3 2-5 5-3 8-2 0-3-1-3-3-2 2-2 4-2 5a6 6 0 0 0 6 5Z"/></symbol>
    <symbol id="i-award" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="m8 12-1 9 5-3 5 3-1-9"/></symbol>
    <symbol id="i-photo" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><path d="m4 17 5-5 3 3 2-2 6 5"/></symbol>
    <symbol id="i-repeat" viewBox="0 0 24 24"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/></symbol>
    <symbol id="i-message-circle" viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 1-8 8 9 9 0 0 1-4-.9L3 20l1.9-4A8 8 0 1 1 20 11Z"/></symbol>
  </svg>`;
}

function iconoSvg(nombre, clase = "icon", etiqueta = "") {
  const accesibilidad = etiqueta ? ` role="img" aria-label="${escaparHtml(etiqueta)}"` : " aria-hidden=\"true\"";
  return `<svg class="${clase}"${accesibilidad}><use href="#i-${nombre}"></use></svg>`;
}

function avatarDe(usuario) {
  if (!usuario) return rutaImagen(CONFIG.AVATAR_POR_DEFECTO);
  if (usuario.foto_perfil_url) return usuario.foto_perfil_url;
  return rutaImagen(usuario.avatar || CONFIG.AVATAR_POR_DEFECTO);
}

/** Pie de pagina opcional. */
function montarFooter() {
  const pie = document.getElementById("footer");
  if (pie) pie.innerHTML = `<footer><p>&copy; enSEÑArte - ${new Date().getFullYear()}</p></footer>`;
}

/** Mensaje de error o exito reutilizable. */
function mostrarMensaje(id, texto, tipo = "error") {
  const caja = document.getElementById(id);
  if (!caja) return;
  caja.textContent = texto;
  caja.className = tipo === "error" ? "mensajeError" : "mensajeOk";
  caja.style.display = texto ? "block" : "none";
}

function nombreCursoParaEvaluacion(curso, slug) {
  const candidatos = [curso?.titulo, curso?.nombre, curso?.nombre_curso];
  const nombre = candidatos.find((valor) => {
    const texto = String(valor || "").trim();
    return texto && !/^\d+$/.test(texto) && !/^curso\s*\d+$/i.test(texto);
  });
  const texto = String(nombre || slug || "Curso").trim().replace(/[-_]+/g, " ");
  if (!texto || /^\d+$/.test(texto)) return "Curso";
  return texto.charAt(0).toLocaleUpperCase("es") + texto.slice(1);
}
