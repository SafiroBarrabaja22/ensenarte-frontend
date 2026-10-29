/** Dashboard del panel: resumen y CRUD de cursos. */

let cursoEnEdicion = null;

const campos = {
  titulo: "titulo",
  nombre: "nombre",
  portada_curso: "portada",
  imagen_diccionario: "imgDiccionario",
  imagen_evaluacion: "imgEvaluacion",
  insignia: "insignia",
  descripcion: "descripcion",
};

(async function iniciar() {
  if (!(await montarPanel())) return;
  SelectorRecursos.conectar();
  await cargarResumen();
  await cargarCursos();
})();

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
      tabla.innerHTML = '<tr><td colspan="7" class="vacio">No hay cursos todavía.</td></tr>';
      return;
    }

    tabla.innerHTML = cursos
      .map(
        (curso) => `
        <tr>
          <td>${esc(curso.titulo)}</td>
          <td><img class="miniaturaCurso" src="${esc(rutaImagenOptimizada(curso.portada_curso, 360))}" alt="Portada de ${esc(curso.titulo)}" loading="lazy" decoding="async"></td>
          <td>${curso.insignia ? `<img class="miniaturaInsignia" src="${esc(rutaImagenOptimizada(curso.insignia, 180))}" alt="Insignia de ${esc(curso.titulo)}" loading="lazy" decoding="async">` : "-"}</td>
          <td>${esc(curso.nombre)}</td>
          <td>${curso.activo ? "Sí" : "No"}</td>
          <td>${esc(curso.creado_por) || "-"}</td>
          <td class="panelAcciones">
            <button class="panelBtn" data-editar="${curso.id}">Editar</button>
            <a class="panelBtn" href="preguntas.html?curso=${curso.id}">Preguntas</a>
            <a class="panelBtn" href="diccionario.html?curso=${curso.id}">Diccionario</a>
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
    tabla.innerHTML = `<tr><td colspan="7" class="vacio">${esc(error.message)}</td></tr>`;
  }
}

function editarCurso(cursos, id) {
  const curso = cursos.find((c) => String(c.id) === String(id));
  if (!curso) return;

  cursoEnEdicion = curso.id;
  Object.entries(campos).forEach(([clave, elemento]) => {
    document.getElementById(elemento).value = curso[clave] || "";
  });

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
}

document.getElementById("btnCancelar").addEventListener("click", limpiarFormulario);

document.getElementById("btnGuardar").addEventListener("click", async () => {
  mostrarMensaje("mensaje", "");

  const cuerpo = {};
  Object.entries(campos).forEach(([clave, elemento]) => {
    cuerpo[clave] = document.getElementById(elemento).value.trim();
  });

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
