/** Dashboard del panel: resumen y CRUD de cursos. */

let cursoEnEdicion = null;

const campos = {
  titulo: "titulo",
  nombre: "nombre",
  portada_curso: "portada",
  icono_curso: "iconoCurso",
  insignia: "insignia",
  insignia_100: "insignia100",
  descripcion: "descripcion",
};

(async function iniciar() {
  if (!(await montarPanel())) return;
  SelectorRecursos.conectar();
  mostrarReportesPlataforma();
  await cargarResumen();
  await cargarCursos();
})().catch(errorInesperado);

/** Solo el Administrador ve (y puede pedir) las estadisticas de la plataforma. */
function mostrarReportesPlataforma() {
  const contenedor = document.getElementById("reportesPlataforma");
  if (!contenedor || !tieneRol(Sesion.usuario(), ACCESO.REPORTE_PLATAFORMA)) return;
  contenedor.innerHTML = `
    <span>Estadísticas de la plataforma:</span>
    <button type="button" class="panelBtn" data-descargar="/reportes/plataforma/?formato=pdf" data-nombre="estadisticas-plataforma.pdf">Descargar PDF</button>
    <button type="button" class="panelBtn secundario" data-descargar="/reportes/plataforma/?formato=xlsx" data-nombre="estadisticas-plataforma.xlsx">Descargar Excel</button>`;
  contenedor.hidden = false;
}

async function cargarResumen() {
  try {
    const datos = await api("/panel/resumen/");
    document.getElementById("resumen").innerHTML = `
      <div class="panelCard"><strong>${datos.total_cursos}</strong><span>Cursos</span></div>
      <div class="panelCard"><strong>${datos.cursos_activos}</strong><span>Cursos activos</span></div>
      <div class="panelCard"><strong>${datos.total_preguntas}</strong><span>Preguntas</span></div>
      <div class="panelCard"><strong>${datos.total_palabras}</strong><span>Palabras</span></div>
      <div class="panelCard"><strong>${datos.total_usuarios}</strong><span>Usuarios</span></div>`;
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
}

async function cargarCursos() {
  const tabla = document.getElementById("tablaCursos");
  try {
    const cursos = comoLista(await api("/panel/cursos/"));

    if (!cursos.length) {
      tabla.innerHTML = '<tr><td colspan="8" class="vacio">No hay cursos todavía.</td></tr>';
      return;
    }

    tabla.innerHTML = cursos
      .map(
        (curso) => `
        <tr>
          <td>${esc(curso.titulo)}</td>
          <td><img class="miniaturaCurso" src="${esc(rutaImagen(curso.portada_curso))}" alt="Portada de ${esc(curso.titulo)}"></td>
          <td>${curso.insignia ? `<img class="miniaturaInsignia" src="${esc(rutaImagen(curso.insignia))}" alt="Insignia de ${esc(curso.titulo)}">` : "-"}</td>
          <td>${curso.insignia_100_url ? `<img class="miniaturaInsignia insigniaMiniatura100" src="${esc(rutaImagen(curso.insignia_100_url))}" alt="Insignia Curso 100% de ${esc(curso.titulo)}">` : "-"}</td>
          <td>${esc(curso.nombre)}</td>
          <td>${curso.activo ? "Sí" : "No"}</td>
          <td>${esc(curso.creado_por) || "-"}</td>
          <td class="panelAcciones">
            <button class="panelBtn" data-editar="${curso.id}">Editar</button>
            <a class="panelBtn" href="preguntas.html?curso=${curso.id}">Preguntas</a>
            <a class="panelBtn" href="diccionario.html?curso=${curso.id}">Diccionario</a>
            <button type="button" class="panelBtn secundario" data-descargar="/reportes/cursos/${curso.id}/progreso/?formato=pdf" data-nombre="progreso-${esc(curso.nombre)}.pdf" title="Progreso de los estudiantes en PDF">Progreso PDF</button>
            <button type="button" class="panelBtn secundario" data-descargar="/reportes/cursos/${curso.id}/progreso/?formato=xlsx" data-nombre="progreso-${esc(curso.nombre)}.xlsx" title="Progreso de los estudiantes en Excel">Excel</button>
            <button class="panelBtn peligro" data-eliminar="${curso.id}">Eliminar</button>
          </td>
        </tr>`
      )
      .join("");

    tabla.querySelectorAll("[data-editar]").forEach((boton) =>
      boton.addEventListener("click", () => editarCurso(cursos, boton.dataset.editar))
    );
    tabla.querySelectorAll("[data-eliminar]").forEach((boton) =>
      boton.addEventListener("click", () => eliminarCurso(boton.dataset.eliminar))
    );
  } catch (error) {
    tabla.innerHTML = `<tr><td colspan="8" class="vacio">${esc(error.message)}</td></tr>`;
  }
}

function editarCurso(cursos, id) {
  const curso = cursos.find((c) => String(c.id) === String(id));
  if (!curso) return;

  cursoEnEdicion = curso.id;
  Object.entries(campos).forEach(([clave, elemento]) => {
    document.getElementById(elemento).value = curso[clave] || "";
  });
  pintarInsignia100(curso.insignia_100, curso.insignia_100_nombre, curso.insignia_100_url);

  document.getElementById("tituloFormulario").textContent = `Editando: ${curso.titulo}`;
  document.getElementById("btnCancelar").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limpiarFormulario() {
  cursoEnEdicion = null;
  Object.values(campos).forEach((elemento) => {
    document.getElementById(elemento).value = "";
  });
  document.getElementById("tituloFormulario").textContent = "Crear curso";
  document.getElementById("btnCancelar").style.display = "none";
  pintarInsignia100(null, "", "");
}

function pintarInsignia100(id, nombre = "", imagen = "") {
  document.getElementById("insignia100").value = id || "";
  document.getElementById("insignia100Seleccionada").textContent = id
    ? `${nombre || "Insignia Curso 100%"} (ID ${id})`
    : "Sin insignia asignada";
  const preview = document.getElementById("previewInsignia100");
  preview.hidden = !imagen;
  if (imagen) preview.src = rutaImagen(imagen);
  else preview.removeAttribute("src");
}

document.getElementById("insignia100").dataset.valorRecurso = "id";
document.getElementById("insignia100").addEventListener("change", async (event) => {
  const id = event.currentTarget.value.trim();
  if (!id) { pintarInsignia100(null); return; }
  try {
    const recurso = await api(`/panel/recursos/${encodeURIComponent(id)}/`);
    pintarInsignia100(recurso.id, recurso.nombre, recurso.archivo_url);
  } catch (error) {
    pintarInsignia100(null);
    mostrarMensaje("mensaje", error.message);
  }
});
document.getElementById("btnQuitarInsignia100").addEventListener("click", () => pintarInsignia100(null));

document.getElementById("btnCancelar").addEventListener("click", limpiarFormulario);

document.getElementById("btnGuardar").addEventListener("click", async () => {
  mostrarMensaje("mensaje", "");

  const cuerpo = {};
  Object.entries(campos).forEach(([clave, elemento]) => {
    cuerpo[clave] = document.getElementById(elemento).value.trim();
  });
  cuerpo.insignia_100 = cuerpo.insignia_100 || null;

  if (!cuerpo.titulo || !cuerpo.nombre) {
    mostrarMensaje("mensaje", "El título y el slug son obligatorios.");
    return;
  }

  try {
    if (cursoEnEdicion) {
      await api(`/panel/cursos/${cursoEnEdicion}/`, { metodo: "PATCH", cuerpo });
      mostrarMensaje("mensaje", "Curso actualizado.", "ok");
    } else {
      await api("/panel/cursos/", { metodo: "POST", cuerpo });
      mostrarMensaje("mensaje", "Curso creado.", "ok");
    }
    limpiarFormulario();
    await cargarResumen();
    await cargarCursos();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
});

async function eliminarCurso(id) {
  if (!confirm("¿Eliminar el curso? Se borran también sus preguntas y palabras.")) return;

  try {
    await api(`/panel/cursos/${id}/`, { metodo: "DELETE" });
    mostrarMensaje("mensaje", "Curso eliminado.", "ok");
    await cargarResumen();
    await cargarCursos();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
}
