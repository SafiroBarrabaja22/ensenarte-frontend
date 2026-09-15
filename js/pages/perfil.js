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
    const contenedor = document.getElementById("progresoUsuario");

    contenedor.innerHTML = progresos.length
      ? `<ul>${progresos
          .map(
            (p) =>
              `<li>${p.curso_titulo}: ${p.aciertos} aciertos, ${p.errores} errores${
                p.completado ? " (completado)" : ""
              }</li>`
          )
          .join("")}</ul>`
      : '<p class="vacio">Todavía no has presentado ninguna evaluación.</p>';
  } catch (error) {
    console.error(error);
  }
})();
