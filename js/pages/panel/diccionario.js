/** CRUD del diccionario de un curso. */

const cursoIdDiccionario = new URLSearchParams(window.location.search).get("curso");

(async function iniciar() {
  if (!(await montarPanel())) return;
  SelectorRecursos.conectar();
  if (!cursoIdDiccionario) {
    window.location.href = "index.html";
    return;
  }

  try {
    const curso = await api(`/panel/cursos/${cursoIdDiccionario}/`);
    document.getElementById("tituloCurso").textContent = `Diccionario de: ${curso.titulo}`;
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }

  await cargarPalabras();
})();

async function cargarPalabras() {
  const tabla = document.getElementById("tablaPalabras");

  try {
    const palabras = comoLista(
      await api(`/panel/diccionario/?curso=${cursoIdDiccionario}`)
    );

    if (!palabras.length) {
      tabla.innerHTML = '<tr><td colspan="4" class="vacio">Sin palabras todavía.</td></tr>';
      return;
    }

    tabla.innerHTML = palabras
      .map(
        (palabra) => `
        <tr>
          <td>${esc(palabra.titulo)}</td>
          <td>${esc(palabra.imagen_frontal)}</td>
          <td>${esc(palabra.video_gif)}</td>
          <td class="panelAcciones">
            <button class="panelBtn peligro" data-borrar="${palabra.id}">Eliminar</button>
          </td>
        </tr>`
      )
      .join("");

    tabla.querySelectorAll("[data-borrar]").forEach((boton) =>
      boton.addEventListener("click", async () => {
        if (!confirm("¿Eliminar esta palabra?")) return;
        mostrarMensaje("mensaje", "");
        try {
          await api(`/panel/diccionario/${boton.dataset.borrar}/`, { metodo: "DELETE" });
          await cargarPalabras();
        } catch (error) {
          mostrarMensaje("mensaje", error.message);
        }
      })
    );
  } catch (error) {
    tabla.innerHTML = `<tr><td colspan="4" class="vacio">${esc(error.message)}</td></tr>`;
  }
}

document.getElementById("btnCrearPalabra").addEventListener("click", async () => {
  const titulo = document.getElementById("tituloPalabra").value.trim();
  const imagen = document.getElementById("imagenPalabra").value.trim();
  const gif = document.getElementById("gifPalabra").value.trim();

  if (!titulo || !imagen || !gif) {
    mostrarMensaje("mensaje", "Todos los campos son obligatorios.");
    return;
  }

  mostrarMensaje("mensaje", "");
  try {
    await api("/panel/diccionario/", {
      metodo: "POST",
      cuerpo: {
        curso: Number(cursoIdDiccionario),
        titulo,
        imagen_frontal: imagen,
        video_gif: gif,
      },
    });
    document.getElementById("tituloPalabra").value = "";
    document.getElementById("imagenPalabra").value = "";
    document.getElementById("gifPalabra").value = "";
    await cargarPalabras();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
});
