/** Diccionario visual: tarjetas que se voltean (imagen -> gif de la seña). */

(async function iniciar() {
  if (!(await exigirRol(ACCESO.APRENDIZAJE))) return;

  montarLayout("usuario");

  const slug = new URLSearchParams(window.location.search).get("curso");
  const contenedor = document.getElementById("contenedorPalabras");

  if (!slug) {
    window.location.href = "cursos-usuario.html";
    return;
  }

  document.getElementById("linkVolver").href = `curso.html?curso=${encodeURIComponent(slug)}`;

  try {
    const datos = await api(`/cursos/${slug}/diccionario/`);
    document.title = `${datos.curso.titulo} - Diccionario`;

    if (!datos.palabras.length) {
      contenedor.innerHTML = '<p class="vacio">Este curso todavía no tiene palabras cargadas.</p>';
      return;
    }

    contenedor.innerHTML = datos.palabras
      .map(
        (palabra) => `
        <div class="card">
          <div class="face front">
            <img src="${escaparHtml(rutaImagen(palabra.imagen_frontal))}" alt="${escaparHtml(palabra.titulo)}">
            <h3>${escaparHtml(palabra.titulo)}</h3>
          </div>
          <div class="face back">
            <img src="${escaparHtml(rutaVideo(palabra.video_gif))}" alt="${escaparHtml(palabra.titulo)}">
            <h3>${escaparHtml(palabra.titulo)}</h3>
          </div>
        </div>`
      )
      .join("");
  } catch (error) {
    contenedor.innerHTML = `<p class="vacio">No se pudo cargar el diccionario: ${escaparHtml(error.message)}</p>`;
  }
})().catch(errorInesperado);
