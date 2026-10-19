/** Evaluacion interactiva. El estado y las respuestas siguen viviendo en el backend. */

const slugCurso = new URLSearchParams(window.location.search).get("curso");
let bloqueado = false;
let respuestaSeleccionada = null;
let respuestaComprobada = false;
let siguienteIntento = null;
let ultimoIntento = null;
let resumenInterfaz = [];
let resultadoFinal = null;

(async function iniciar() {
  if (!requiereSesion()) return;
  montarLayout("usuario");
  if (!slugCurso) {
    window.location.href = "cursos-usuario.html";
    return;
  }

  document.getElementById("btnSalirEvaluacion").addEventListener("click", () => document.getElementById("dialogSalir").showModal());
  document.getElementById("btnSeguir").addEventListener("click", () => document.getElementById("dialogSalir").close());
  document.getElementById("btnConfirmarSalida").addEventListener("click", () => { window.location.href = `curso.html?curso=${encodeURIComponent(slugCurso)}&plantilla=15`; });
  document.getElementById("btnIniciarEvaluacion").addEventListener("click", iniciarIntento);
  document.getElementById("btnComprobar").addEventListener("click", comprobarRespuesta);
  document.addEventListener("keydown", gestionarTeclado);

  try {
    const curso = await api(`/cursos/${slugCurso}/`, { autenticado: false });
    document.getElementById("tituloEvaluacion").textContent = `${nombreCursoParaEvaluacion(curso, slugCurso)} · Evaluación`;
    document.querySelector(".tituloEvaluacionNueva .icon").innerHTML = `<use href="#i-${/abecedario|letra|abc/i.test(`${curso.titulo} ${slugCurso}`) ? "abc" : "books"}"></use>`;
  } catch (error) {
    mostrarMensaje("mensajeInicio", error.message);
  }

  try { resumenInterfaz = JSON.parse(sessionStorage.getItem(`evaluacion-items-${slugCurso}`) || "[]"); } catch { resumenInterfaz = []; }
  try {
    const historial = await ServicioHistorialIntentos.cargar({ curso: slugCurso, tipo: "normal" });
    AttemptHistory.render("#historialIntentos", { tipo: "normal", intentos: historial });
  } catch (error) {
    console.warn("No se pudo cargar el historial de preguntas:", error);
    AttemptHistory.render("#historialIntentos", {
      tipo: "normal",
      intentos: [],
      error: "No se pudo cargar el historial. Comprueba la conexión e inténtalo de nuevo.",
    });
  }
  document.getElementById("btnIniciarEvaluacion").disabled = false;
})();

async function iniciarIntento() {
  const boton = document.getElementById("btnIniciarEvaluacion");
  boton.disabled = true;
  boton.textContent = "Preparando evaluación...";
  try {
    let intento;
    try {
      intento = await api(`/cursos/${slugCurso}/evaluacion/actual/`);
    } catch (error) {
      if (error.status !== 404) throw error;
      resumenInterfaz = [];
      try { sessionStorage.removeItem(`evaluacion-items-${slugCurso}`); } catch {}
      intento = await api(`/cursos/${slugCurso}/evaluacion/iniciar/`, { metodo: "POST" });
    }
    document.getElementById("pantallaInicioPreguntas").hidden = true;
    document.getElementById("pantallaPreguntas").hidden = false;
    pintarPregunta(intento);
  } catch (error) {
    mostrarMensaje("mensajeInicio", error.message);
    boton.disabled = false;
    boton.textContent = "Comenzar evaluación";
  }
}

function pintarPregunta(intento) {
  const pregunta = intento.pregunta;
  if (!pregunta) {
    irAResultado();
    return;
  }
  ultimoIntento = intento;
  respuestaSeleccionada = null;
  respuestaComprobada = false;
  siguienteIntento = null;
  bloqueado = false;

  const porcentaje = Math.round(((intento.actual - 1) / intento.total) * 100);
  document.getElementById("contador").textContent = `Pregunta ${intento.actual} de ${intento.total}`;
  document.getElementById("porcentajeEvaluacion").textContent = `${porcentaje}%`;
  const barra = document.getElementById("barraEvaluacion");
  barra.style.setProperty("--progreso-evaluacion", `${porcentaje}%`);
  barra.classList.remove("visible");
  requestAnimationFrame(() => barra.classList.add("visible"));
  document.getElementById("textoPregunta").textContent = pregunta.texto;
  document.getElementById("contenedorVideo").innerHTML = pregunta.video
    ? `<img src="${esc(rutaVideo(pregunta.video))}" alt="Seña relacionada con la pregunta: ${esc(pregunta.texto)}">`
    : "";
  document.getElementById("contenedorVideo").hidden = !pregunta.video;
  document.getElementById("contenedorOpciones").innerHTML = pregunta.opciones.map((opcion, indice) => `
    <button type="button" class="opcionEvaluacion" data-id="${opcion.id}" aria-pressed="false"><span class="letraOpcion">${String.fromCharCode(65 + indice)}</span><span>${esc(opcion.texto)}</span></button>
  `).join("");
  document.querySelectorAll(".opcionEvaluacion").forEach((boton) => boton.addEventListener("click", () => seleccionarRespuesta(boton)));
  document.getElementById("feedback").textContent = "";
  document.getElementById("mensaje").textContent = "";
  actualizarBoton("Comprobar", "i-check");
}

function seleccionarRespuesta(boton) {
  if (bloqueado || respuestaComprobada) return;
  respuestaSeleccionada = boton.dataset.id;
  document.querySelectorAll(".opcionEvaluacion").forEach((opcion) => {
    const activa = opcion === boton;
    opcion.classList.toggle("seleccionada", activa);
    opcion.setAttribute("aria-pressed", activa);
  });
  document.getElementById("mensaje").textContent = "";
}

async function comprobarRespuesta() {
  if (ultimoIntento?.finalizado && respuestaComprobada) {
    irAResultado();
    return;
  }
  if (respuestaComprobada && siguienteIntento) {
    pintarPregunta(siguienteIntento);
    return;
  }
  if (!respuestaSeleccionada) {
    document.getElementById("mensaje").textContent = "Elige una respuesta primero";
    return;
  }
  if (bloqueado) return;
  bloqueado = true;
  try {
    const respuesta = await api(`/cursos/${slugCurso}/evaluacion/responder/`, { metodo: "POST", cuerpo: { opcion_id: Number(respuestaSeleccionada) } });
    const opcionActual = document.querySelector(`[data-id="${respuestaSeleccionada}"]`);
    if (respuesta.correcta) {
      registrarItemResumen(ultimoIntento?.pregunta, true);
      respuestaComprobada = true;
      opcionActual?.classList.add("correcta");
      document.getElementById("feedback").className = "feedbackEvaluacion correcto";
      document.getElementById("feedback").innerHTML = '<svg class="icon icon16" aria-hidden="true"><use href="#i-check"></use></svg> ¡Muy bien! Respuesta correcta.';
      if (respuesta.finalizado) {
        resultadoFinal = respuesta.resultado || null;
        actualizarBoton("Ver resultado", "i-arrow-right");
        ultimoIntento = { ...ultimoIntento, finalizado: true };
      } else {
        siguienteIntento = respuesta.siguiente;
        actualizarBoton("Siguiente", "i-arrow-right");
      }
    } else {
      registrarItemResumen(ultimoIntento?.pregunta, false);
      bloqueado = false;
      opcionActual?.classList.add("incorrecta");
      document.getElementById("feedback").className = "feedbackEvaluacion incorrecto";
      document.getElementById("feedback").innerHTML = '<svg class="icon icon16" aria-hidden="true"><use href="#i-info-circle"></use></svg> Casi. Inténtalo de nuevo.';
    }
  } catch (error) {
    bloqueado = false;
    mostrarMensaje("mensaje", error.message);
  }
}

function actualizarBoton(texto, icono) {
  document.getElementById("btnComprobar").innerHTML = `<svg class="icon icon16" aria-hidden="true"><use href="#${icono}"></use></svg> ${texto}`;
}

function gestionarTeclado(evento) {
  if (evento.target.matches("input, textarea")) return;
  const indice = ["1", "2", "3", "4", "a", "b", "c", "d"].indexOf(evento.key.toLowerCase());
  if (indice >= 0 && indice < 4) {
    const boton = document.querySelectorAll(".opcionEvaluacion")[indice];
    if (boton) seleccionarRespuesta(boton);
  }
  if (evento.key === "Enter" && document.activeElement?.classList.contains("opcionEvaluacion")) comprobarRespuesta();
}

function irAResultado() {
  try { sessionStorage.setItem(`evaluacion-items-${slugCurso}`, JSON.stringify(resumenInterfaz)); } catch {}
  try {
    if (resultadoFinal) sessionStorage.setItem(`evaluacion-resultado-${slugCurso}`, JSON.stringify(resultadoFinal));
  } catch {}
  window.location.href = `retroalimentacion.html?curso=${encodeURIComponent(slugCurso)}`;
}

function registrarItemResumen(pregunta, correcta) {
  if (!pregunta) return;
  const index = resumenInterfaz.findIndex(item => item.id === pregunta.id);
  const item = { id: pregunta.id, etiqueta: String((index >= 0 ? index : resumenInterfaz.length) + 1), detalle: correcta ? "Correcta" : "Fallo", acierto: correcta, termino: pregunta.texto };
  if (index >= 0) resumenInterfaz[index] = { ...resumenInterfaz[index], ...item, acierto: correcta || resumenInterfaz[index].acierto };
  else resumenInterfaz.push(item);
  try { sessionStorage.setItem(`evaluacion-items-${slugCurso}`, JSON.stringify(resumenInterfaz)); } catch {}
}

function esc(valor) {
  return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
