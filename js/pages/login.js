const enlaceAdmin = document.getElementById("enlaceAdmin");
enlaceAdmin.href = `${new URL(CONFIG.API_BASE_URL).origin}/admin/`;

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
    if (usuario.es_interprete && !usuario.es_creador && !usuario.es_profesor) {
      window.location.href = "panel/recursos.html";
      return;
    }
    window.location.href =
      usuario.es_creador || usuario.es_profesor
        ? "panel/index.html"
        : "inicio-usuario.html";
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
