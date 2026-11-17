/** Selector entre evaluacion de preguntas y evaluacion con camara. */
(async function iniciar() {
  if (!(await exigirRol(ACCESO.APRENDIZAJE))) return;
  montarLayout("usuario");
  const slug = new URLSearchParams(location.search).get("curso");
  if (!slug) { location.href = "cursos-usuario.html"; return; }
  const slugSeguro = encodeURIComponent(slug);
  document.getElementById("enlaceVolver").href = `curso.html?curso=${slugSeguro}&plantilla=15`;
  document.getElementById("enlaceEvaluacionPreguntas").href = `evaluacion.html?curso=${slugSeguro}&plantilla=15`;
  const enlaceCamara = document.getElementById("enlaceEvaluacionCamara");
  const tieneCamara = cursoTieneEvaluacionCamara(slug);
  if (!tieneCamara) {
    enlaceCamara.hidden = true;
  } else {
    enlaceCamara.href = `evaluacion-camara.html?curso=${slugSeguro}`;
  }
  try {
    const curso = await api(`/cursos/${slug}/`, { autenticado: false });
    document.getElementById("tituloEvaluacion").textContent = `${nombreCursoParaEvaluacion(curso, slug)} · Evaluación`;
    document.getElementById("iconoCursoEvaluacion").innerHTML = `<svg class="icon icon20" aria-hidden="true"><use href="#i-${iconoCurso(curso.titulo, slug)}"></use></svg>`;
    document.getElementById("chipPreguntas").textContent = `${curso.total_preguntas || 0} ${Number(curso.total_preguntas) === 1 ? "pregunta" : "preguntas"}`;
  } catch (error) { mostrarMensaje("mensaje", error.message); }
  if (tieneCamara) {
    let disponible = Boolean(navigator.mediaDevices?.getUserMedia && navigator.mediaDevices.enumerateDevices);
    if (disponible) { try { disponible = (await navigator.mediaDevices.enumerateDevices()).some(d => d.kind === "videoinput"); } catch { disponible = false; } }
    if (!disponible) { enlaceCamara.removeAttribute("href"); enlaceCamara.setAttribute("aria-disabled", "true"); document.getElementById("avisoSinCamara").hidden = false; }
  }
})().catch(errorInesperado);

function iconoCurso(titulo, slug) { return /abecedario|letra|abc/i.test(`${titulo || ""} ${slug || ""}`) ? "abc" : "books"; }
