/**
 * Portada (index.html). Antes era un <script> en linea; la politica de
 * seguridad (CSP) solo permite scripts en archivos del propio sitio.
 */
// La portada es del visitante y del estudiante: un rol de trabajo va a su seccion.
enviarRolDeTrabajoASuSeccion();
const esVisitante = !Sesion.activa();
document.body.classList.toggle("homePublico", esVisitante);
montarLayout(esVisitante ? "publico" : "usuario");
if (esVisitante) {
  // El boton de la derecha es "Biblioteca visual" (data-acceso="BIBLIOTECA") y
  // montarLayout lo quita a quien no tiene ese rol: para el visitante se crea
  // el de "Crear cuenta".
  let botonDerecho = document.querySelector(".btnRight");
  if (!botonDerecho) {
    botonDerecho = document.createElement("a");
    botonDerecho.className = "btnHome btnRight";
    document.querySelector(".btnLeft")?.after(botonDerecho);
  }
  botonDerecho.href = "pages/signup.html";
  botonDerecho.textContent = "Crear cuenta";
  document.getElementById("tarjetaContinuacion").innerHTML = `
    <span class="iconoContinuacion" aria-hidden="true"><svg class="icon icon26"><use href="#i-user"></use></svg></span>
    <h2>Crea tu cuenta gratis</h2>
    <p>Guarda tu progreso, gana insignias y practica a tu ritmo.</p>
    <a href="pages/signup.html" class="botonContinuar">Registrarse</a>
    <a href="pages/login.html" class="enlaceInicioSesion">¿Ya tienes cuenta? Inicia sesión</a>`;
}
