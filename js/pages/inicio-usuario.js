(async function iniciar() {
  if (!(await exigirRol(ACCESO.APRENDIZAJE))) return;

  montarLayout("usuario");
  montarFooter();

  try {
    const usuario = await Auth.perfil();
    document.getElementById("saludo").innerHTML =
      `Bienvenid@, <span>${escInicio(usuario.nombre)}</span>`;

    if (tieneRol(usuario, ACCESO.PANEL_CONTENIDO)) {
      document.getElementById("accesoPanel").innerHTML =
        `<a href="panel/index.html" class="enlacePanel">${iconoSvg("shield-lock", "icon icon16")} Panel de administración</a>`;
    }

    const progresos = comoLista(await api("/progreso/"));
    const enProgreso = progresos.filter((progreso) => !progreso.completado).sort((a, b) =>
      String(b.fecha_ultima_actividad || "").localeCompare(String(a.fecha_ultima_actividad || ""))
    )[0];
    if (enProgreso) mostrarContinuacion(enProgreso);
  } catch (error) {
    console.error(error);
  }
})();

function mostrarContinuacion(progreso) {
  const tarjeta = document.getElementById("tarjetaContinuacion");
  const porcentaje = Math.min(99, Math.max(1, Number(progreso.aciertos || 1) * 10));
  tarjeta.innerHTML = `
    <span class="iconoContinuacion" aria-hidden="true">${iconoSvg("books", "icon icon26")}</span>
    <p class="etiquetaContinuacion">Continúa donde lo dejaste</p>
    <h2>${escInicio(progreso.curso_titulo)}</h2>
    <p>Lección ${Number(progreso.aciertos || 0) + 1} de 10</p>
    <div class="barraHome" role="progressbar" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"><span style="--progreso-home: ${porcentaje}%"></span></div>
    <a href="curso.html?curso=${encodeURIComponent(progreso.curso)}" class="botonContinuar">Continuar curso</a>`;
  requestAnimationFrame(() => tarjeta.querySelector(".barraHome span").classList.add("visible"));
}

function escInicio(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
