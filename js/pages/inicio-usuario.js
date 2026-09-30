(async function iniciar() {
  if (!requiereSesion()) return;

  montarLayout("usuario");
  montarFooter();

  try {
    const usuario = await Auth.perfil();
    document.getElementById("saludo").textContent =
      `Bienvenid@ ${usuario.nombre} a nuestro aplicativo web`;

    if (usuario.es_creador) {
      document.getElementById("accesoPanel").innerHTML =
        '<a href="panel/index.html" class="btnHome">Panel de administración</a>';
    }
  } catch (error) {
    console.error(error);
  }
})();
