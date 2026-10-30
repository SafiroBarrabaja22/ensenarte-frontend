const FORMATO_RECURSO = new Set([
  "png",
  "gif",
  "jpg",
  "jpeg",
  "jfif",
  "webp",
  "bmp",
  "tif",
  "tiff",
  "avif",
  "heic",
  "heif",
]);

let archivosSeleccionados = [];
// Debe coincidir con PAGE_SIZE del backend.
const RECURSOS_POR_PAGINA = 50;
let paginaRecursos = 1;

(async function iniciarBiblioteca() {
  if (!Sesion.activa()) {
    irALogin();
    return;
  }

  try {
    const usuario = await api("/auth/perfil/");
    Sesion.actualizarUsuario(usuario);
    if (!usuario.es_interprete) {
      window.location.href = "../inicio-usuario.html";
      return;
    }
    document.getElementById("volverSitioRecursos").href =
      usuario.es_creador || usuario.es_profesor
        ? "index.html"
        : "../inicio-usuario.html";
  } catch (error) {
    console.error("No se pudo validar el acceso a la biblioteca.", error);
    return;
  }

  document.getElementById("salirRecursos").addEventListener("click", (evento) => {
    evento.preventDefault();
    Sesion.cerrar();
    window.location.href = "../../index.html";
  });

  document.getElementById("formRecurso").addEventListener("submit", subirRecurso);
  document.getElementById("btnSeleccionarArchivo").addEventListener("click", () => {
    document.getElementById("archivoRecurso").click();
  });
  document.getElementById("archivoRecurso").addEventListener("change", previsualizarRecurso);
  document.getElementById("btnLimpiarPreview").addEventListener("click", limpiarPrevisualizacion);
  // Al cambiar un filtro se vuelve a la primera página.
  document.getElementById("filtroExtension").addEventListener("change", () => cargarRecursos(1));
  document.getElementById("filtroCategoria").addEventListener("change", () => cargarRecursos(1));
  document.getElementById("paginacionRecursos").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-pagina]");
    if (!boton || boton.disabled) return;
    cargarRecursos(Number(boton.dataset.pagina));
    document.getElementById("listaRecursos").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  let temporizadorBusqueda;
  document.getElementById("buscarRecursos").addEventListener("input", () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(() => cargarRecursos(1), 250);
  });

  await cargarRecursos();
})();

async function cargarRecursos(pagina = paginaRecursos) {
  const contenedor = document.getElementById("listaRecursos");
  const parametros = new URLSearchParams({ page: pagina });
  const busqueda = document.getElementById("buscarRecursos").value.trim();
  const extension = document.getElementById("filtroExtension").value;
  const categoria = document.getElementById("filtroCategoria").value;
  if (busqueda) parametros.set("q", busqueda);
  if (extension) parametros.set("extension", extension);
  if (categoria) parametros.set("categoria", categoria);

  contenedor.innerHTML = '<p class="cargando">Cargando recursos...</p>';
  try {
    const datos = await api(`/panel/recursos/?${parametros}`);
    const recursos = comoLista(datos);
    paginaRecursos = pagina;
    pintarPaginacion(pagina, Math.max(1, Math.ceil((datos.count || 0) / RECURSOS_POR_PAGINA)), datos.count || 0);

    if (!recursos.length) {
      contenedor.innerHTML = '<p class="vacio">No hay imágenes con esos filtros.</p>';
      return;
    }

    contenedor.innerHTML = recursos.map(tarjetaRecurso).join("");
    conectarAccionesRecurso();
  } catch (error) {
    // La página dejó de existir (p. ej. se borró el último recurso de la última página).
    if (error.status === 404 && pagina > 1) {
      await cargarRecursos(pagina - 1);
      return;
    }
    pintarPaginacion(1, 1, 0);
    contenedor.innerHTML = `<p class="vacio">${escaparHtml(error.message)}</p>`;
  }
}

function pintarPaginacion(pagina, totalPaginas, totalRecursos) {
  const nav = document.getElementById("paginacionRecursos");
  if (totalPaginas <= 1) {
    nav.hidden = true;
    nav.innerHTML = "";
    return;
  }
  // Primera, última y las vecinas de la actual; el resto se resume con "…".
  const numeros = [];
  for (let n = 1; n <= totalPaginas; n += 1) {
    if (n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1) numeros.push(n);
    else if (numeros[numeros.length - 1] !== "…") numeros.push("…");
  }
  const desde = (pagina - 1) * RECURSOS_POR_PAGINA + 1;
  const hasta = Math.min(pagina * RECURSOS_POR_PAGINA, totalRecursos);
  nav.hidden = false;
  nav.innerHTML = `
    <span class="paginacionInfo">${desde}–${hasta} de ${totalRecursos} imágenes</span>
    <div class="paginacionBotones">
      <button class="panelBtn secundario" type="button" data-pagina="${pagina - 1}" ${pagina === 1 ? "disabled" : ""} aria-label="Página anterior">&lsaquo; Anterior</button>
      ${numeros.map((n) => n === "…"
        ? '<span class="paginacionPuntos">…</span>'
        : `<button class="panelBtn ${n === pagina ? "" : "secundario"}" type="button" data-pagina="${n}" ${n === pagina ? 'aria-current="page"' : ""}>${n}</button>`
      ).join("")}
      <button class="panelBtn secundario" type="button" data-pagina="${pagina + 1}" ${pagina === totalPaginas ? "disabled" : ""} aria-label="Página siguiente">Siguiente &rsaquo;</button>
    </div>`;
}

function tarjetaRecurso(recurso) {
  return `
    <article class="recursoVisual">
      <img src="${escaparHtml(rutaImagen(recurso.archivo_url))}" alt="${escaparHtml(recurso.nombre)}" loading="lazy">
      <div class="recursoVisualInfo">
        <strong>${escaparHtml(recurso.nombre)}</strong>
        <span>${escaparHtml(nombreCategoria(recurso.categoria))} · .${escaparHtml(recurso.extension.toUpperCase())}</span>
      </div>
      <div class="panelAcciones">
        <button class="panelBtn secundario botonIcono" type="button" data-renombrar="${recurso.id}" aria-label="Renombrar" title="Renombrar">&#9998;</button>
        <button class="panelBtn peligro botonIcono" type="button" data-eliminar-recurso="${recurso.id}" aria-label="Eliminar" title="Eliminar">&#128465;</button>
      </div>
    </article>`;
}

function nombreCategoria(categoria) {
  return categoria === "curso_100" ? "Insignia 100%" : categoria === "insignia" ? "Insignia de curso" : categoria === "avatar" ? "Avatar" : "Recurso de curso";
}

function conectarAccionesRecurso() {
  document.querySelectorAll("[data-renombrar]").forEach((boton) => {
    boton.addEventListener("click", async () => {
      const recurso = await obtenerRecurso(boton.dataset.renombrar);
      if (!recurso) return;
      const nombre = prompt("Nuevo nombre del recurso:", recurso.nombre)?.trim();
      if (!nombre || nombre === recurso.nombre) return;

      try {
        await api(`/panel/recursos/${recurso.id}/`, {
          metodo: "PATCH",
          cuerpo: { nombre },
        });
        mostrarMensaje("mensaje", "Nombre actualizado.", "ok");
        await cargarRecursos();
      } catch (error) {
        mostrarMensaje("mensaje", error.message);
      }
    });
  });

  document.querySelectorAll("[data-eliminar-recurso]").forEach((boton) => {
    boton.addEventListener("click", async () => {
      if (!confirm("¿Eliminar esta imagen de la biblioteca?")) return;
      try {
        await api(`/panel/recursos/${boton.dataset.eliminarRecurso}/`, {
          metodo: "DELETE",
        });
        mostrarMensaje("mensaje", "Imagen eliminada.", "ok");
        await cargarRecursos();
      } catch (error) {
        mostrarMensaje("mensaje", error.message);
      }
    });
  });
}

async function obtenerRecurso(id) {
  try {
    return await api(`/panel/recursos/${id}/`);
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
    return null;
  }
}

async function subirRecurso(evento) {
  evento.preventDefault();
  const categoria = document.getElementById("categoriaRecurso").value;
  const boton = document.getElementById("btnSubirRecurso");

  if (!archivosSeleccionados.length) {
    mostrarMensaje("mensaje", "Selecciona al menos una imagen.");
    return;
  }
  const sinNombre = archivosSeleccionados.find((item) => !item.nombre.trim());
  if (sinNombre) {
    mostrarMensaje("mensaje", `Escribe un nombre para "${sinNombre.archivo.name}".`);
    return;
  }

  boton.disabled = true;
  const total = archivosSeleccionados.length;
  const fallidos = [];
  let subidos = 0;

  for (const item of [...archivosSeleccionados]) {
    mostrarMensaje("mensaje", `Subiendo ${subidos + fallidos.length + 1} de ${total}...`, "ok");
    const datos = new FormData();
    datos.append("nombre", item.nombre.trim());
    datos.append("categoria", categoria);
    datos.append("archivo", item.archivo);
    try {
      await api("/panel/recursos/", {
        metodo: "POST",
        cuerpo: datos,
        esFormData: true,
      });
      quitarArchivo(item);
      subidos += 1;
    } catch (error) {
      fallidos.push(`${item.archivo.name}: ${error.message}`);
    }
  }

  boton.disabled = false;
  if (fallidos.length) {
    mostrarMensaje(
      "mensaje",
      `Se subieron ${subidos} de ${total}. No se pudieron subir: ${fallidos.join(" · ")}`
    );
  } else {
    mostrarMensaje(
      "mensaje",
      total === 1 ? "Imagen cargada en la biblioteca." : `${total} imágenes cargadas en la biblioteca.`,
      "ok"
    );
  }
  if (subidos) await cargarRecursos();
}

function previsualizarRecurso(evento) {
  const entrada = evento.currentTarget;
  const rechazados = [];
  Array.from(entrada.files).forEach((archivo) => {
    if (!FORMATO_RECURSO.has(archivo.name.split(".").pop().toLowerCase())) {
      rechazados.push(archivo.name);
      return;
    }
    archivosSeleccionados.push({
      archivo,
      nombre: archivo.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120),
      url: URL.createObjectURL(archivo),
    });
  });
  // Se vacía para poder volver a elegir los mismos archivos y sumar más.
  entrada.value = "";
  mostrarMensaje(
    "mensaje",
    rechazados.length ? `Formato no permitido: ${rechazados.join(", ")}` : ""
  );
  pintarPrevisualizacion();
}

function pintarPrevisualizacion() {
  const lista = document.getElementById("listaPrevisualizacion");
  const cantidad = archivosSeleccionados.length;
  document.getElementById("nombreArchivoRecurso").textContent = cantidad
    ? cantidad === 1 ? "1 imagen seleccionada" : `${cantidad} imágenes seleccionadas`
    : "Ningún archivo seleccionado";
  document.querySelector(".textoPrevisualizacion").hidden = cantidad > 0;
  document.getElementById("btnLimpiarPreview").hidden = cantidad === 0;
  document.getElementById("btnSubirRecurso").textContent =
    cantidad > 1 ? `Subir ${cantidad} imágenes` : "Subir imagen";

  lista.innerHTML = archivosSeleccionados
    .map(
      (item, indice) => `
      <div class="itemPrevisualizacion">
        <img src="${item.url}" alt="Vista previa de ${escaparHtml(item.archivo.name)}">
        <input type="text" maxlength="120" value="${escaparHtml(item.nombre)}" data-nombre-indice="${indice}" aria-label="Nombre para buscar de ${escaparHtml(item.archivo.name)}" placeholder="Nombre para buscar">
        <button class="botonLimpiarPreview" type="button" data-quitar-indice="${indice}" aria-label="Quitar ${escaparHtml(item.archivo.name)}" title="Quitar imagen">&#10005;</button>
      </div>`
    )
    .join("");

  lista.querySelectorAll("[data-nombre-indice]").forEach((campo) => {
    campo.addEventListener("input", () => {
      archivosSeleccionados[campo.dataset.nombreIndice].nombre = campo.value;
    });
  });
  lista.querySelectorAll("[data-quitar-indice]").forEach((boton) => {
    boton.addEventListener("click", () => {
      quitarArchivo(archivosSeleccionados[boton.dataset.quitarIndice]);
    });
  });
}

function quitarArchivo(item) {
  URL.revokeObjectURL(item.url);
  archivosSeleccionados = archivosSeleccionados.filter((otro) => otro !== item);
  pintarPrevisualizacion();
}

function limpiarPrevisualizacion() {
  archivosSeleccionados.forEach((item) => URL.revokeObjectURL(item.url));
  archivosSeleccionados = [];
  document.getElementById("archivoRecurso").value = "";
  pintarPrevisualizacion();
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
