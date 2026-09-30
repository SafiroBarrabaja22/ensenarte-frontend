(async function iniciar() {
  if (!requiereSesion()) return;

  try {
    const usuario = await Auth.perfil();
    if (usuario.es_interprete) {
      window.location.replace("panel/recursos.html");
      return;
    }

    montarLayout("usuario");
    montarFooter();
    document.getElementById("saludo").textContent =
      `Bienvenid@ ${usuario.nombre} a nuestro aplicativo web`;

    const accesos = [];
    if (usuario.es_creador) {
      accesos.push('<a href="panel/index.html" class="btnHome">Panel de administración</a>');
    }
    document.getElementById("accesoPanel").innerHTML = accesos.join(" ");
  } catch (error) {
    console.error(error);
  }
})();
