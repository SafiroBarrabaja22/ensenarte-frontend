(async function iniciar() {
  if (!requiereSesion()) return;

  montarLayout("usuario");

  try {
    const usuario = await Auth.perfil();
    document.getElementById("nombreUsuario").textContent = usuario.nombre;
    document.getElementById("correoUsuario").textContent = usuario.correo;
    document.getElementById("fotoPerfil").src = avatarDe(usuario);

    const [progresos, cursos] = await Promise.all([
      api("/progreso/"),
      api("/cursos/", { autenticado: false }),
    ]).then(([datosProgreso, datosCursos]) => [comoLista(datosProgreso), comoLista(datosCursos)]);
    const cursosPorSlug = new Map(cursos.map((curso) => [curso.nombre, curso]));
    const completados = progresos.filter((p) => p.completado);
    const insignias = completados.filter((p) => p.curso_insignia);
    document.getElementById("cursosCompletados").textContent = completados.length;
    document.getElementById("insigniasGanadas").textContent = insignias.length;
    const racha = calcularRacha(progresos);
    document.getElementById("rachaPractica").textContent = `${racha} ${racha === 1 ? "día" : "días"}`;
    document.getElementById("nivelUsuario").textContent =
      `Nivel ${Math.max(1, completados.length)} · Explorador de señas`;
    const contenedor = document.getElementById("progresoUsuario");

    if (!completados.length) {
      contenedor.innerHTML = '<p class="vacio">Todavía no has completado ningún curso.</p>';
      return;
    }

    contenedor.innerHTML = `<div class="cuadriculaCursosPerfil">${completados
      .map((p) => {
        const porcentaje = p.completado ? 100 : 0;
        const curso = cursosPorSlug.get(p.curso);
        const portada = curso?.portada_curso
          ? `<img class="portadaCursoPerfil" src="${esc(rutaImagen(curso.portada_curso))}" alt="Portada del curso ${esc(p.curso_titulo)}">`
          : `<span class="portadaCursoPerfilFallback" aria-hidden="true">${iconoSvg(temaIcono(p.curso_titulo), "icon icon26")}</span>`;
        const insignia100 = p.curso_insignia_tipo === "curso_100";
        const insignia = p.curso_insignia
          ? `<img class="insigniaCursoPerfil" src="${rutaImagen(p.curso_insignia)}" alt="${insignia100 ? "Insignia Curso 100%" : "Insignia de curso completado"}: ${esc(p.curso_titulo)}">${insignia100 ? '<small>Curso 100%</small>' : ""}`
          : '<span class="insigniaSinImagen">Sin insignia</span>';
        const destino = `curso.html?curso=${encodeURIComponent(p.curso)}&plantilla=15`;
        return `<a class="tarjetaCursoPerfil" href="${destino}" aria-label="Entrar al curso ${esc(p.curso_titulo)}">
          <div class="portadaCursoPerfilMarco">${portada}</div>
          <div class="cabeceraCursoPerfil">
            <span class="iconoCursoPerfil" aria-hidden="true">${iconoSvg(temaIcono(p.curso_titulo), "icon icon26")}</span>
            <span class="etiquetaInsignia ${p.curso_insignia ? "tieneInsignia" : ""} ${insignia100 ? "esCurso100" : ""}" title="${insignia100 ? "Curso 100%" : "Curso completado"}">${insignia}</span>
          </div>
          <h3>${esc(p.curso_titulo)}</h3>
          <div class="barraProgreso" role="progressbar" aria-label="Progreso de ${esc(p.curso_titulo)}" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100" style="--progreso: ${porcentaje}%"><span></span></div>
          <div class="detalleProgreso"><span>Completado</span><strong>${porcentaje}%</strong></div>
        </a>`;
      })
      .join("")}</div>`;
    requestAnimationFrame(() => {
      contenedor.querySelectorAll(".barraProgreso").forEach((barra) => barra.classList.add("isVisible"));
    });
  } catch (error) {
    console.error(error);
  }
})();

function calcularRacha(progresos) {
  const fechas = [...new Set(progresos
    .map((progreso) => progreso.fecha_ultima_actividad?.slice(0, 10))
    .filter(Boolean))]
    .sort()
    .reverse();
  if (!fechas.length) return 0;

  let racha = 1;
  for (let indice = 1; indice < fechas.length; indice += 1) {
    const anterior = new Date(`${fechas[indice - 1]}T00:00:00`);
    const actual = new Date(`${fechas[indice]}T00:00:00`);
    const diferencia = (anterior - actual) / 86400000;
    if (diferencia !== 1) break;
    racha += 1;
  }
  return racha;
}

function temaIcono(titulo) {
  const texto = String(titulo || "").toLowerCase();
  if (texto.includes("perro") || texto.includes("animal")) return "dog";
  if (texto.includes("saludo") || texto.includes("cortes")) return "hand";
  return "books";
}

function esc(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
