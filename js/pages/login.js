document.getElementById("formLogin").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = document.getElementById("btnEnviar");
  boton.disabled = true;
  mostrarMensaje("mensaje", "");

  try {
    const usuario = await Auth.iniciarSesion(
      document.getElementById("usuario").value.trim(),
      document.getElementById("password").value
    );
    // Mismo criterio que el monolito: los creadores entran al panel.
    window.location.href = usuario.es_creador ? "panel/index.html" : "inicio-usuario.html";
  } catch (error) {
    const texto =
      error.status === 401
        ? "Usuario o contraseña incorrectos."
        : error.message;
    mostrarMensaje("mensaje", texto);
  } finally {
    boton.disabled = false;
  }
});
