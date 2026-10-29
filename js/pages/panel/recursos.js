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
let paginaRecursos = 1;
let hayMasRecursos = false;
let cargandoRecursos = false;

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
  document.getElementById("filtroExtension").addEventListener("change", cargarRecursos);
  document.getElementById("filtroCategoria").addEventListener("change", cargarRecursos);
  document.getElementById("btnCargarMasRecursos").addEventListener("click", () => {
    cargarRecursos(true);
  });

  let temporizadorBusqueda;
  document.getElementById("buscarRecursos").addEventListener("input", () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(cargarRecursos, 250);
  });

  await cargarRecursos();
})();

async function cargarRecursos(cargarSiguiente = false) {
  if (cargandoRecursos || (cargarSiguiente && !hayMasRecursos)) return;

  const contenedor = document.getElementById("listaRecursos");
  const botonMas = document.getElementById("btnCargarMasRecursos");
  const paginaSolicitada = cargarSiguiente ? paginaRecursos + 1 : 1;
  const parametros = new URLSearchParams();
  const busqueda = document.getElementById("buscarRecursos").value.trim();
  const extension = document.getElementById("filtroExtension").value;
  const categoria = document.getElementById("filtroCategoria").value;
  if (busqueda) parametros.set("q", busqueda);
  if (extension) parametros.set("extension", extension);
  if (categoria) parametros.set("categoria", categoria);
  parametros.set("page", String(paginaSolicitada));

  cargandoRecursos = true;
  botonMas.disabled = true;
  if (!cargarSiguiente) {
    botonMas.hidden = true;
    contenedor.innerHTML = '<p class="cargando">Cargando recursos...</p>';
  }
  try {
    const query = parametros.toString();
    const respuesta = await api(`/panel/recursos/?${query}`);
    const recursos = comoLista(respuesta);

    if (!recursos.length && !cargarSiguiente) {
      contenedor.innerHTML = '<p class="vacio">No hay imágenes con esos filtros.</p>';
      return;
    }

    const tarjetas = recursos.map(tarjetaRecurso).join("");
    if (cargarSiguiente) {
      contenedor.insertAdjacentHTML("beforeend", tarjetas);
    } else {
      contenedor.innerHTML = tarjetas;
    }
    paginaRecursos = paginaSolicitada;
    hayMasRecursos = Boolean(respuesta && respuesta.next);
    botonMas.hidden = !hayMasRecursos;
    conectarAccionesRecurso();
  } catch (error) {
    if (cargarSiguiente) {
      mostrarMensaje("mensaje", error.message);
    } else {
      contenedor.innerHTML = `<p class="vacio">${escaparHtml(error.message)}</p>`;
    }
  } finally {
    cargandoRecursos = false;
    botonMas.disabled = false;
  }
}

function tarjetaRecurso(recurso) {
  return `
    <article class="recursoVisual">
      <img src="${escaparHtml(rutaImagenOptimizada(recurso.archivo_url, 360))}" alt="${escaparHtml(recurso.nombre)}" loading="lazy" decoding="async">
      <div class="recursoVisualInfo">
        <strong>${escaparHtml(recurso.nombre)}</strong>
        <span>${escaparHtml(recurso.categoria)} · .${escaparHtml(recurso.extension.toUpperCase())}</span>
      </div>
      <div class="panelAcciones">
        <button class="panelBtn secundario botonIcono" type="button" data-renombrar="${recurso.id}" aria-label="Renombrar" title="Renombrar">&#9998;</button>
        <button class="panelBtn peligro botonIcono" type="button" data-eliminar-recurso="${recurso.id}" aria-label="Eliminar" title="Eliminar">&#128465;</button>
      </div>
    </article>`;
}

function conectarAccionesRecurso() {
  document.querySelectorAll("[data-renombrar]").forEach((boton) => {
    if (boton.dataset.accionesConectadas) return;
    boton.dataset.accionesConectadas = "true";
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
    if (boton.dataset.accionesConectadas) return;
    boton.dataset.accionesConectadas = "true";
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
  const formulario = evento.currentTarget;
  const nombre = document.getElementById("nombreRecurso").value.trim();
  const categoria = document.getElementById("categoriaRecurso").value;
  const archivo = document.getElementById("archivoRecurso").files[0];
  const boton = document.getElementById("btnSubirRecurso");

  if (!archivo) {
    mostrarMensaje("mensaje", "Selecciona una imagen.");
    return;
  }

  if (!FORMATO_RECURSO.has(archivo?.name.split(".").pop().toLowerCase())) {
    mostrarMensaje("mensaje", "Selecciona un archivo PNG, GIF, JPG, JPEG o WebP.");
    return;
  }
  if (archivo.size > 10 * 1024 * 1024) {
    mostrarMensaje("mensaje", "El archivo no puede superar 10 MB.");
    return;
  }

  boton.disabled = true;
  mostrarMensaje("mensaje", "");

  try {
    const firma = await api("/panel/recursos/firmar-subida/", {
      metodo: "POST",
      cuerpo: {
        nombre,
        categoria,
        extension: archivo.name.split(".").pop().toLowerCase(),
        tamano: archivo.size,
      },
    });

    const datosCloudinary = new FormData();
    datosCloudinary.append("file", archivo);
    for (const campo of ["api_key", "timestamp", "signature", "folder", "public_id"]) {
      datosCloudinary.append(campo, String(firma[campo]));
    }

    const respuestaCloudinary = await fetch(firma.upload_url, {
      method: "POST",
      body: datosCloudinary,
    });
    const recursoCloudinary = await respuestaCloudinary.json();
    if (!respuestaCloudinary.ok) {
      throw new Error(
        recursoCloudinary.error?.message || "Cloudinary no pudo guardar la imagen."
      );
    }

    await api("/panel/recursos/finalizar-subida/", {
      metodo: "POST",
      cuerpo: { nombre, categoria, public_id: recursoCloudinary.public_id },
    });

    formulario.reset();
    previsualizarRecurso({ currentTarget: document.getElementById("archivoRecurso") });
    mostrarMensaje("mensaje", "Imagen cargada en la biblioteca.", "ok");
    await cargarRecursos();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  } finally {
    boton.disabled = false;
  }
}

function previsualizarRecurso(evento) {
  const archivo = evento.currentTarget.files[0];
  const vista = document.getElementById("previewRecurso");
  const nombreArchivo = document.getElementById("nombreArchivoRecurso");
  const textoPrevisualizacion = document.querySelector(".textoPrevisualizacion");
  const botonLimpiar = document.getElementById("btnLimpiarPreview");
  if (vista.dataset.urlTemporal) URL.revokeObjectURL(vista.dataset.urlTemporal);
  if (!archivo) {
    vista.hidden = true;
    botonLimpiar.hidden = true;
    nombreArchivo.textContent = "Ningún archivo seleccionado";
    textoPrevisualizacion.hidden = false;
    vista.removeAttribute("src");
    delete vista.dataset.urlTemporal;
    return;
  }
  nombreArchivo.textContent = archivo.name;
  vista.dataset.urlTemporal = URL.createObjectURL(archivo);
  vista.src = vista.dataset.urlTemporal;
  vista.hidden = false;
  textoPrevisualizacion.hidden = true;
  botonLimpiar.hidden = false;
}

function limpiarPrevisualizacion() {
  const archivo = document.getElementById("archivoRecurso");
  archivo.value = "";
  previsualizarRecurso({ currentTarget: archivo });
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}