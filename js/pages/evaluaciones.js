/** Selector entre la evaluacion de preguntas y la evaluacion con camara. */

(async function iniciar() {
  if (!requiereSesion()) return;
  montarLayout("usuario");

  const slug = new URLSearchParams(window.location.search).get("curso");
  if (!slug) {
    window.location.href = "cursos-usuario.html";
    return;
  }
  const slugSeguro = encodeURIComponent(slug);
  const enlacePreguntas = `evaluacion.html?curso=${slugSeguro}&plantilla=15`;

  // Los cursos sin evaluacion con camara van directo a la de preguntas.
  if (!cursoTieneEvaluacionCamara(slug)) {
    window.location.replace(enlacePreguntas);
    return;
  }

  document.getElementById("enlaceVolver").href = `curso.html?curso=${slugSeguro}&plantilla=15`;
  document.getElementById("enlaceEvaluacionPreguntas").href = enlacePreguntas;
  document.getElementById("enlaceEvaluacionCamara").href = `evaluacion-camara.html?curso=${slugSeguro}`;

  try {
    const curso = await api(`/cursos/${slug}/`, { autenticado: false });
    document.getElementById("tituloEvaluacion").textContent = `${curso.titulo} · Evaluación`;
  } catch (error) {
    document.getElementById("tituloEvaluacion").textContent = "Evaluación";
    mostrarMensaje("mensaje", error.message);
  }
})();
