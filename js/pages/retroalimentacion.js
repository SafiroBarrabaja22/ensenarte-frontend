(async function iniciar() {
  if (!requiereSesion()) return;
  montarLayout("usuario");
  const slug = new URLSearchParams(window.location.search).get("curso");
  if (!slug) {
    window.location.href = "cursos-usuario.html";
    return;
  }

  try {
    const [resultado, curso] = await Promise.all([
      api(`/cursos/${slug}/evaluacion/resultado/`),
      api(`/cursos/${slug}/`, { autenticado: false }),
    ]);
    const total = Number(curso.total_preguntas || resultado.aciertos + resultado.errores || 1);
    const porcentaje = Math.round((Number(resultado.aciertos) / total) * 100);
    const estrellas = porcentaje >= 90 ? 3 : porcentaje >= 60 ? 2 : 1;
    const insignia = curso.insignia ? `<div class="insigniaResultado"><img src="${rutaImagen(curso.insignia)}" alt="Insignia de ${esc(curso.titulo)}"><span>¡Ganaste una insignia!</span></div>` : "";
    document.getElementById("tarjetaResultado").innerHTML = `
      <span class="iconoPremioResultado" aria-hidden="true"><svg class="icon icon26"><use href="#i-award"></use></svg></span>
      <h1>¡Evaluación completada!</h1>
      <p class="cursoResultado">${esc(resultado.curso_titulo)}</p>
      <div class="anilloResultado"><svg viewBox="0 0 42 42" aria-label="${porcentaje}% de progreso"><circle class="anilloBase" cx="21" cy="21" r="16" pathLength="100"></circle><circle class="anilloProgreso" cx="21" cy="21" r="16" pathLength="100" stroke-dasharray="${porcentaje} 100"></circle></svg><span>${porcentaje}%</span></div>
      <h2>${resultado.aciertos} de ${total} correctas</h2>
      <div class="estrellasResultado" aria-label="${estrellas} estrellas ganadas">${"★".repeat(estrellas)}<span>${"★".repeat(3 - estrellas)}</span></div>
      ${insignia}
      <div class="accionesResultado"><a class="botonResultadoSecundario" href="evaluacion.html?curso=${encodeURIComponent(slug)}&plantilla=15"><svg class="icon icon16"><use href="#i-repeat"></use></svg> Repetir evaluación</a><a class="botonResultadoPrincipal" href="curso.html?curso=${encodeURIComponent(slug)}&plantilla=15">Volver al curso</a></div>`;
  } catch (error) {
    document.getElementById("tarjetaResultado").innerHTML = `<p class="vacio">${esc(error.message)}</p>`;
  }
})();

function esc(valor) {
  return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
