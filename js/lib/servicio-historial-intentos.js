/* Acceso común al historial; el backend deriva el usuario de la sesión autenticada. */
(function (global) {
  async function cargar({ curso, tipo = "normal" }) {
    const ruta = tipo === "camara"
      ? `/evaluacion-camara/?curso=${encodeURIComponent(curso)}`
      : `/cursos/${encodeURIComponent(curso)}/evaluacion/historial/`;
    const respuesta = await global.api(ruta);
    return Array.isArray(respuesta) ? respuesta : (respuesta?.results || []);
  }
  global.ServicioHistorialIntentos = { cargar };
})(window);
