/**
 * Vista previa de un curso para quien lo administra (Profesor dueño,
 * CreadorDeCursos o Administrador): el diccionario tal como lo ve el
 * estudiante, sin evaluaciones ni progreso. Lee del panel (/panel/...), no de
 * las rutas del estudiante, que son solo para el rol Estudiante.
 */

(async function iniciarVistaPrevia() {
  if (!(await montarPanel())) return;

  const cursoId = new URLSearchParams(window.location.search).get("curso");
  const contenedor = document.getElementById("contenedorPalabras");
  if (!cursoId) {
    window.location.href = "index.html";
    return;
  }

  try {
    // El detalle responde 403 si el curso es de otro profesor.
    const curso = await apiPanel(`/panel/cursos/${encodeURIComponent(cursoId)}/`);
    document.getElementById("tituloCurso").textContent = `Vista previa: ${curso.titulo}`;
    document.title = `Vista previa - ${curso.titulo}`;

    const palabras = comoLista(await apiPanel(`/panel/diccionario/?curso=${encodeURIComponent(cursoId)}`));
    // El estudiante solo ve las palabras cuya seña aprobó el Validador.
    const visibles = palabras.filter((palabra) => (palabra.estado_sena || "aprobada") === "aprobada");
    const ocultas = palabras.length - visibles.length;
    const aviso = document.getElementById("ocultasVistaPrevia");
    aviso.hidden = ocultas === 0;
    aviso.textContent = ocultas === 1
      ? "1 palabra no se muestra a los estudiantes porque su seña está en revisión o fue rechazada."
      : `${ocultas} palabras no se muestran a los estudiantes porque su seña está en revisión o fue rechazada.`;

    if (!visibles.length) {
      contenedor.innerHTML = '<p class="vacio">Los estudiantes todavía no ven palabras en este curso.</p>';
      return;
    }
    contenedor.innerHTML = visibles.map(tarjetaPrevia).join("");
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
    contenedor.innerHTML = "";
  }
})().catch(errorInesperado);

function tarjetaPrevia(palabra) {
  const titulo = escaparHtml(palabra.titulo);
  return `
    <div class="tarjetaPrevia" tabindex="0" aria-label="${titulo}">
      <div class="caraPrevia frentePrevia">
        <img src="${escaparHtml(rutaImagen(palabra.imagen_frontal))}" alt="${titulo}" loading="lazy">
        <h3>${titulo}</h3>
      </div>
      <div class="caraPrevia dorsoPrevia">
        <img src="${escaparHtml(rutaVideo(palabra.video_gif))}" alt="Seña: ${titulo}" loading="lazy">
        <h3>${titulo}</h3>
      </div>
    </div>`;
}
