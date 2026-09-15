let uidRecuperacion = null;

document.getElementById("formSolicitar").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrarMensaje("mensaje", "");

  try {
    const respuesta = await Auth.solicitarRecuperacion(
      document.getElementById("correo").value.trim()
    );

    // En desarrollo el backend devuelve el token para poder probar sin correo.
    if (respuesta.debug) {
      uidRecuperacion = respuesta.debug.uid;
      document.getElementById("token").value = respuesta.debug.token;
    }

    mostrarMensaje("mensaje", respuesta.mensaje, "ok");
    document.getElementById("formSolicitar").style.display = "none";
    document.getElementById("formConfirmar").style.display = "flex";
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
});

document.getElementById("formConfirmar").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrarMensaje("mensajeConfirmar", "");

  const nueva = document.getElementById("passwordNueva").value;
  const confirmar = document.getElementById("passwordConfirmar").value;

  if (nueva !== confirmar) {
    mostrarMensaje("mensajeConfirmar", "Las contraseñas no coinciden.");
    return;
  }

  try {
    await Auth.confirmarRecuperacion(
      uidRecuperacion,
      document.getElementById("token").value.trim(),
      nueva
    );
    mostrarMensaje("mensajeConfirmar", "Contraseña restablecida. Redirigiendo...", "ok");
    setTimeout(() => (window.location.href = "login.html"), 1500);
  } catch (error) {
    mostrarMensaje("mensajeConfirmar", error.message);
  }
});
