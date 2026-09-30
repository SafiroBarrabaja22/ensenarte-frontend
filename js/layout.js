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

  const enlacesUsuario = `
    <a href="${raiz}pages/inicio-usuario.html">Inicio</a>
    <a href="${raiz}pages/perfil.html">Perfil</a>
    <a href="${raiz}pages/cursos-usuario.html">Cursos</a>
    <a href="${raiz}pages/contacto.html">Soporte</a>
    ${usuario && usuario.es_creador ? `<a href="${raiz}pages/panel/index.html">Panel</a>` : ""}
    <a href="#" id="linkCerrarSesion">Cerrar sesion</a>`;

  const bloqueDerecho =
    tipo === "usuario"
      ? `<div class="menuUsuario">
         <span class="nombreHeader">${usuario ? usuario.nombre : ""}</span>
         <a class="perfilHeader" href="${raiz}pages/perfil.html">Perfil</a>
         </div>`
      : `<nav class="menu">
           <a href="${raiz}pages/login.html">Iniciar sesion</a>
           <a href="${raiz}pages/signup.html">Registrarse</a>
         </nav>`;

  contenedor.innerHTML = `
    <header class="header">
      <div class="container">
        <div class="btnMenu"><label for="btnMenu">&#9776;</label></div>
        <div class="logo"><a href="${enlaceInicio}" aria-label="enSEÑArte, inicio"><span>en</span>SEÑArte</a></div>
        ${bloqueDerecho}
      </div>
    </header>
    <input type="checkbox" id="btnMenu">
    <div class="containerMenu">
      <div class="contMenu">
        <nav>${tipo === "usuario" ? enlacesUsuario : enlacesPublicos}</nav>
        <label for="btnMenu">&#10006;</label>
      </div>
    </div>`;

  const cerrar = document.getElementById("linkCerrarSesion");
  if (cerrar) {
    cerrar.addEventListener("click", (evento) => {
      evento.preventDefault();
      Sesion.cerrar();
      window.location.href = raiz + "index.html";
    });
  }
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
