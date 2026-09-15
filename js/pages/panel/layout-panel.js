/** Cabecera del panel y control de acceso. */

function montarPanel() {
  if (!Sesion.activa()) {
    irALogin();
    return false;
  }

  const usuario = Sesion.usuario();
  if (usuario && usuario.es_creador === false) {
    window.location.href = "../inicio-usuario.html";
    return false;
  }

  const contenedor = document.getElementById("panelLayout");
  contenedor.innerHTML = `
    <header class="panelHeader">
      <h1>Panel administrativo - enSEÑArte</h1>
      <nav>
        <a href="index.html">Cursos</a>
        <a href="../inicio-usuario.html">Volver al sitio</a>
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

/** Escapa texto antes de inyectarlo en el HTML del panel. */
function esc(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
