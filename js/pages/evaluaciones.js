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
  const enlaceCamara = document.getElementById("enlaceEvaluacionCamara");
  let camaraDisponible = Boolean(navigator.mediaDevices?.getUserMedia && navigator.mediaDevices.enumerateDevices);
  if (camaraDisponible) { try { const dispositivos = await navigator.mediaDevices.enumerateDevices(); camaraDisponible = dispositivos.some((dispositivo) => dispositivo.kind === "videoinput"); } catch { camaraDisponible = false; } }
  if (!camaraDisponible) { enlaceCamara.removeAttribute("href"); enlaceCamara.setAttribute("aria-disabled", "true"); document.getElementById("avisoSinCamara").hidden = false; }

  try {
    const curso = await api(`/cursos/${slug}/`, { autenticado: false });
    document.getElementById("tituloEvaluacion").textContent = `${nombreCursoParaEvaluacion(curso, slug)} · Evaluación`;
    document.getElementById("iconoCursoEvaluacion").innerHTML = `<svg class="icon icon20" aria-hidden="true"><use href="#i-${iconoCurso(curso.titulo, slug)}"></use></svg>`;
    document.getElementById("chipPreguntas").innerHTML = `<svg class="icon icon16" aria-hidden="true"><use href="#i-help-circle"></use></svg> ${curso.total_preguntas || 0} ${Number(curso.total_preguntas) === 1 ? "pregunta" : "preguntas"}`;
    document.getElementById("chipLetras").innerHTML = `<svg class="icon icon16" aria-hidden="true"><use href="#i-checklist"></use></svg> 10 letras`;
  } catch (error) {
    document.getElementById("tituloEvaluacion").textContent = `${nombreCursoParaEvaluacion(null, slug)} · Evaluación`;
    mostrarMensaje("mensaje", error.message);
  }
})();

function iconoCurso(titulo, slug) { return /abecedario|letra|abc/i.test(`${titulo || ""} ${slug || ""}`) ? "abc" : "books"; }
