import { renderResultados } from "../lib/resultados.js?v=5";

const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

(async function iniciar() {
  if (!requiereSesion()) return;
  montarLayout("usuario");
  const slug = new URLSearchParams(window.location.search).get("curso");
  if (!slug) { window.location.href = "cursos-usuario.html"; return; }
  try {
    const [resultado, curso] = await Promise.all([api(`/cursos/${slug}/evaluacion/resultado/`), api(`/cursos/${slug}/`, { autenticado: false })]);
    let resultadoReciente = null;
    try {
      const guardado = sessionStorage.getItem(`evaluacion-resultado-${slug}`);
      if (guardado) resultadoReciente = JSON.parse(guardado);
      sessionStorage.removeItem(`evaluacion-resultado-${slug}`);
    } catch {}
    const datosResultado = resultadoReciente || resultado;
    const total = Number(datosResultado.total || curso.total_preguntas || Number(datosResultado.aciertos) + Number(datosResultado.errores) || 1);
    const correctas = Number(datosResultado.aciertos), porcentaje = Number(datosResultado.porcentaje ?? Math.round(correctas * 100 / total));
    let historial = [];
    try { historial = JSON.parse(sessionStorage.getItem(`evaluacion-items-${slug}`) || "[]"); } catch {}
    const detalleServidor = Array.isArray(datosResultado.detalle_preguntas) ? datosResultado.detalle_preguntas : [];
    const items = detalleServidor.length === total
      ? detalleServidor.map((x, i) => ({ etiqueta: String(x.etiqueta || i + 1), acierto: Boolean(x.acierto), detalle: x.detalle || (x.acierto ? "Correcta" : "Incorrecta"), termino: x.texto, pregunta: Array.isArray(x.opciones) ? { texto: x.texto, video: x.video, opciones: x.opciones, elegidas: x.elegidas || [] } : null }))
      : historial.length === total
        ? historial.map((x, i) => ({ etiqueta: String(i + 1), acierto: Boolean(x.acierto), detalle: x.acierto ? "Correcta" : "Incorrecta", termino: x.termino }))
        : Array.from({ length: total }, (_, i) => ({ etiqueta: String(i + 1), acierto: null, detalle: "Sin detalle" }));
    const scoreKey=`evaluacion-mejor-${slug}`; let mejor=porcentaje; try { mejor=Math.max(porcentaje,Number(localStorage.getItem(scoreKey)||0));localStorage.setItem(scoreKey,String(mejor)); } catch {}
    const iconoCurso = /abecedario|letra|abc/i.test(`${curso.titulo} ${slug}`) ? "abc" : "books";
    const repetirUrl = cursoTieneEvaluacionCamara(slug) ? `evaluaciones.html?curso=${encodeURIComponent(slug)}` : `evaluacion.html?curso=${encodeURIComponent(slug)}&plantilla=15`, cursoUrl = `curso.html?curso=${encodeURIComponent(slug)}&plantilla=15`;
    const terms=items.filter(x=>x.acierto===false).map(x=>x.etiqueta);
    renderResultados({ curso: { nombre: nombreCursoParaEvaluacion(curso, slug), icono: iconoCurso }, modo: "preguntas", total, correctas, porcentaje, umbral: 70, items, estadistica2: { valor: `${mejor}%`, etiqueta: "Tu mejor puntaje" }, repasar: terms, insignia: { nueva: Boolean(datosResultado.insignia_100_nueva), id: "curso-completado", curso100: datosResultado.insignia_100 || null }, slug, cursoUrl, repetirUrl, iconoCurso }, document.getElementById("tarjetaResultado"), { onClose: () => { window.location.href = cursoUrl; } });
  } catch (error) { document.getElementById("tarjetaResultado").innerHTML = `<p class="vacio">${esc(error.message)}</p>`; }
})();
