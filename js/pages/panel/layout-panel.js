/** Cabecera del panel y control de acceso. */

async function montarPanel() {
  // Profesor, CreadorDeCursos o Administrador. Si no, exigirRol redirige.
  const usuario = await exigirRol(ACCESO.PANEL_CONTENIDO);
  if (!usuario) return false;

  const contenedor = document.getElementById("panelLayout");
  // Cada rol ve solo lo suyo: aqui no hay enlace a los cursos del estudiante.
  // Para ver un curso como lo ve el estudiante esta la vista previa (vista-previa.html).
  const enlaceBiblioteca = tieneRol(usuario, ACCESO.BIBLIOTECA)
    ? '<a href="recursos.html">Biblioteca visual</a>'
    : "";
  contenedor.innerHTML = `
    <header class="panelHeader">
      <h1>Panel administrativo - enSEÑArte</h1>
      <nav>
        <a href="index.html">Mis cursos</a>
        ${enlaceBiblioteca}
        <a href="../editar-perfil.html">Mi cuenta</a>
        <a href="#" id="salirPanel">Cerrar sesión</a>
      </nav>
    </header>`;

  if (/\/panel\/(preguntas|diccionario|vista-previa)\.html$/i.test(window.location.pathname)) {
    const main = document.querySelector("main.panelMain");
    if (main && !main.querySelector(".panelBtnPequeno")) {
      const volver = document.createElement("a");
      volver.className = "panelBtn panelBtnPequeno";
      volver.href = "index.html";
      volver.textContent = "Volver";
      main.prepend(volver);
    }
  }

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
