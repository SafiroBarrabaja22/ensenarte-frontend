/** CRUD de preguntas y sus opciones (máximo 4, una sola correcta). */

const cursoId = new URLSearchParams(window.location.search).get("curso");

(async function iniciar() {
  if (!(await montarPanel())) return;
  SelectorRecursos.conectar();
  if (!cursoId) {
    window.location.href = "index.html";
    return;
  }

  try {
    const curso = await apiPanel(`/panel/cursos/${cursoId}/`);
    document.getElementById("tituloCurso").textContent = `Preguntas de: ${curso.titulo}`;
    document.getElementById("limitePreguntas").value = curso.preguntas_por_evaluacion || "";
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }

  document.getElementById("btnGuardarLimite").addEventListener("click", guardarLimitePreguntas);
  await cargarPreguntas();
})();

async function guardarLimitePreguntas() {
  const campo = document.getElementById("limitePreguntas");
  const valor = campo.value.trim();
  const limite = valor ? Number(valor) : null;
  if (limite !== null && (!Number.isInteger(limite) || limite < 1)) {
    mostrarMensaje("mensaje", "La cantidad de preguntas debe ser un número entero mayor que 0.");
    return;
  }
  try {
    await apiPanel(`/panel/cursos/${cursoId}/`, {
      metodo: "PATCH",
      cuerpo: { preguntas_por_evaluacion: limite },
    });
    mostrarMensaje(
      "mensaje",
      limite ? `Cada intento mostrará ${limite} preguntas al azar.` : "Cada intento mostrará todas las preguntas.",
      "ok"
    );
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
}

function actualizarAyudaLimite(totalPreguntas) {
  document.getElementById("limitePreguntas").max = totalPreguntas || "";
  document.getElementById("ayudaLimitePreguntas").textContent =
    `El curso tiene ${totalPreguntas} ${totalPreguntas === 1 ? "pregunta" : "preguntas"}. ` +
    "Déjalo vacío para que salgan todas. Las preguntas se eligen al azar en cada intento.";
}

async function cargarPreguntas() {
  const contenedor = document.getElementById("listaPreguntas");

  try {
    const preguntas = comoLista(await apiPanel(`/panel/preguntas/?curso=${cursoId}`));
    actualizarAyudaLimite(preguntas.length);

    if (!preguntas.length) {
      contenedor.innerHTML = '<p class="vacio">Este curso todavía no tiene preguntas.</p>';
      return;
    }

    contenedor.innerHTML = preguntas.map(bloquePregunta).join("");
    conectarEventos();
  } catch (error) {
    contenedor.innerHTML = `<p class="vacio">${esc(error.message)}</p>`;
  }
}

function bloquePregunta(pregunta) {
  const opciones = pregunta.opciones
    .map(
      (opcion) => `
      <tr>
        <td>${esc(opcion.texto)}</td>
        <td>${opcion.es_correcta ? "Correcta" : "Incorrecta"}</td>
        <td class="panelAcciones">
          <button class="panelBtn" data-correcta="${opcion.id}">Marcar correcta</button>
          <button class="panelBtn peligro" data-borrar-opcion="${opcion.id}">Eliminar</button>
        </td>
      </tr>`
    )
    .join("");

  const puedeAgregar = pregunta.opciones.length < 4;

  return `
    <div class="panelSeccion">
      <table class="panelTabla">
        <thead>
          <tr>
            <th colspan="3">
              <span>${esc(pregunta.texto)}</span>
              <button class="panelBtn" style="float:right" data-editar-pregunta="${pregunta.id}">Editar pregunta</button>
              <button class="panelBtn peligro" style="float:right" data-borrar-pregunta="${pregunta.id}">Eliminar pregunta</button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr data-edicion-pregunta="${pregunta.id}" hidden>
            <td colspan="3">
              <div class="panelForm">
                <div><label>Enunciado</label><input type="text" data-texto-pregunta value="${esc(pregunta.texto)}"></div>
                <div>
                  <label for="videoPregunta-${pregunta.id}">GIF de la seña</label>
                  <div class="campoSeleccionRecurso">
                    <input type="text" id="videoPregunta-${pregunta.id}" data-video-pregunta value="${esc(pregunta.video || "")}" placeholder="abecedario/a.gif">
                    <button class="panelBtn secundario" type="button" data-selector-recurso="videoPregunta-${pregunta.id}" data-extension="gif">Buscar GIF</button>
                  </div>
                </div>
                <div class="panelAcciones"><button class="panelBtn" data-guardar-pregunta="${pregunta.id}">Guardar cambios</button><button class="panelBtn secundario" data-cancelar-pregunta="${pregunta.id}">Cancelar</button></div>
              </div>
            </td>
          </tr>
          ${opciones || '<tr><td colspan="3" class="vacio">Sin opciones.</td></tr>'}
          <tr>
            <td colspan="3">
              <div class="panelAcciones">
                <input type="text" id="nuevaOpcion-${pregunta.id}" placeholder="Texto de la opción"
                       ${puedeAgregar ? "" : "disabled"}>
                <label>
                  <input type="checkbox" id="nuevaCorrecta-${pregunta.id}" ${puedeAgregar ? "" : "disabled"}>
                  Es la correcta
                </label>
                <button class="panelBtn" data-agregar-opcion="${pregunta.id}" ${puedeAgregar ? "" : "disabled"}>
                  ${puedeAgregar ? "Agregar opción" : "Límite de 4 opciones"}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function conectarEventos() {
  document.querySelectorAll("[data-editar-pregunta]").forEach((boton) => boton.addEventListener("click", () => {
    document.querySelector(`[data-edicion-pregunta="${boton.dataset.editarPregunta}"]`).hidden = false;
  }));
  document.querySelectorAll("[data-cancelar-pregunta]").forEach((boton) => boton.addEventListener("click", () => cargarPreguntas()));
  document.querySelectorAll("[data-guardar-pregunta]").forEach((boton) => boton.addEventListener("click", async () => {
    const id = boton.dataset.guardarPregunta;
    const fila = document.querySelector(`[data-edicion-pregunta="${id}"]`);
    const texto = fila.querySelector("[data-texto-pregunta]").value.trim();
    const video = fila.querySelector("[data-video-pregunta]").value.trim();
    if (!texto) { mostrarMensaje("mensaje", "El enunciado es obligatorio."); return; }
    await ejecutar(() => apiPanel(`/panel/preguntas/${id}/`, { metodo: "PATCH", cuerpo: { texto, video } }));
  }));

  document.querySelectorAll("[data-borrar-pregunta]").forEach((boton) =>
    boton.addEventListener("click", async () => {
      if (!confirm("¿Eliminar esta pregunta y sus opciones?")) return;
      await ejecutar(() =>
        apiPanel(`/panel/preguntas/${boton.dataset.borrarPregunta}/`, { metodo: "DELETE" })
      );
    })
  );

  document.querySelectorAll("[data-borrar-opcion]").forEach((boton) =>
    boton.addEventListener("click", async () => {
      await ejecutar(() =>
        apiPanel(`/panel/opciones/${boton.dataset.borrarOpcion}/`, { metodo: "DELETE" })
      );
    })
  );

  document.querySelectorAll("[data-correcta]").forEach((boton) =>
    boton.addEventListener("click", async () => {
      await ejecutar(() =>
        apiPanel(`/panel/opciones/${boton.dataset.correcta}/`, {
          metodo: "PATCH",
          cuerpo: { es_correcta: true },
        })
      );
    })
  );

  document.querySelectorAll("[data-agregar-opcion]").forEach((boton) =>
    boton.addEventListener("click", async () => {
      const id = boton.dataset.agregarOpcion;
      const texto = document.getElementById(`nuevaOpcion-${id}`).value.trim();
      const esCorrecta = document.getElementById(`nuevaCorrecta-${id}`).checked;

      if (!texto) {
        mostrarMensaje("mensaje", "Escribe el texto de la opción.");
        return;
      }

      await ejecutar(() =>
        apiPanel("/panel/opciones/", {
          metodo: "POST",
          cuerpo: { pregunta: Number(id), texto, es_correcta: esCorrecta },
        })
      );
    })
  );
}

async function ejecutar(accion) {
  mostrarMensaje("mensaje", "");
  try {
    await accion();
    await cargarPreguntas();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
}

document.getElementById("btnCrearPregunta").addEventListener("click", async () => {
  const texto = document.getElementById("textoPregunta").value.trim();
  const video = document.getElementById("videoPregunta").value.trim();

  if (!texto) {
    mostrarMensaje("mensaje", "El enunciado es obligatorio.");
    return;
  }

  mostrarMensaje("mensaje", "");
  try {
    await apiPanel("/panel/preguntas/", {
      metodo: "POST",
      cuerpo: { curso: Number(cursoId), texto, video },
    });
    document.getElementById("textoPregunta").value = "";
    document.getElementById("videoPregunta").value = "";
    await cargarPreguntas();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
});
