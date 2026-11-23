/** Catalogo de cursos para las vistas publica y autenticada. */

const esVistaUsuario = window.location.pathname.includes("cursos-usuario");
let cursosDisponibles = [];
let progresosCursos = new Map();
let filtroActual = "todos";
let busquedaActual = "";

(async function iniciar() {
  // Los cursos son del visitante y del estudiante (cada rol ve solo lo suyo).
  if (enviarRolDeTrabajoASuSeccion()) return;
  if (esVistaUsuario && !(await exigirRol(ACCESO.APRENDIZAJE))) return;

  montarLayout(Sesion.activa() ? "usuario" : "publico");
  montarFooter();
  conectarFiltrosCursos();

  try {
    cursosDisponibles = comoLista(await api("/cursos/", { autenticado: false }));
    if (Sesion.activa()) {
      const progresos = comoLista(await api("/progreso/"));
      progresosCursos = new Map(progresos.map((progreso) => [progreso.curso, progreso]));
    }
    renderizarCursos();
  } catch (error) {
    document.getElementById("listaCursos").innerHTML = "";
    mostrarMensaje("mensaje", `No se pudieron cargar los cursos: ${error.message}`);
  }
})().catch(errorInesperado);

function conectarFiltrosCursos() {
  const buscador = document.getElementById("buscarCurso");
  buscador.addEventListener("input", (evento) => {
    busquedaActual = evento.target.value.trim().toLowerCase();
    renderizarCursos();
  });
  document.querySelectorAll("[data-filtro]").forEach((boton) => {
    boton.addEventListener("click", () => {
      filtroActual = boton.dataset.filtro;
      document.querySelectorAll("[data-filtro]").forEach((otro) => {
        const activo = otro === boton;
        otro.classList.toggle("activo", activo);
        otro.setAttribute("aria-pressed", activo);
      });
      renderizarCursos();
    });
  });
}

function renderizarCursos() {
  const contenedor = document.getElementById("listaCursos");
  const filtrados = cursosDisponibles.filter((curso) => {
    const progreso = progresosCursos.get(curso.nombre);
    const estado = estadoCurso(progreso);
    const coincideNombre = !busquedaActual || `${curso.titulo} ${curso.descripcion || ""}`.toLowerCase().includes(busquedaActual);
    const coincideFiltro = filtroActual === "todos" || filtroActual === estado;
    return coincideNombre && coincideFiltro;
  });

  if (!filtrados.length) {
    contenedor.innerHTML = '<p class="sinResultadosCursos">No encontramos cursos con ese filtro. Prueba con otra búsqueda.</p>';
    return;
  }
  contenedor.innerHTML = filtrados.map(tarjetaCurso).join("");
  aplicarVariablesCss(contenedor);
  requestAnimationFrame(() => contenedor.querySelectorAll(".barraCurso span").forEach((barra) => barra.classList.add("visible")));
}

function estadoCurso(progreso) {
  if (!progreso) return "nuevos";
  return progreso.completado ? "completados" : "progreso";
}

function tarjetaCurso(curso) {
  const progreso = progresosCursos.get(curso.nombre);
  const estado = estadoCurso(progreso);
  const porcentaje = progreso?.completado ? 100 : progreso ? 50 : 0;
  const destino = Sesion.activa()
    ? `curso.html?curso=${encodeURIComponent(curso.nombre)}&plantilla=15`
    : "login.html";
  const estadoTexto = { completados: "Completado", progreso: "En progreso", nuevos: "Nuevo" }[estado];
  const accion = estado === "completados" ? "Repasar curso" : estado === "progreso" ? "Continuar" : "Empezar curso";
  const iconoAccion = estado === "progreso" ? iconoSvg("play", "icon icon16") : "";
  const lecciones = curso.total_preguntas || 0;
  const descripcion = curso.descripcion || "Aprende nuevas señas y practica a tu ritmo.";

  return `<a class="tarjetaCurso tarjetaCursoEstado-${estado}" href="${destino}" aria-label="${esc(curso.titulo)}">
    <div class="portadaCurso">
      <img src="${esc(rutaImagen(curso.portada_curso))}" alt="Portada del curso ${esc(curso.titulo)}">
      <span class="estadoCurso estado-${estado}">${estadoTexto}</span>
    </div>
    <div class="infoCurso">
      <h2>${esc(curso.titulo)}</h2>
      <p class="descripcionCurso">${esc(descripcion)}</p>
      <div class="metadatosCurso"><span>${iconoSvg("books", "icon icon16")}${lecciones} lecciones</span><span>${iconoSvg("clock", "icon icon16")}40 min</span></div>
      <div class="barraCurso" role="progressbar" aria-label="Progreso de ${esc(curso.titulo)}" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100" data-css="--progreso-curso: ${porcentaje}%"><span></span></div>
      <span class="botonCurso ${estado === "completados" ? "botonCursoSecundario" : ""}">${iconoAccion}${accion}</span>
    </div>
  </a>`;
}

function esc(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
