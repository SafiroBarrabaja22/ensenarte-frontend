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
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }

  await cargarPreguntas();
})();

async function cargarPreguntas() {
  const contenedor = document.getElementById("listaPreguntas");

  try {
    const preguntas = comoLista(await apiPanel(`/panel/preguntas/?curso=${cursoId}`));

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
              ${esc(pregunta.texto)}
              <button class="panelBtn peligro" style="float:right" data-borrar-pregunta="${pregunta.id}">Eliminar pregunta</button>
            </th>
          </tr>
        </thead>
        <tbody>
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
