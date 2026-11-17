document.getElementById("formRegistro").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = document.getElementById("btnEnviar");
  boton.disabled = true;
  mostrarMensaje("mensaje", "");

  try {
    await Auth.registrar(
      document.getElementById("nombre").value.trim(),
      document.getElementById("correo").value.trim(),
      document.getElementById("password").value,
      document.getElementById("sitioWeb").value
    );
    mostrarMensaje("mensaje", "Cuenta creada. Redirigiendo al inicio de sesión...", "ok");
    setTimeout(() => (window.location.href = "login.html"), 1500);
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  } finally {
    boton.disabled = false;
  }
});
