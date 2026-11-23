/**
 * Validar señas (rol Validador).
 *
 * Lista los gifs de señas de la biblioteca por estado y permite aprobarlos o
 * rechazarlos con un comentario (POST /panel/recursos/<id>/validar/). Solo el
 * Validador entra; la API vuelve a verificarlo en cada decisión.
 */

// Igual que MAX_COMENTARIO_VALIDACION en ensenarte-backend/config/limites.py.
const MAX_COMENTARIO = 500;
let estadoActivo = "pendiente";

(async function iniciarValidacion() {
  const usuario = await exigirRol(ACCESO.VALIDACION);
  if (!usuario) return;

  document.getElementById("salirValidacion").addEventListener("click", (evento) => {
    evento.preventDefault();
    Sesion.cerrar();
    window.location.href = "../../index.html";
  });

  document.querySelectorAll("[data-estado]").forEach((boton) => {
    boton.addEventListener("click", () => {
      estadoActivo = boton.dataset.estado;
      document.querySelectorAll("[data-estado]").forEach((otro) => {
        const activo = otro === boton;
        otro.classList.toggle("secundario", !activo);
        otro.setAttribute("aria-pressed", String(activo));
      });
      mostrarMensaje("mensaje", "");
      cargarSenas().catch(errorInesperado);
    });
  });

  document.getElementById("listaValidacion").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-decision]");
    if (boton) decidir(boton).catch(errorInesperado);
  });
  document.getElementById("listaValidacion").addEventListener("toggle", (evento) => {
    const detalles = evento.target;
    if (detalles.matches("[data-historial]") && detalles.open) {
      cargarHistorial(detalles).catch(errorInesperado);
    }
  }, true);

  await cargarSenas();
})().catch(errorInesperado);

async function cargarSenas() {
  const contenedor = document.getElementById("listaValidacion");
  contenedor.innerHTML = '<p class="cargando">Cargando señas...</p>';
  const parametros = new URLSearchParams({ categoria: "recurso", extension: "gif", estado: estadoActivo });
  try {
    const senas = comoLista(await api(`/panel/recursos/?${parametros}`));
    if (!senas.length) {
      const vacio = {
        pendiente: "No hay señas por revisar.",
        rechazada: "No hay señas rechazadas.",
        aprobada: "Todavía no hay señas aprobadas.",
      };
      contenedor.innerHTML = `<p class="vacio">${vacio[estadoActivo]}</p>`;
      return;
    }
    contenedor.innerHTML = senas.map(tarjetaSena).join("");
  } catch (error) {
    contenedor.innerHTML = `<p class="vacio">${escaparHtml(error.message)}</p>`;
  }
}

function tarjetaSena(sena) {
  const fecha = new Date(sena.fecha_creacion).toLocaleDateString("es-CO", { dateStyle: "medium" });
  const comentario = sena.comentario_validacion
    ? `<p class="comentarioSena"><strong>Último comentario:</strong> ${escaparHtml(sena.comentario_validacion)}</p>`
    : "";
  return `
    <article class="tarjetaValidacion" data-sena="${sena.id}">
      <img src="${escaparHtml(rutaImagen(sena.archivo_url))}" alt="Seña: ${escaparHtml(sena.nombre)}" loading="lazy">
      <div>
        <strong>${escaparHtml(sena.nombre)}</strong>
        <div class="datosValidacion">
          ${etiquetaEstadoSena(sena.estado_validacion, true)}
          <span>Subida por ${escaparHtml(sena.subido_por || "—")}</span>
          <span>${escaparHtml(fecha)}</span>
        </div>
        ${comentario}
      </div>
      <label for="comentario-${sena.id}">Comentario ${sena.estado_validacion === "pendiente" ? "(obligatorio para rechazar)" : ""}</label>
      <textarea id="comentario-${sena.id}" maxlength="${MAX_COMENTARIO}" placeholder="Ej.: la mano debe quedar a la altura del pecho"></textarea>
      <div class="panelAcciones">
        <button class="panelBtn" type="button" data-decision="aprobar" data-id="${sena.id}">Aprobar</button>
        <button class="panelBtn peligro" type="button" data-decision="rechazar" data-id="${sena.id}">Rechazar</button>
      </div>
      <details data-historial="${sena.id}">
        <summary>Ver historial</summary>
        <ol class="historialSena"><li>Cargando...</li></ol>
      </details>
    </article>`;
}

async function decidir(boton) {
  const id = boton.dataset.id;
  const decision = boton.dataset.decision;
  const comentario = document.getElementById(`comentario-${id}`).value.trim();
  if (decision === "rechazar" && !comentario) {
    mostrarMensaje("mensaje", "Para rechazar una seña escribe qué hay que corregir.");
    document.getElementById(`comentario-${id}`).focus();
    return;
  }

  const botones = document.querySelectorAll(`[data-id="${id}"]`);
  botones.forEach((b) => { b.disabled = true; });
  try {
    const sena = await api(`/panel/recursos/${id}/validar/`, {
      metodo: "POST",
      cuerpo: { decision, comentario },
    });
    mostrarMensaje(
      "mensaje",
      decision === "aprobar" ? `"${sena.nombre}" quedó aprobada.` : `"${sena.nombre}" quedó rechazada.`,
      "ok"
    );
    await cargarSenas();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
    botones.forEach((b) => { b.disabled = false; });
  }
}

async function cargarHistorial(detalles) {
  const lista = detalles.querySelector(".historialSena");
  try {
    const revisiones = await api(`/panel/recursos/${detalles.dataset.historial}/revisiones/`);
    lista.innerHTML = revisiones.length
      ? revisiones.map(itemHistorial).join("")
      : "<li>Sin revisiones todavía.</li>";
  } catch (error) {
    lista.innerHTML = `<li>${escaparHtml(error.message)}</li>`;
  }
}

function itemHistorial(revision) {
  const textos = { aprobada: "Aprobada", rechazada: "Rechazada", reenviada: "Archivo reemplazado" };
  const fecha = new Date(revision.fecha).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
  const comentario = revision.comentario ? `: ${escaparHtml(revision.comentario)}` : "";
  return `<li><strong>${textos[revision.accion] || escaparHtml(revision.accion)}</strong>
    (${escaparHtml(revision.usuario || "—")}, ${escaparHtml(fecha)})${comentario}</li>`;
}
