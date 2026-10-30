/** Vista interna del curso: diccionario y evaluación. */

(async function iniciar() {
  if (!requiereSesion()) return;

  montarLayout("usuario");
  asegurarPlantillaCurso();

  const slug = new URLSearchParams(window.location.search).get("curso");
  if (!slug) {
    window.location.href = "cursos-usuario.html";
    return;
  }

  try {
    const curso = await api(`/cursos/${slug}/`, { autenticado: false });
    const progresos = comoLista(await api("/progreso/"));
    const progreso = progresos.find((item) => item.curso === curso.nombre);
    let resultado = null;
    try {
      resultado = await api(`/cursos/${slug}/evaluacion/resultado/`);
    } catch {
      resultado = null;
    }

    document.getElementById("tituloCurso").textContent = curso.titulo;
    document.getElementById("migaCurso").textContent = curso.titulo;
    document.getElementById("descripcionCurso").textContent = curso.descripcion || "Aprende nuevas señas y practica a tu ritmo.";
    document.getElementById("imagenCurso").src = rutaImagen(curso.icono_curso || curso.portada_curso);
    document.getElementById("imagenCurso").alt = `Ilustración del curso ${curso.titulo}`;
    document.getElementById("palabrasCurso").textContent = `${curso.total_palabras || 0} ${plural(curso.total_palabras, "palabra", "palabras")}`;
    document.getElementById("preguntasCurso").textContent = `${curso.total_preguntas || 0} ${plural(curso.total_preguntas, "pregunta", "preguntas")}`;
    actualizarProgreso(progreso);

    const palabras = Number(curso.total_palabras || 0);
    const preguntas = Number(curso.total_preguntas || 0);
    const puntaje = resultado ? `${resultado.aciertos} aciertos` : "sin intentos";
    const slugSeguro = encodeURIComponent(curso.nombre);
    // Solo los cursos multimodales necesitan selector; los demás abren la vista previa común.
    const enlaceEvaluacion = cursoTieneEvaluacionCamara(curso.nombre)
      ? `evaluaciones.html?curso=${slugSeguro}`
      : `evaluacion.html?curso=${slugSeguro}&plantilla=15`;
    document.getElementById("opcionesCurso").innerHTML = `
      <article class="tarjetaAccionCurso" tabindex="0">
        <div class="cabeceraAccionCurso"><span class="iconoAccionCurso iconoDiccionarioCurso" aria-hidden="true">${iconoSvg("book-2", "icon icon26")}</span><span class="pasoCurso pasoUno">Paso 1</span></div>
        <h3>Diccionario</h3>
        ${palabras ? `<p>${palabras} ${plural(palabras, "palabra", "palabras")} disponibles</p>` : `<p class="estadoVacioCurso">${iconoSvg("info-circle", "icon icon16")}Aún no hay palabras disponibles</p>`}
        <a class="botonAccionCurso" href="diccionario.html?curso=${slugSeguro}">${iconoSvg("arrow-right", "icon icon16")}Entrar al diccionario</a>
      </article>
      <article class="tarjetaAccionCurso" tabindex="0">
        <div class="cabeceraAccionCurso"><span class="iconoAccionCurso iconoEvaluacionCurso" aria-hidden="true">${iconoSvg("checklist", "icon icon26")}</span><span class="pasoCurso pasoDos">Paso 2</span></div>
        <h3>Evaluación</h3>
        <p>${iconoSvg("help-circle", "icon icon16")} ${preguntas} ${plural(preguntas, "pregunta", "preguntas")} · Mejor puntaje: ${puntaje}</p>
        <a class="botonAccionCurso" href="${enlaceEvaluacion}">${iconoSvg("play", "icon icon16")}Entrar a la evaluación</a>
      </article>`;
  } catch (error) {
    document.getElementById("tituloCurso").textContent = "Curso no encontrado";
    mostrarMensaje("mensaje", error.message);
  }
})();

function asegurarPlantillaCurso() {
  if (document.querySelector(".bodyCursoNuevo")) return;
  const antiguo = document.querySelector(".bodySelectorCursos");
  if (!antiguo) return;
  const nuevo = document.createElement("main");
  nuevo.className = "bodyCursoNuevo";
  nuevo.innerHTML = `
    <section class="cabeceraCursoNuevo">
      <div class="decoracionCursoCirculo" aria-hidden="true"></div>
      <div class="decoracionCursoCuadrado" aria-hidden="true"></div>
      <div class="migasCurso"><a href="cursos-usuario.html">Cursos</a><span aria-hidden="true">›</span><span id="migaCurso">Curso</span></div>
      <div class="identidadCursoNuevo"><div class="iconoCursoNuevo"><img id="imagenCurso" src="../assets/imagenes/imgPredeterminadaUsuario.png" alt="Ilustración del curso"></div><div><h1 id="tituloCurso">Cargando...</h1><p id="descripcionCurso">Cargando información del curso...</p><div class="chipsCursoNuevo"><span>${iconoSvg("book-2", "icon icon16")}<span id="palabrasCurso">0 palabras</span></span><span>${iconoSvg("help-circle", "icon icon16")}<span id="preguntasCurso">0 preguntas</span></span></div></div></div>
      <div class="progresoCursoNuevo"><span>Tu progreso</span><strong id="textoProgresoCurso">0%</strong><div class="barraProgresoCurso" role="progressbar" aria-label="Progreso del curso" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"><span id="barraProgresoCurso"></span></div></div>
    </section>
    <div id="mensaje"></div>
    <section class="accionesCursoNuevo" aria-labelledby="tituloAccionesCurso"><h2 id="tituloAccionesCurso">¿Por dónde quieres empezar?</h2><div id="opcionesCurso" class="opcionesCursoNuevas"></div></section>
    <a class="volverCursosNuevo" href="cursos-usuario.html">${iconoSvg("arrow-left", "icon icon16")} Volver a cursos</a>`;
  antiguo.replaceWith(nuevo);
  const estilos = document.createElement("link");
  estilos.rel = "stylesheet";
  estilos.href = "../css/style.css?v=15";
  document.head.appendChild(estilos);
}

function actualizarProgreso(progreso) {
  const porcentaje = progreso?.completado ? 100 : progreso ? Math.min(99, Math.max(1, Number(progreso.aciertos || 1) * 10)) : 0;
  const barra = document.getElementById("barraProgresoCurso");
  barra.parentElement.setAttribute("aria-valuenow", porcentaje);
  barra.style.setProperty("--progreso-curso", `${porcentaje}%`);
  document.getElementById("textoProgresoCurso").textContent = `${porcentaje}%`;
  requestAnimationFrame(() => barra.classList.add("visible"));
}

function plural(cantidad, singular, pluralTexto) {
  return Number(cantidad) === 1 ? singular : pluralTexto;
}

function esc(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
