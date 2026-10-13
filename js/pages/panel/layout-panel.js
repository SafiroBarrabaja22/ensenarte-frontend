/** Cabecera del panel y control de acceso. */

async function montarPanel() {
  if (!Sesion.activa()) {
    irALogin();
    return false;
  }

  let usuario = Sesion.usuario();
  if (!usuario || (!usuario.es_creador && !usuario.es_profesor)) {
    try {
      usuario = await apiPanel("/auth/perfil/");
      Sesion.actualizarUsuario(usuario);
    } catch (error) {
      console.error("No se pudo validar el acceso al panel.", error);
      mostrarErrorCargaPanel("No se pudo validar el acceso al panel: " + (error.message || "Error de conexión."));
      return false;
    }
  }

  if (usuario && !usuario.es_creador && !usuario.es_profesor) {
    window.location.href = "../inicio-usuario.html";
    return false;
  }

  const contenedor = document.getElementById("panelLayout");
  const enlaceBiblioteca = usuario.es_interprete
    ? '<a href="recursos.html">Biblioteca visual</a>'
    : "";
  contenedor.innerHTML = `
    <header class="panelHeader">
      <h1>Panel administrativo - enSEÑArte</h1>
      <nav>
        <a href="../cursos-usuario.html">Cursos</a>
        ${enlaceBiblioteca}
        <a href="#" id="salirPanel">Cerrar sesión</a>
      </nav>
    </header>`;

  document.getElementById("salirPanel").addEventListener("click", (evento) => {
    evento.preventDefault();
    Sesion.cerrar();
    window.location.href = "../../index.html";
  });

  return true;
}

function apiPanel(ruta, opciones = {}) {
  let temporizador;
  const demora = new Promise((_, rechazar) => { temporizador = setTimeout(() => rechazar(new Error("El servidor tardó demasiado en responder.")), 12000); });
  return Promise.race([api(ruta, opciones), demora]).finally(() => clearTimeout(temporizador));
}

function mostrarErrorCargaPanel(texto) {
  const mensaje = document.getElementById("mensaje");
  if (mensaje) { mensaje.textContent = texto; mensaje.className = "mensajeError"; }
  document.querySelectorAll(".cargando").forEach((elemento) => { elemento.textContent = texto; });
}

/** Escapa texto antes de inyectarlo en el HTML del panel. */
function esc(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
