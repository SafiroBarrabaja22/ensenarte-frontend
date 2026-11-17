/**
 * Recuperacion de contrasena en dos pasos.
 *
 * 1. El usuario escribe su correo. El backend le envia un correo con un enlace
 *    de un solo uso (vence en 1 hora):
 *      pages/recuperar.html#uid=...&token=...
 * 2. Al abrir ese enlace, el dueno del correo confirma que fue el quien lo pidio
 *    y elige la contrasena nueva. Si no lo pidio, ignora el correo y nada cambia.
 *
 * El uid y el token van despues de "#": el navegador nunca los envia a ningun
 * servidor. En cuanto se leen se borran de la barra de direcciones para que no
 * queden en el historial ni se compartan por error.
 */

let uidRecuperacion = null;
let tokenRecuperacion = null;

function leerEnlaceDelCorreo() {
  const parametros = new URLSearchParams(window.location.hash.slice(1));
  const uid = parametros.get("uid");
  const token = parametros.get("token");
  if (!uid || !token) return false;
  uidRecuperacion = uid;
  tokenRecuperacion = token;
  history.replaceState(null, "", window.location.pathname);
  return true;
}

function mostrarPasoConfirmar() {
  document.getElementById("formSolicitar").style.display = "none";
  document.getElementById("formConfirmar").style.display = "flex";
  document.getElementById("textoBanner").textContent =
    "Elige una contraseña nueva. Al guardarla se cerrará tu sesión en todos tus dispositivos.";
  document.getElementById("passwordNueva").focus();
}

if (leerEnlaceDelCorreo()) mostrarPasoConfirmar();

document.getElementById("formSolicitar").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = evento.submitter;
  if (boton) boton.disabled = true;
  mostrarMensaje("mensaje", "");

  try {
    await Auth.solicitarRecuperacion(
      document.getElementById("correo").value.trim()
    );

    // El enlace para restablecer SOLO llega por correo, nunca en la respuesta.
    mostrarMensaje(
      "mensaje",
      "Te enviamos un correo. Si la dirección está registrada, trae el botón " +
        "\"Sí, fui yo: restablecer contraseña\" (vence en 1 hora). " +
        "Si no lo ves en unos minutos, revisa la carpeta de spam.",
      "ok"
    );
  } catch (error) {
    mostrarMensaje("mensaje", error.message);
  } finally {
    if (boton) boton.disabled = false;
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

  const boton = evento.submitter;
  if (boton) boton.disabled = true;
  try {
    await Auth.confirmarRecuperacion(uidRecuperacion, tokenRecuperacion, nueva);
    mostrarMensaje("mensajeConfirmar", "Contraseña restablecida. Redirigiendo al inicio de sesión...", "ok");
    setTimeout(() => (window.location.href = "login.html"), 1500);
  } catch (error) {
    mostrarMensaje("mensajeConfirmar", error.message);
    // Enlace vencido o ya usado: se ofrece pedir uno nuevo.
    if (/expir|usado|no es valido/i.test(error.message)) {
      document.getElementById("pedirOtroEnlace").style.display = "block";
    }
    if (boton) boton.disabled = false;
  }
});
