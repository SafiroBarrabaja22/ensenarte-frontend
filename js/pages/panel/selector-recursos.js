const SelectorRecursos = (() => {
  let dialog;
  let campoDestino;
  let extensionForzada = "";
  let categoriaForzada = "recurso";
  let paginaActual = 1;
  let hayMasRecursos = false;
  let cargandoRecursos = false;
  let idBusqueda = 0;
  let temporizadorBusqueda;

  function conectar() {
    document.querySelectorAll("[data-selector-recurso]").forEach((boton) => {
      boton.addEventListener("click", () => abrir(boton));
    });
    crearDialogo();
  }

  function crearDialogo() {
    dialog = document.createElement("dialog");
    dialog.className = "modalRecursos";
    dialog.innerHTML = `
      <div class="modalRecursosHeader">
        <h2>Seleccionar imagen</h2>
        <button class="panelBtn secundario" type="button" data-cerrar-recursos>Cerrar</button>
      </div>
      <div class="modalRecursosFiltros">
        <label for="buscarEnBiblioteca">Buscar por nombre</label>
        <input type="search" id="buscarEnBiblioteca" placeholder="Escribe un nombre">
      </div>
      <div class="selectorRecursosGrid" id="resultadosBiblioteca" aria-live="polite"></div>
      <button class="panelBtn secundario botonCargarMasSelector" id="btnCargarMasSelector" type="button" hidden>Cargar más</button>`;
    document.body.append(dialog);
    dialog.querySelector("[data-cerrar-recursos]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (evento) => {
      if (evento.target === dialog) dialog.close();
    });
    dialog.querySelector("#buscarEnBiblioteca").addEventListener("input", () => {
      clearTimeout(temporizadorBusqueda);
      temporizadorBusqueda = setTimeout(() => buscar(), 250);
    });
    dialog.querySelector("#btnCargarMasSelector").addEventListener("click", () => buscar(true));
    dialog.querySelector("#resultadosBiblioteca").addEventListener("click", (evento) => {
      const boton = evento.target.closest("[data-elegir-recurso]");
      if (boton) elegir(boton.dataset.elegirRecurso);
    });
  }

  function abrir(boton) {
    campoDestino = document.getElementById(boton.dataset.selectorRecurso);
    extensionForzada = boton.dataset.extension || "";
    categoriaForzada = boton.dataset.categoria || "recurso";
    dialog.dataset.categoria = categoriaForzada;
    dialog.querySelector("#buscarEnBiblioteca").value = "";
    dialog.showModal();
    buscar();
  }

  async function buscar(cargarSiguiente = false) {
    if (cargarSiguiente && (cargandoRecursos || !hayMasRecursos)) return;

    const resultados = dialog.querySelector("#resultadosBiblioteca");
    const botonMas = dialog.querySelector("#btnCargarMasSelector");
    const paginaSolicitada = cargarSiguiente ? paginaActual + 1 : 1;
    const busquedaActual = cargarSiguiente ? idBusqueda : ++idBusqueda;
    const parametros = new URLSearchParams();
    const texto = dialog.querySelector("#buscarEnBiblioteca").value.trim();
    const categoriaActiva = dialog.dataset.categoria || categoriaForzada || "recurso";
    if (texto) parametros.set("q", texto);
    if (extensionForzada) parametros.set("extension", extensionForzada);
    parametros.set("categoria", categoriaActiva);
    parametros.set("page", String(paginaSolicitada));

    cargandoRecursos = true;
    botonMas.disabled = true;
    if (!cargarSiguiente) {
      botonMas.hidden = true;
      hayMasRecursos = false;
      resultados.innerHTML = '<p class="cargando">Buscando...</p>';
    } else {
      botonMas.hidden = false;
      botonMas.textContent = "Cargando...";
    }

    try {
      const query = parametros.toString();
      const respuesta = await api(`/panel/recursos/?${query}`);
      if (busquedaActual !== idBusqueda) return;
      const recursos = comoLista(respuesta);
      if (!recursos.length && !cargarSiguiente) {
        resultados.innerHTML = '<p class="vacio">No se encontraron imágenes.</p>';
      } else {
        const opciones = recursos.map(opcionRecurso).join("");
        if (cargarSiguiente) {
          resultados.insertAdjacentHTML("beforeend", opciones);
        } else {
          resultados.innerHTML = opciones;
        }
      }
      paginaActual = paginaSolicitada;
      hayMasRecursos = Boolean(respuesta && respuesta.next);
      botonMas.hidden = !hayMasRecursos;
    } catch (error) {
      if (busquedaActual === idBusqueda) {
        if (cargarSiguiente) {
          resultados.insertAdjacentHTML(
            "beforeend",
            `<p class="vacio">${escaparRecurso(error.message)}</p>`
          );
        } else {
          resultados.innerHTML = `<p class="vacio">${escaparRecurso(error.message)}</p>`;
        }
      }
    } finally {
      if (busquedaActual === idBusqueda) {
        cargandoRecursos = false;
        botonMas.disabled = false;
        botonMas.textContent = "Cargar más";
        botonMas.hidden = !hayMasRecursos;
      }
    }
  }

  function opcionRecurso(recurso) {
    return `
      <button class="opcionRecurso" type="button" data-elegir-recurso="${recurso.id}">
        <img src="${escaparRecurso(rutaImagenOptimizada(recurso.archivo_url, 360))}" alt="" loading="lazy" decoding="async">
        <span>${escaparRecurso(recurso.nombre)}</span>
        <small>.${escaparRecurso(recurso.extension.toUpperCase())}</small>
      </button>`;
  }

  async function elegir(id) {
    try {
      const recurso = await api(`/panel/recursos/${id}/`);
      campoDestino.value = recurso.archivo_url;
      campoDestino.dispatchEvent(new Event("change", { bubbles: true }));
      dialog.close();
    } catch (error) {
      mostrarMensaje("mensaje", error.message);
    }
  }

  return { conectar };
})();

function escaparRecurso(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}