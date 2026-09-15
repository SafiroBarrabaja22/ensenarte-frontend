/**
 * Evaluación.
 * El estado vive en el backend (modelo IntentoEvaluacion); esta página solo
 * pinta la pregunta actual y envía la opción elegida.
 */

const slugCurso = new URLSearchParams(window.location.search).get("curso");
let bloqueado = false;

(async function iniciar() {
  if (!requiereSesion()) return;
  if (!slugCurso) {
    window.location.href = "cursos-usuario.html";
    return;
  }

  document.getElementById("linkSalir").href =
    `curso.html?curso=${encodeURIComponent(slugCurso)}`;

  try {
    const curso = await api(`/cursos/${slugCurso}/`, { autenticado: false });
    document.getElementById("tituloCurso").textContent = curso.titulo;

    // Se retoma el intento abierto si existe; si no, se crea uno nuevo.
    let intento;
    try {
      intento = await api(`/cursos/${slugCurso}/evaluacion/actual/`);
    } catch {
      intento = await api(`/cursos/${slugCurso}/evaluacion/iniciar/`, { metodo: "POST" });
    }
    pintarPregunta(intento);
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
})();

function pintarPregunta(intento) {
  const pregunta = intento.pregunta;
  if (!pregunta) {
    irAResultado();
    return;
  }

  document.getElementById("contador").textContent =
    `Pregunta ${intento.actual} de ${intento.total}`;
  document.getElementById("textoPregunta").textContent = pregunta.texto;

  document.getElementById("contenedorVideo").innerHTML = pregunta.video
    ? `<img src="${rutaVideo(pregunta.video)}" alt="Seña de la pregunta">`
    : "";

  document.getElementById("contenedorOpciones").innerHTML = pregunta.opciones
    .map((op) => `<button class="optionBtn" data-id="${op.id}">${op.texto}</button>`)
    .join("");

  document
    .querySelectorAll(".optionBtn")
    .forEach((boton) => boton.addEventListener("click", () => responder(boton.dataset.id)));

  document.getElementById("feedback").textContent = "";
  bloqueado = false;
}

async function responder(opcionId) {
  if (bloqueado) return;
  bloqueado = true;

  try {
    const respuesta = await api(`/cursos/${slugCurso}/evaluacion/responder/`, {
      metodo: "POST",
      cuerpo: { opcion_id: Number(opcionId) },
    });

    document.getElementById("feedback").textContent = respuesta.mensaje;

    if (respuesta.finalizado) {
      setTimeout(irAResultado, 900);
      return;
    }

    if (respuesta.correcta) {
      // Solo se avanza al acertar, igual que en la versión original.
      setTimeout(() => pintarPregunta(respuesta.siguiente), 700);
    } else {
      bloqueado = false;
    }
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
    bloqueado = false;
  }
}

function irAResultado() {
  window.location.href = `retroalimentacion.html?curso=${encodeURIComponent(slugCurso)}`;
}
