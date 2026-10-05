const AVATARES = [
  "imgPredeterminadaUsuario.png",
  "opcionUnoPerfil.png",
  "opcionDosPerfil.png",
  "opcionTresPerfil.png",
  "opcionCuatroPerfil.png",
  "opcionCincoPerfil.png",
];

let avatarElegido = null;
let avataresDisponibles = [...AVATARES];
let modalAvatar = null;

(async function iniciar() {
  if (!requiereSesion()) return;

  montarLayout("usuario");

  try {
    const usuario = await Auth.perfil();
    avatarElegido = usuario.avatar || CONFIG.AVATAR_POR_DEFECTO;
    document.getElementById("username").value = usuario.nombre;
    document.getElementById("email").value = usuario.correo;
    document.getElementById("avatarActual").src = rutaImagen(avatarElegido);
    document.getElementById("btnAbrirSelectorAvatar").addEventListener("click", abrirSelectorAvatar);
    await cargarAvatares();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
})();

async function cargarAvatares() {
  const disponibles = new Set(AVATARES);

  try {
    const recursos = comoLista(await api("/panel/recursos/?categoria=avatar"));
    for (const recurso of recursos) {
      const ruta = recurso.archivo_url || recurso.archivo || "";
      if (ruta) disponibles.add(ruta);
    }
  } catch (error) {
    console.warn("No se pudieron cargar avatares desde la biblioteca:", error.message);
  }

  avataresDisponibles = [...disponibles];
  if (!avataresDisponibles.includes(avatarElegido)) {
    avatarElegido = CONFIG.AVATAR_POR_DEFECTO;
  }
  actualizarAvatarActual();
}

function actualizarAvatarActual() {
  const avatar = document.getElementById("avatarActual");
  if (!avatar) return;
  avatar.src = rutaImagen(avatarElegido || CONFIG.AVATAR_POR_DEFECTO);
}

function abrirSelectorAvatar() {
  if (!modalAvatar) {
    modalAvatar = document.createElement("dialog");
    modalAvatar.className = "modalAvatarSelector";
    modalAvatar.innerHTML = `
      <div class="modalAvatarHeader">
        <h2>Seleccionar avatar</h2>
        <button type="button" class="panelBtn secundario" data-cerrar-avatar>Cerrar</button>
      </div>
      <div class="modalAvatarGrid" id="listaAvatares"></div>
    `;
    modalAvatar.querySelector("[data-cerrar-avatar]").addEventListener("click", () => modalAvatar.close());
    modalAvatar.addEventListener("click", (evento) => {
      if (evento.target === modalAvatar) modalAvatar.close();
    });
    document.body.appendChild(modalAvatar);
  }

  const contenido = modalAvatar.querySelector("#listaAvatares");
  contenido.innerHTML = avataresDisponibles
    .map((archivo) => `
      <button type="button" class="avatarOption ${archivo === avatarElegido ? "avatarOptionSelected" : ""}" data-avatar="${escHtml(archivo)}">
        <img src="${rutaImagen(archivo)}" alt="Avatar disponible">
      </button>
    `)
    .join("");

  contenido.querySelectorAll("[data-avatar]").forEach((boton) => {
    boton.addEventListener("click", () => {
      avatarElegido = boton.dataset.avatar;
      actualizarAvatarActual();
      modalAvatar.close();
    });
  });

  modalAvatar.showModal();
}

function escHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
