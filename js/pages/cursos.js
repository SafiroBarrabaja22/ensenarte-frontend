/** Catálogo de cursos. Sirve para la vista pública y la de usuario. */

const esVistaUsuario = window.location.pathname.includes("cursos-usuario");

(async function iniciar() {
  if (esVistaUsuario && !requiereSesion()) return;

  montarLayout(Sesion.activa() ? "usuario" : "publico");
  montarFooter();

  const contenedor = document.getElementById("listaCursos");

  try {
    const cursos = comoLista(await api("/cursos/", { autenticado: false }));

    if (!cursos.length) {
      contenedor.innerHTML = '<p class="vacio">Todavía no hay cursos publicados.</p>';
      return;
    }

    contenedor.innerHTML = cursos.map(tarjetaCurso).join("");
  } catch (error) {
    contenedor.innerHTML = "";
    mostrarMensaje("mensaje", `No se pudieron cargar los cursos: ${error.message}`);
  }
})();

function tarjetaCurso(curso) {
  const destino = Sesion.activa()
    ? `curso.html?curso=${encodeURIComponent(curso.nombre)}`
    : "login.html";

  return `
    <div class="itemCursos">
      <figure>
        <img class="imgCursos" src="${rutaImagen(curso.portada_curso)}" alt="${curso.titulo}">
      </figure>
      <div class="infoCurso">
        <h2>${curso.titulo}</h2>
        ${curso.descripcion ? `<p class="descripcionCurso">${curso.descripcion}</p>` : ""}
        <a href="${destino}">Entrar al curso</a>
      </div>
    </div>`;
}
