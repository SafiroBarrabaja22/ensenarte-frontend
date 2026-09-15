/** Selector de curso: elige entre diccionario y evaluación. */

(async function iniciar() {
  if (!requiereSesion()) return;

  montarLayout("usuario");

  const slug = new URLSearchParams(window.location.search).get("curso");
  if (!slug) {
    window.location.href = "cursos-usuario.html";
    return;
  }

  try {
    const curso = await api(`/cursos/${slug}/`, { autenticado: false });
    document.getElementById("tituloCurso").textContent = curso.titulo;
    document.getElementById("opcionesCurso").innerHTML = `
      <div class="itemSelectorCursos">
        <figure><img src="${rutaImagen(curso.imagen_diccionario)}" alt="Diccionario"></figure>
        <div class="infoSelectorCurso">
          <h2>Diccionario</h2>
          <p class="descripcionSelectorCurso">${curso.total_palabras} palabras disponibles</p>
          <a href="diccionario.html?curso=${encodeURIComponent(curso.nombre)}">
            <button class="buttonSelector">Entrar al diccionario</button>
          </a>
        </div>
      </div>

      <div class="itemSelectorCursos">
        <figure><img src="${rutaImagen(curso.imagen_evaluacion)}" alt="Evaluación"></figure>
        <div class="infoSelectorCurso">
          <h2>Evaluación</h2>
          <p class="descripcionSelectorCurso">${curso.total_preguntas} preguntas</p>
          <a href="evaluacion.html?curso=${encodeURIComponent(curso.nombre)}">
            <button class="buttonSelector">Entrar a la evaluación</button>
          </a>
        </div>
      </div>`;
  } catch (error) {
    document.getElementById("tituloCurso").textContent = "Curso no encontrado";
    mostrarMensaje("mensaje", error.message);
  }
})();
