let avatarElegido = null;
let avataresDisponibles = [];
let modalAvatar = null;
let correoInicial = "";
let avatarInicial = null;
let avatarModalElegido = null;
let archivoAvatarNuevo = null;
let modalAbridor = null;
let vistaPreviaAvatarUrl = null;
let fotoPerfilUrl = "";

(async function iniciar() {
  if (!(await exigirRol(ACCESO.APRENDIZAJE))) return;

  montarLayout("usuario");

  try {
    const usuario = await Auth.perfil();
    avatarElegido = usuario.avatar || CONFIG.AVATAR_POR_DEFECTO;
    avatarInicial = avatarElegido;
    fotoPerfilUrl = usuario.foto_perfil_url || "";
    document.getElementById("username").value = usuario.nombre;
    document.getElementById("email").value = usuario.correo;
    correoInicial = usuario.correo || "";
    document.getElementById("avatarActual").src = fotoPerfilUrl || rutaImagen(avatarElegido);
    document.getElementById("btnAbrirSelectorAvatar").addEventListener("click", abrirSelectorAvatar);
    await cargarAvatares();
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  }
})();

document.querySelectorAll("[data-password]").forEach((boton) => {
  boton.addEventListener("click", () => {
    const campo = document.getElementById(boton.dataset.password);
    const mostrando = campo.type === "text";
    campo.type = mostrando ? "password" : "text";
    boton.setAttribute("aria-label", mostrando ? "Mostrar contraseña" : "Ocultar contraseña");
    boton.innerHTML = mostrando ? iconoSvg("eye", "icon icon16") : iconoSvg("eye-off", "icon icon16");
  });
});

document.getElementById("passwordNueva").addEventListener("input", (evento) => {
  actualizarSeguridad(evento.target.value);
  validarCoincidencia();
});
document.getElementById("passwordConfirmar").addEventListener("input", validarCoincidencia);

function actualizarSeguridad(password) {
  const indicador = document.getElementById("seguridadPassword");
  const texto = document.getElementById("textoSeguridad");
  indicador.className = "seguridadPassword";
  if (!password) {
    texto.textContent = "Escribe una contraseña";
    return;
  }

  let nivel = 0;
  if (password.length >= 8) nivel += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) nivel += 1;
  if (/\d/.test(password)) nivel += 1;
  if (/[^A-Za-z0-9]/.test(password)) nivel += 1;
  const nombres = ["", "Débil", "Regular", "Buena", "Fuerte"];
  indicador.classList.add(`nivel${nivel}`);
  texto.textContent = nombres[nivel];
}

function validarCoincidencia() {
  const nueva = document.getElementById("passwordNueva").value;
  const confirmar = document.getElementById("passwordConfirmar").value;
  const mensaje = document.getElementById("mensajeCoincidencia");
  mensaje.textContent = confirmar && nueva !== confirmar ? "Las contraseñas no coinciden" : "";
}

async function cargarAvatares() {
  const disponibles = new Set();

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
  if (!avataresDisponibles.length && avatarElegido) {
    avataresDisponibles = [avatarElegido];
  } else if (avatarElegido && !avataresDisponibles.includes(avatarElegido)) {
    avataresDisponibles.unshift(avatarElegido);
  }
  actualizarAvatarActual();
}

function actualizarAvatarActual() {
  const avatar = document.getElementById("avatarActual");
  if (!avatar) return;
  avatar.src = fotoPerfilUrl || rutaImagen(avatarElegido || CONFIG.AVATAR_POR_DEFECTO);
}

function abrirSelectorAvatar() {
  modalAbridor = document.getElementById("btnAbrirSelectorAvatar");
  avatarModalElegido = avatarElegido;
  archivoAvatarNuevo = null;
  if (!modalAvatar) {
    modalAvatar = document.createElement("dialog");
    modalAvatar.className = "modalAvatarSelector";
    modalAvatar.tabIndex = -1;
    modalAvatar.setAttribute("role", "dialog");
    modalAvatar.setAttribute("aria-modal", "true");
    modalAvatar.setAttribute("aria-labelledby", "tituloSelectorAvatar");
    modalAvatar.innerHTML = `
      <div class="modalAvatarHeader">
        <div><h2 id="tituloSelectorAvatar">Elige tu avatar</h2><p>Así te verán en tu perfil y en la biblioteca visual</p></div>
        <button type="button" class="modalAvatarCerrar" data-cerrar-avatar aria-label="Cerrar selector de avatar"><svg class="icon icon20"><use href="#i-x"></use></svg></button>
      </div>
      <div class="avatarVistaPrevia"><img id="avatarVistaPrevia" alt="Vista previa del avatar"><div><strong>Vista previa</strong><span>Selecciona uno de los avatares o sube tu propia foto</span></div></div>
      <div class="modalAvatarGrid" id="listaAvatares" aria-live="polite"></div>
      <input type="file" id="archivoAvatar" accept="image/*" hidden>
      <p class="mensajeArchivoAvatar" id="mensajeArchivoAvatar" role="alert"></p>
      <div class="modalAvatarFooter"><button type="button" class="modalAvatarCancelar" data-cancelar-avatar>Cancelar</button><button type="button" class="modalAvatarGuardar" data-guardar-avatar disabled>Guardar avatar</button></div>
    `;
    modalAvatar.querySelector("[data-cerrar-avatar]").addEventListener("click", cerrarSelectorAvatar);
    modalAvatar.querySelector("[data-cancelar-avatar]").addEventListener("click", cerrarSelectorAvatar);
    modalAvatar.querySelector("[data-guardar-avatar]").addEventListener("click", guardarAvatarSeleccionado);
    modalAvatar.querySelector("#archivoAvatar").addEventListener("change", prepararFotoAvatar);
    modalAvatar.addEventListener("click", (evento) => {
      if (evento.target === modalAvatar) cerrarSelectorAvatar();
    });
    modalAvatar.addEventListener("keydown", atraparFocoModal);
    modalAvatar.addEventListener("close", () => {
      document.body.classList.remove("modalAvatarAbierto");
      if (vistaPreviaAvatarUrl) URL.revokeObjectURL(vistaPreviaAvatarUrl);
      vistaPreviaAvatarUrl = null;
      if (modalAbridor) modalAbridor.focus();
    });
    document.body.appendChild(modalAvatar);
  }

  renderizarAvatares();
  actualizarVistaPreviaAvatar();
  document.body.classList.add("modalAvatarAbierto");
  modalAvatar.showModal();
  modalAvatar.focus();
}

function renderizarAvatares() {
  const contenido = modalAvatar.querySelector("#listaAvatares");
  contenido.innerHTML = avataresDisponibles.map((archivo, indice) => `
    <button type="button" class="avatarOption ${archivo === avatarModalElegido ? "avatarOptionSelected" : ""}" data-avatar="${escHtml(archivo)}" aria-label="Avatar disponible ${indice + 1}" aria-pressed="${archivo === avatarModalElegido}">
      <img src="${rutaImagen(archivo)}" alt="Avatar disponible ${indice + 1}">
      ${archivo === avatarModalElegido ? '<span class="avatarCheck" aria-hidden="true"><svg class="icon icon16"><use href="#i-check"></use></svg></span>' : ""}
    </button>
  `).join("");
  contenido.insertAdjacentHTML("beforeend", `<button type="button" class="avatarOption avatarSubirFoto" data-subir-avatar aria-label="Subir foto">${iconoSvg("upload", "icon icon20")}<strong>Subir foto</strong></button>`);
  contenido.querySelectorAll("[data-avatar]").forEach((boton) => boton.addEventListener("click", () => {
    archivoAvatarNuevo = null;
    avatarModalElegido = boton.dataset.avatar;
    renderizarAvatares();
    actualizarVistaPreviaAvatar();
  }));
  contenido.querySelector("[data-subir-avatar]").addEventListener("click", () => modalAvatar.querySelector("#archivoAvatar").click());
}

function actualizarVistaPreviaAvatar() {
  const imagen = modalAvatar.querySelector("#avatarVistaPrevia");
  if (vistaPreviaAvatarUrl) URL.revokeObjectURL(vistaPreviaAvatarUrl);
  vistaPreviaAvatarUrl = archivoAvatarNuevo ? URL.createObjectURL(archivoAvatarNuevo) : null;
  imagen.src = vistaPreviaAvatarUrl || rutaImagen(avatarModalElegido);
  modalAvatar.querySelector("[data-guardar-avatar]").disabled = !archivoAvatarNuevo && avatarModalElegido === avatarInicial;
}

function prepararFotoAvatar(evento) {
  const archivo = evento.target.files[0];
  const mensaje = modalAvatar.querySelector("#mensajeArchivoAvatar");
  mensaje.textContent = "";
  if (!archivo) return;
  if (!archivo.type.startsWith("image/") || archivo.size > 2 * 1024 * 1024) {
    mensaje.textContent = "Selecciona una imagen de máximo 2 MB.";
    evento.target.value = "";
    return;
  }
  archivoAvatarNuevo = archivo;
  avatarModalElegido = null;
  renderizarAvatares();
  actualizarVistaPreviaAvatar();
}

function cerrarSelectorAvatar() {
  if (modalAvatar?.open) modalAvatar.close();
}

function atraparFocoModal(evento) {
  if (evento.key === "Escape") {
    evento.preventDefault();
    cerrarSelectorAvatar();
    return;
  }
  if (evento.key !== "Tab") return;
  const elementos = [...modalAvatar.querySelectorAll("button, input:not([hidden])")].filter((elemento) => !elemento.disabled);
  if (!elementos.length) return;
  const primero = elementos[0];
  const ultimo = elementos[elementos.length - 1];
  if (evento.shiftKey && document.activeElement === primero) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primero.focus();
  }
}

async function guardarAvatarSeleccionado() {
  const boton = modalAvatar.querySelector("[data-guardar-avatar]");
  boton.disabled = true;
  boton.textContent = "Guardando...";
  try {
    const datos = archivoAvatarNuevo ? new FormData() : { avatar: avatarModalElegido, foto_perfil: null };
    if (archivoAvatarNuevo) {
      const avatarGuardado = avatarElegido || CONFIG.AVATAR_POR_DEFECTO;
      if (avatarGuardado) datos.append("avatar", avatarGuardado);
      datos.append("foto_perfil", archivoAvatarNuevo);
    }
    const usuario = await Auth.actualizarPerfil(datos);
    avatarElegido = usuario.avatar || avatarElegido;
    avatarInicial = avatarElegido;
    if (usuario.foto_perfil_url) document.getElementById("avatarActual").src = usuario.foto_perfil_url;
    else actualizarAvatarActual();
    montarLayout("usuario");
    cerrarSelectorAvatar();
    mostrarMensaje("mensaje", "Avatar actualizado", "ok");
  } catch (error) {
    boton.disabled = false;
    boton.textContent = "Guardar avatar";
    mostrarMensaje("mensaje", error.message);
  }
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
  const boton = document.getElementById("btnGuardarDatos");
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Guardando...";
  try {
    const nombre = document.getElementById("username").value.trim();
    const correo = document.getElementById("email").value.trim();
    const datos = { nombre };
    if (avatarElegido !== avatarInicial) datos.avatar = avatarElegido;
    if (correo.toLowerCase() !== correoInicial.toLowerCase()) datos.correo = correo;
    await Auth.actualizarPerfil(datos);
    correoInicial = correo;
    mostrarMensaje("mensaje", "Datos actualizados correctamente.", "ok");
    montarLayout("usuario");
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
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

  const boton = document.getElementById("btnCambiarPassword");
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Guardando...";
  try {
    await Auth.cambiarPassword(actual, nueva);
    mostrarMensaje("mensajePassword", "Contraseña cambiada. Vuelve a iniciar sesión.", "ok");
    setTimeout(() => {
      Sesion.cerrar();
      window.location.href = "login.html";
    }, 1800);
  } catch (error) {
    mostrarMensaje("mensajePassword", error.message);
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
});
