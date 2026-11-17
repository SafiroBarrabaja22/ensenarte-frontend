/** CRUD del diccionario de un curso. */

const cursoIdDiccionario = new URLSearchParams(window.location.search).get("curso");

(async function iniciar() {
  if (!(await montarPanel())) return;
  SelectorRecursos.conectar();
  if (!cursoIdDiccionario) {
    window.location.href = "index.html";
    return;
  }

  try {
    const curso = await apiPanel(`/panel/cursos/${cursoIdDiccionario}/`);
    document.getElementById("tituloCurso").textContent = `Diccionario de: ${curso.titulo}`;
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }

  await cargarPalabras();
})();

async function cargarPalabras() {
  const tabla = document.getElementById("tablaPalabras");

  try {
    const palabras = comoLista(
      await apiPanel(`/panel/diccionario/?curso=${cursoIdDiccionario}`)
    );

    if (!palabras.length) {
      tabla.innerHTML = '<tr><td colspan="5" class="vacio">Sin palabras todavía.</td></tr>';
      return;
    }

    tabla.innerHTML = palabras
      .map(
        (palabra) => `
        <tr draggable="true" data-palabra-id="${palabra.id}">
          <td class="asaArrastre" title="Arrastra para reordenar" aria-hidden="true">&#10303;</td>
          <td>${esc(palabra.titulo)}</td>
          <td>${esc(palabra.imagen_frontal)}</td>
          <td>${esc(palabra.video_gif)}</td>
          <td class="panelAcciones">
            <button class="panelBtn" data-editar="${palabra.id}">Editar</button>
            <button class="panelBtn peligro" data-borrar="${palabra.id}">Eliminar</button>
          </td>
        </tr>`
      )
      .join("");

    conectarArrastre(tabla);

    tabla.querySelectorAll("[data-editar]").forEach((boton) => {
      boton.addEventListener("click", () => editarPalabra(palabras.find((p) => String(p.id) === boton.dataset.editar)));
    });

    tabla.querySelectorAll("[data-borrar]").forEach((boton) =>
      boton.addEventListener("click", async () => {
        if (!confirm("¿Eliminar esta palabra?")) return;
        mostrarMensaje("mensaje", "");
        try {
          await apiPanel(`/panel/diccionario/${boton.dataset.borrar}/`, { metodo: "DELETE" });
          await cargarPalabras();
        } catch (error) {
          mostrarMensaje("mensaje", error.message);
        }
      })
    );
  } catch (error) {
    tabla.innerHTML = `<tr><td colspan="5" class="vacio">${esc(error.message)}</td></tr>`;
  }
}

/** Permite reordenar las filas arrastrándolas y guarda el nuevo orden. */
function conectarArrastre(tabla) {
  let filaArrastrada = null;
  let ordenInicial = "";
  const ordenActual = () =>
    [...tabla.querySelectorAll("tr[data-palabra-id]")].map((fila) => Number(fila.dataset.palabraId));

  tabla.querySelectorAll("tr[data-palabra-id]").forEach((fila) => {
    fila.addEventListener("dragstart", (evento) => {
      // Mientras se edita una fila no se arrastra (permite seleccionar texto en los inputs).
      if (tabla.querySelector("[data-guardar]")) {
        evento.preventDefault();
        return;
      }
      filaArrastrada = fila;
      ordenInicial = ordenActual().join();
      fila.classList.add("filaArrastrando");
      evento.dataTransfer.effectAllowed = "move";
      evento.dataTransfer.setData("text/plain", fila.dataset.palabraId);
    });

    fila.addEventListener("dragover", (evento) => {
      if (!filaArrastrada || fila === filaArrastrada) return;
      evento.preventDefault();
      const caja = fila.getBoundingClientRect();
      const despues = evento.clientY > caja.top + caja.height / 2;
      fila.parentNode.insertBefore(filaArrastrada, despues ? fila.nextSibling : fila);
    });

    fila.addEventListener("drop", (evento) => evento.preventDefault());

    fila.addEventListener("dragend", async () => {
      fila.classList.remove("filaArrastrando");
      filaArrastrada = null;
      const ids = ordenActual();
      if (ids.join() === ordenInicial) return;
      await guardarOrden(ids);
    });
  });
}

async function guardarOrden(ids) {
  try {
    await apiPanel("/panel/diccionario/reordenar/", {
      metodo: "POST",
      cuerpo: { curso: Number(cursoIdDiccionario), ids },
    });
    mostrarMensaje("mensaje", "Orden actualizado.", "ok");
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
    await cargarPalabras();
  }
}

function editarPalabra(palabra) {
  if (!palabra) return;
  const fila = document.querySelector(`[data-editar="${palabra.id}"]`)?.closest("tr");
  if (!fila) return;
  fila.draggable = false;
  fila.innerHTML = `
    <td class="asaArrastre" aria-hidden="true"></td>
    <td><input maxlength="100" type="text" data-campo="titulo" value="${esc(palabra.titulo)}" aria-label="Palabra"></td>
    <td><div class="campoSeleccionRecurso"><input maxlength="200" type="text" id="editarImagen-${palabra.id}" data-campo="imagen_frontal" value="${esc(palabra.imagen_frontal)}" aria-label="Imagen frontal"><button class="panelBtn secundario" type="button" data-selector-recurso="editarImagen-${palabra.id}">Buscar</button></div></td>
    <td><div class="campoSeleccionRecurso"><input maxlength="200" type="text" id="editarGif-${palabra.id}" data-campo="video_gif" value="${esc(palabra.video_gif)}" aria-label="GIF de la seña"><button class="panelBtn secundario" type="button" data-selector-recurso="editarGif-${palabra.id}" data-extension="gif">Buscar</button></div></td>
    <td class="panelAcciones"><button class="panelBtn" data-guardar>Guardar</button><button class="panelBtn secundario" data-cancelar>Cancelar</button></td>`;
  fila.querySelector("[data-cancelar]").addEventListener("click", cargarPalabras);
  fila.querySelector("[data-guardar]").addEventListener("click", async () => {
    const cuerpo = Object.fromEntries([...fila.querySelectorAll("[data-campo]")].map((input) => [input.dataset.campo, input.value.trim()]));
    if (Object.values(cuerpo).some((valor) => !valor)) {
      mostrarMensaje("mensaje", "Todos los campos son obligatorios.");
      return;
    }
    try {
      mostrarMensaje("mensaje", "");
      await apiPanel(`/panel/diccionario/${palabra.id}/`, { metodo: "PATCH", cuerpo });
      await cargarPalabras();
    } catch (error) { mostrarMensaje("mensaje", error.message); }
  });
}

document.getElementById("btnCrearPalabra").addEventListener("click", async () => {
  const titulo = document.getElementById("tituloPalabra").value.trim();
  const imagen = document.getElementById("imagenPalabra").value.trim();
  const gif = document.getElementById("gifPalabra").value.trim();

  if (!titulo || !imagen || !gif) {
    mostrarMensaje("mensaje", "Todos los campos son obligatorios.");
    return;
  }

  mostrarMensaje("mensaje", "");
  try {
    await apiPanel("/panel/diccionario/", {
      metodo: "POST",
      cuerpo: {
        curso: Number(cursoIdDiccionario),
        titulo,
        imagen_frontal: imagen,
        video_gif: gif,
      },
    });
    document.getElementById("tituloPalabra").value = "";
    document.getElementById("imagenPalabra").value = "";
    document.getElementById("gifPalabra").value = "";
    await cargarPalabras();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
});
