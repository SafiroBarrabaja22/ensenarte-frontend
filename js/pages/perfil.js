(async function iniciar() {
  if (!requiereSesion()) return;

  montarLayout("usuario");

  try {
    const usuario = await Auth.perfil();
    document.getElementById("nombreUsuario").textContent = usuario.nombre;
    document.getElementById("correoUsuario").textContent = usuario.correo;
    document.getElementById("estrellasUsuario").textContent =
      `Cantidad de estrellas: ${usuario.estrellas}`;
    document.getElementById("fotoPerfil").src = avatarDe(usuario);

    const progresos = comoLista(await api("/progreso/"));
    const completados = progresos.filter((p) => p.completado);
    const contenedor = document.getElementById("progresoUsuario");

    if (!completados.length) {
      contenedor.innerHTML = '<p class="vacio">Todavía no has presentado ninguna evaluación.</p>';
      return;
    }

    contenedor.innerHTML = `<ul class="listaCursosCompletados">${completados
      .map((p) => {
        const insignia = p.curso_insignia
          ? `<img class="insigniaCursoPerfil" src="${rutaImagen(p.curso_insignia)}" alt="Insignia de ${esc(p.curso_titulo)}">`
          : `<span class="insigniaSinImagen">${esc(p.curso_titulo)}</span>`;
        return `<li class="cursoCompletado"><div class="cursoCompletadoInfo">${insignia}</div></li>`;
      })
      .join("")}</ul>`;
  } catch (error) {
    console.error(error);
  }
})();

function esc(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
