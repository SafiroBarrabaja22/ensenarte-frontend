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
    const destino = paginaInicioDe(usuario);
    if (!destino) {
      Sesion.cerrar();
      mostrarMensaje("mensaje", "Tu cuenta no tiene ningún rol asignado. Pide a un administrador que te asigne uno.");
      return;
    }
    window.location.href = prefijoRaiz() + destino;
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
