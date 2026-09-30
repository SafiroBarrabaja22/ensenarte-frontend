/** Operaciones de autenticacion contra /api/auth/. */

const Auth = {
  async registrar(nombre, correo, password) {
    return api("/auth/registro/", {
      metodo: "POST",
      cuerpo: { nombre, correo, password },
      autenticado: false,
    });
  },

  async iniciarSesion(nombre, password) {
    const datos = await api("/auth/login/", {
      metodo: "POST",
      cuerpo: { username: nombre, password },
      autenticado: false,
    });
    Sesion.guardar({ access: datos.access, refresh: datos.refresh }, datos.usuario);
    return datos.usuario;
  },

  async perfil() {
    const usuario = await api("/auth/perfil/");
    Sesion.actualizarUsuario(usuario);
    return usuario;
  },

  async actualizarPerfil(datos) {
    const usuario = await api("/auth/perfil/", { metodo: "PATCH", cuerpo: datos });
    Sesion.actualizarUsuario(usuario);
    return usuario;
  },

  async cambiarPassword(actual, nueva) {
    return api("/auth/cambiar-password/", {
      metodo: "POST",
      cuerpo: { password_actual: actual, password_nueva: nueva },
    });
  },

  async solicitarRecuperacion(correo) {
    return api("/auth/recuperar/solicitar/", {
      metodo: "POST",
      cuerpo: { correo },
      autenticado: false,
    });
  },

  async confirmarRecuperacion(uid, token, passwordNueva) {
    return api("/auth/recuperar/confirmar/", {
      metodo: "POST",
      cuerpo: { uid, token, password_nueva: passwordNueva },
      autenticado: false,
    });
  },
};
