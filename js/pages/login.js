const enlaceAdmin = document.getElementById("enlaceAdmin");
enlaceAdmin.href = `${new URL(CONFIG.API_BASE_URL).origin}/admin/`;

// Llegada desde api.js cuando ya no se pudo renovar la sesion (refresh vencido,
// cerrado en otro dispositivo o invalidado).
if (new URLSearchParams(window.location.search).get("sesion") === "expirada") {
  mostrarMensaje("mensaje", "Tu sesión expiró. Inicia sesión de nuevo para continuar.");
}

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
