(async function iniciar() {
  if (!requiereSesion()) return;

  const slug = new URLSearchParams(window.location.search).get("curso");
  const tarjeta = document.getElementById("tarjetaResultado");

  if (!slug) {
    window.location.href = "cursos-usuario.html";
    return;
  }

  document.getElementById("linkSalir").href = `curso.html?curso=${encodeURIComponent(slug)}`;

  try {
    const resultado = await api(`/cursos/${slug}/evaluacion/resultado/`);
    tarjeta.innerHTML = `
      <h2>Resultados del curso "${resultado.curso_titulo}"</h2>
      <p>Acertaste en el primer intento: ${resultado.aciertos}</p>
      <p>Tuviste ${resultado.errores} errores</p>
      <p>${resultado.mensaje}</p>`;
  } catch (error) {
    tarjeta.innerHTML = `<p class="vacio">${error.message}</p>`;
  }
})();
