const AVATARES = [
  "imgPredeterminadaUsuario.png",
  "opcionUnoPerfil.png",
  "opcionDosPerfil.png",
  "opcionTresPerfil.png",
  "opcionCuatroPerfil.png",
  "opcionCincoPerfil.png",
];

let avatarElegido = null;

(async function iniciar() {
  if (!requiereSesion()) return;

  montarLayout("usuario");

  try {
    const usuario = await Auth.perfil();
    avatarElegido = usuario.avatar || CONFIG.AVATAR_POR_DEFECTO;
    document.getElementById("username").value = usuario.nombre;
    document.getElementById("email").value = usuario.correo;
    pintarAvatares();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
})();

function pintarAvatares() {
  const contenedor = document.getElementById("selectorAvatar");
  contenedor.innerHTML = AVATARES.map(
    (archivo) => `
      <img src="${rutaImagen(archivo)}" alt="Avatar" data-avatar="${archivo}"
           style="cursor:pointer; outline:${archivo === avatarElegido ? "3px solid #2b7a78" : "none"};">`
  ).join("");

  contenedor.querySelectorAll("img").forEach((img) =>
    img.addEventListener("click", () => {
      avatarElegido = img.dataset.avatar;
      pintarAvatares();
    })
  );
}

document.getElementById("btnGuardarDatos").addEventListener("click", async () => {
  mostrarMensaje("mensaje", "");
  try {
    await Auth.actualizarPerfil({
      nombre: document.getElementById("username").value.trim(),
      correo: document.getElementById("email").value.trim(),
      avatar: avatarElegido,
    });
    mostrarMensaje("mensaje", "Datos actualizados correctamente.", "ok");
    montarLayout("usuario");
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
});

document.getElementById("btnCambiarPassword").addEventListener("click", async () => {
  mostrarMensaje("mensajePassword", "");

  const actual = document.getElementById("passwordActual").value;
  const nueva = document.getElementById("passwordNueva").value;
  const confirmar = document.getElementById("passwordConfirmar").value;

  if (nueva !== confirmar) {
    mostrarMensaje("mensajePassword", "Las contraseñas nuevas no coinciden.");
    return;
  }

  try {
    await Auth.cambiarPassword(actual, nueva);
    mostrarMensaje("mensajePassword", "Contraseña cambiada. Vuelve a iniciar sesión.", "ok");
    setTimeout(() => {
      Sesion.cerrar();
      window.location.href = "login.html";
    }, 1800);
  } catch (error) {
    mostrarMensaje("mensajePassword", error.message);
  }
});
