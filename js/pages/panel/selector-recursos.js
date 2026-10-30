const SelectorRecursos = (() => {
  let dialog;
  let campoDestino;
  let extensionForzada = "";
  let categoriaForzada = "recurso";
  const FORMATOS_LOCALES = new Set(["png", "gif", "jpg", "jpeg", "jfif", "webp", "bmp", "tif", "tiff", "avif", "heic", "heif"]);

  function conectar() {
    document.addEventListener("click", (evento) => {
      const boton = evento.target.closest("[data-selector-recurso]");
      if (boton) abrir(boton);
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
      <div class="modalRecursosSubida" id="subidaLocalRecurso">
        <input type="file" id="archivoLocalRecurso" accept="image/*" hidden>
        <button class="panelBtn" type="button" id="btnSubirLocalRecurso">Subir desde mi dispositivo</button>
        <small>Solo se usará aquí; no se guarda en la biblioteca.</small>
        <p class="modalRecursosEstado" id="estadoSubidaLocal" aria-live="polite"></p>
      </div>
      <div class="modalRecursosFiltros">
        <label for="buscarEnBiblioteca">Buscar por nombre</label>
        <input type="search" id="buscarEnBiblioteca" placeholder="Escribe un nombre">
      </div>
      <div class="selectorRecursosGrid" id="resultadosBiblioteca" aria-live="polite"></div>`;
    document.body.append(dialog);
    dialog.querySelector("[data-cerrar-recursos]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (evento) => {
      if (evento.target === dialog) dialog.close();
    });
    dialog.querySelector("#buscarEnBiblioteca").addEventListener("input", buscar);
    const archivoLocal = dialog.querySelector("#archivoLocalRecurso");
    dialog.querySelector("#btnSubirLocalRecurso").addEventListener("click", () => archivoLocal.click());
    archivoLocal.addEventListener("change", subirLocal);
  }

  function abrir(boton) {
    campoDestino = document.getElementById(boton.dataset.selectorRecurso);
    extensionForzada = boton.dataset.extension || "";
    categoriaForzada = boton.dataset.categoria || "recurso";
    dialog.dataset.categoria = categoriaForzada;
    dialog.querySelector("#buscarEnBiblioteca").value = "";
    // Los campos que guardan el id de un recurso necesitan uno de la biblioteca.
    dialog.querySelector("#subidaLocalRecurso").hidden = campoDestino.dataset.valorRecurso === "id";
    dialog.querySelector("#archivoLocalRecurso").accept = extensionForzada ? `.${extensionForzada}` : "image/*";
    dialog.querySelector("#estadoSubidaLocal").textContent = "";
    dialog.showModal();
    buscar();
  }

  async function buscar() {
    const resultados = dialog.querySelector("#resultadosBiblioteca");
    const parametros = new URLSearchParams();
    const texto = dialog.querySelector("#buscarEnBiblioteca").value.trim();
    const categoriaActiva = dialog.dataset.categoria || categoriaForzada || "recurso";
    if (texto) parametros.set("q", texto);
    if (extensionForzada) parametros.set("extension", extensionForzada);
    parametros.set("categoria", categoriaActiva);
    resultados.innerHTML = '<p class="cargando">Buscando...</p>';

    try {
      const query = parametros.toString();
      const recursos = comoLista(
        await api(`/panel/recursos/${query ? `?${query}` : ""}`)
      );
      resultados.innerHTML = recursos.length
        ? recursos.map(opcionRecurso).join("")
        : '<p class="vacio">No se encontraron imágenes.</p>';
      resultados.querySelectorAll("[data-elegir-recurso]").forEach((boton) => {
        boton.addEventListener("click", () => elegir(boton.dataset.elegirRecurso));
      });
    } catch (error) {
      resultados.innerHTML = `<p class="vacio">${escaparRecurso(error.message)}</p>`;
    }
  }

  function opcionRecurso(recurso) {
    return `
      <button class="opcionRecurso" type="button" data-elegir-recurso="${recurso.id}">
        <img src="${escaparRecurso(rutaImagen(recurso.archivo_url))}" alt="" loading="lazy">
        <span>${escaparRecurso(recurso.nombre)}</span>
        <small>.${escaparRecurso(recurso.extension.toUpperCase())}</small>
      </button>`;
  }

  async function elegir(id) {
    try {
      const recurso = await api(`/panel/recursos/${id}/`);
      campoDestino.value = campoDestino.dataset.valorRecurso === "id"
        ? String(recurso.id)
        : recurso.archivo_url;
      campoDestino.dispatchEvent(new Event("change", { bubbles: true }));
      dialog.close();
    } catch (error) {
      mostrarMensaje("mensaje", error.message);
    }
  }

  async function subirLocal(evento) {
    const input = evento.currentTarget;
    const archivo = input.files[0];
    const estado = dialog.querySelector("#estadoSubidaLocal");
    const boton = dialog.querySelector("#btnSubirLocalRecurso");
    if (!archivo) return;

    const extension = archivo.name.split(".").pop().toLowerCase();
    if (extensionForzada ? extension !== extensionForzada : !FORMATOS_LOCALES.has(extension)) {
      estado.textContent = extensionForzada
        ? `Selecciona un archivo .${extensionForzada.toUpperCase()}.`
        : "Selecciona una imagen válida (PNG, JPG, GIF, WebP...).";
      input.value = "";
      return;
    }

    const datos = new FormData();
    datos.append("archivo", archivo);
    boton.disabled = true;
    estado.textContent = "Subiendo...";
    try {
      const respuesta = await api("/panel/archivos/", {
        metodo: "POST",
        cuerpo: datos,
        esFormData: true,
      });
      campoDestino.value = respuesta.archivo_url;
      campoDestino.dispatchEvent(new Event("change", { bubbles: true }));
      dialog.close();
    } catch (error) {
      estado.textContent = error.message;
    } finally {
      boton.disabled = false;
      input.value = "";
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
