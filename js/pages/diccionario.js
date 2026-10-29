/** Diccionario visual: tarjetas que se voltean (imagen -> gif de la seña). */

(async function iniciar() {
  if (!requiereSesion()) return;

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
            <img src="${rutaImagenOptimizada(palabra.imagen_frontal, 360)}" alt="${palabra.titulo}" loading="lazy" decoding="async">
            <h3>${palabra.titulo}</h3>
          </div>
          <div class="face back">
            <img data-src="${rutaVideoOptimizada(palabra.video_gif, 360)}" alt="Seña de ${palabra.titulo}" decoding="async">
            <h3>${palabra.titulo}</h3>
          </div>
        </div>`
      )
      .join("");

    contenedor.querySelectorAll(".card").forEach((tarjeta) => {
      const gif = tarjeta.querySelector(".back img");
      const cargarGif = () => {
        if (!gif.dataset.src) return;
        gif.src = gif.dataset.src;
        delete gif.dataset.src;
      };
      const alternarTarjeta = () => {
        cargarGif();
        const abierta = tarjeta.classList.toggle("abierta");
        tarjeta.setAttribute("aria-pressed", String(abierta));
      };

      tarjeta.setAttribute("tabindex", "0");
      tarjeta.setAttribute("role", "button");
      tarjeta.setAttribute("aria-pressed", "false");
      tarjeta.addEventListener("pointerenter", cargarGif, { once: true });
      tarjeta.addEventListener("focus", cargarGif, { once: true });
      tarjeta.addEventListener("click", alternarTarjeta);
      tarjeta.addEventListener("keydown", (evento) => {
        if (evento.key !== "Enter" && evento.key !== " ") return;
        evento.preventDefault();
        alternarTarjeta();
      });
    });
  } catch (error) {
    contenedor.innerHTML = `<p class="vacio">No se pudo cargar el diccionario: ${error.message}</p>`;
  }
})();
