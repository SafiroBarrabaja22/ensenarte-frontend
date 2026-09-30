const FORMATO_RECURSO = new Set(["png", "gif", "jpg", "jpeg", "webp"]);

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
  document.getElementById("archivoRecurso").addEventListener("change", (evento) => {
    previsualizarRecurso(evento);
    document.getElementById("nombreArchivoRecurso").textContent =
      evento.currentTarget.files[0]?.name || "Ningún archivo seleccionado";
  });
  document.getElementById("filtroExtension").addEventListener("change", cargarRecursos);

  let temporizadorBusqueda;
  document.getElementById("buscarRecursos").addEventListener("input", () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(cargarRecursos, 250);
  });

  await cargarRecursos();
})();

async function cargarRecursos() {
  const contenedor = document.getElementById("listaRecursos");
  const parametros = new URLSearchParams();
  const busqueda = document.getElementById("buscarRecursos").value.trim();
  const extension = document.getElementById("filtroExtension").value;
  if (busqueda) parametros.set("q", busqueda);
  if (extension) parametros.set("extension", extension);

  contenedor.innerHTML = '<p class="cargando">Cargando recursos...</p>';
  try {
    const query = parametros.toString();
    const recursos = comoLista(
      await api(`/panel/recursos/${query ? `?${query}` : ""}`)
    );

    if (!recursos.length) {
      contenedor.innerHTML = '<p class="vacio">No hay imágenes con esos filtros.</p>';
      return;
    }

    contenedor.innerHTML = recursos.map(tarjetaRecurso).join("");
    conectarAccionesRecurso();
  } catch (error) {
    contenedor.innerHTML = `<p class="vacio">${escaparHtml(error.message)}</p>`;
  }
}

function tarjetaRecurso(recurso) {
  return `
    <article class="recursoVisual">
      <img src="${escaparHtml(rutaImagen(recurso.archivo_url))}" alt="${escaparHtml(recurso.nombre)}">
      <div class="recursoVisualInfo">
        <strong>${escaparHtml(recurso.nombre)}</strong>
        <span>.${escaparHtml(recurso.extension.toUpperCase())}</span>
      </div>
      <div class="panelAcciones">
        <button class="panelBtn iconoAccion secundario" type="button" title="Renombrar recurso" aria-label="Renombrar recurso" data-renombrar="${recurso.id}">&#9998;</button>
        <button class="panelBtn iconoAccion peligro" type="button" title="Eliminar recurso" aria-label="Eliminar recurso" data-eliminar-recurso="${recurso.id}">&#128465;</button>
      </div>
    </article>`;
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
  const formulario = evento.currentTarget;
  const nombre = document.getElementById("nombreRecurso").value.trim();
  const archivo = document.getElementById("archivoRecurso").files[0];
  const boton = document.getElementById("btnSubirRecurso");

  if (!FORMATO_RECURSO.has(archivo?.name.split(".").pop().toLowerCase())) {
    mostrarMensaje("mensaje", "Selecciona un archivo PNG, GIF, JPG, JPEG o WebP.");
    return;
  }

  const datos = new FormData();
  datos.append("nombre", nombre);
  datos.append("archivo", archivo);
  boton.disabled = true;
  mostrarMensaje("mensaje", "");

  try {
    await api("/panel/recursos/", {
      metodo: "POST",
      cuerpo: datos,
      esFormData: true,
    });
    formulario.reset();
    document.getElementById("nombreArchivoRecurso").textContent = "Ningún archivo seleccionado";
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
  if (vista.dataset.urlTemporal) URL.revokeObjectURL(vista.dataset.urlTemporal);
  if (!archivo) {
    vista.hidden = true;
    vista.removeAttribute("src");
    delete vista.dataset.urlTemporal;
    return;
  }
  vista.dataset.urlTemporal = URL.createObjectURL(archivo);
  vista.src = vista.dataset.urlTemporal;
  vista.hidden = false;
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}