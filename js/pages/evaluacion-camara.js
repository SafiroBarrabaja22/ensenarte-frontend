/**
 * Evaluacion con camara: el usuario hace con la mano las letras que se le piden.
 *
 * El reconocimiento ocurre en el navegador (MediaPipe + KNN de lsc-reconocedor.js).
 * No se guarda ni se envia video ni imagenes: al terminar la sesion completa se
 * hace un unico POST con los intentos. Si el usuario sale antes, no se envia nada.
 *
 * Usa los globales de config.js, api.js y layout.js (se cargan antes que este modulo).
 */

import { ClasificadorKNN, ControlSostener, landmarksAPixeles, normalizarLandmarks } from "../lib/lsc-reconocedor.js";
import { renderResultados } from "../lib/resultados.js?v=5";

// ---------------------------------------------------------------- configuracion
// Para cambiar el modelo basta con reemplazar este archivo (o esta ruta).
const MODELO_URL = "../assets/modelos/modelo_knn.json";
const MEDIAPIPE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const HAND_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// Letras del modelo que no se piden (por ejemplo, las que reconoce mal). Ej.: ["M", "N"]
const LETRAS_EXCLUIDAS = [];
const LETRAS_POR_SESION = 10;
const LIMITE_MS = 20000;            // tiempo maximo por letra; si se acaba, es fallo
const SOSTENER_MS = 1000;           // tiempo que hay que mantener la seña
const UMBRAL_CONFIANZA = 0.6;       // fraccion de vecinos del KNN que deben coincidir
const PORCENTAJE_APROBADO = 70;     // aprobado si correctas * 100 >= 70 * total
const PAUSA_ENTRE_LETRAS_MS = 800; // muestra "correcto / se acabo el tiempo" (no cuenta en el limite)

// La evaluacion con camara es del abecedario y no depende del curso desde el que se entra.
const RUTA_RESULTADO = "/evaluacion-camara/";

// ---------------------------------------------------------------- estado
const slugCurso = new URLSearchParams(window.location.search).get("curso");
const $ = (id) => document.getElementById(id);
const video = $("video");
const canvas = $("overlay");
const ctx = canvas.getContext("2d");

// El canvas no entiende var(--...): se leen los tokens de css/tokens.css.
const estilosRaiz = getComputedStyle(document.documentElement);
const COLOR_TRAZO_MANO = estilosRaiz.getPropertyValue("--color-teal").trim();
const COLOR_PUNTO_MANO = estilosRaiz.getPropertyValue("--color-blanco").trim();

let clasificador = null;
let landmarker = null;
let conexionesMano = [];
let control = null;
let stream = null;
let idAnimacion = null;
let ultimoTiempoVideo = -1;
let idPausa = null;
let ocultaDesde = null;
let accionReintento = null;
let enviando = false;
let resultAnimFrame = null;
let resultTimers = [];
let resultAnimacionActiva = false;
let datosFinalesAnimacion = null;
let datosCursoResultado = { nombre: "Curso", icono: "books" };

/**
 * Sesion en curso. `null` si no hay una activa.
 * { letras, indice, intentos, objetivo, inicio, mejorConfianza, bloqueada, terminada }
 */
let sesion = null;

// ---------------------------------------------------------------- arranque
(async function iniciar() {
  if (!(await exigirRol(ACCESO.APRENDIZAJE))) return;
  montarLayout("usuario");
  if (!slugCurso) {
    window.location.href = "cursos-usuario.html";
    return;
  }

  const slugSeguro = encodeURIComponent(slugCurso);
  const enlaceCurso = `curso.html?curso=${slugSeguro}&plantilla=15`;
  $("enlaceVolverCurso").href = enlaceCurso;
  $("textoCantidadLetras").textContent = LETRAS_POR_SESION;
  $("textoSostener").textContent = `${SOSTENER_MS / 1000} s`;
  $("textoLimite").textContent = `${LIMITE_MS / 1000} s`;
  $("textoPorcentajeAprobado").textContent = `${PORCENTAJE_APROBADO}%`;
  $("btnVolver").addEventListener("click", () => salir(enlaceCurso));
  $("btnSaltar").addEventListener("click", () => { if (sesion && !sesion.bloqueada) registrarIntento(false, sesion.mejorConfianza, performance.now(), true); });

  $("btnSalirEvaluacion").addEventListener("click", () => {
    if (sesion && !sesion.terminada) $("dialogSalir").showModal();
    else salir(enlaceCurso);
  });
  $("btnSeguir").addEventListener("click", () => $("dialogSalir").close());
  $("btnConfirmarSalida").addEventListener("click", () => salir(enlaceCurso));
  $("btnComenzar").addEventListener("click", comenzar);
  $("btnRepetir").addEventListener("click", volverAPreparacionCamara);
  $("btnReintentar").addEventListener("click", () => accionReintento && accionReintento());
  $("btnReintentarError").addEventListener("click", () => accionReintento && accionReintento());
  document.addEventListener("visibilitychange", pausarAlOcultar);
  // Al cerrar o cambiar de pagina se apaga la camara; la sesion a medias se descarta.
  window.addEventListener("pagehide", () => { detenerCamara(); limpiarAnimacionResultado(); });
  // Si el navegador restaura la pagina desde su cache (boton atras), se empieza de cero.
  window.addEventListener("pageshow", (evento) => { if (evento.persisted) window.location.reload(); });
  document.addEventListener("keydown", (evento) => { if (evento.key === "Escape") saltarAnimacionResultado(); });

  if (!cursoTieneEvaluacionCamara(slugCurso)) {
    $("pantallaInicio").hidden = true;
    mostrarMensaje("mensaje", "Este curso no tiene evaluación con cámara.");
    return;
  }

  cargarHistorialCamara();

  api(`/cursos/${slugCurso}/`, { autenticado: false })
    .then((curso) => { const nombreCurso = nombreCursoParaEvaluacion(curso, slugCurso); datosCursoResultado = { nombre: nombreCurso, icono: /abecedario|letra|abc/i.test(`${nombreCurso} ${slugCurso}`) ? "abc" : "books" }; $("tituloEvaluacion").textContent = `${nombreCurso} · Evaluación con cámara`; $("iconoCursoEvaluacion").innerHTML = `<svg class="icon icon20" aria-hidden="true"><use href="#i-${datosCursoResultado.icono}"></use></svg>`; })
    .catch(() => {});
})();

function volverAPreparacionCamara() {
  limpiarAnimacionResultado();
  limpiarError();
  sesion = null;
  $("btnComenzar").disabled = false;
  $("btnComenzar").hidden = false;
  $("btnReintentar").hidden = true;
  mostrarPantalla("pantallaInicio");
  cargarHistorialCamara();
}

async function cargarHistorialCamara() {
  try {
    const historial = await ServicioHistorialIntentos.cargar({ curso: slugCurso, tipo: "camara" });
    pintarHistorialCamara(historial);
  } catch (error) {
    console.warn("No se pudo cargar el historial de cámara:", error);
    const seccion = $("historialCamara");
    if (seccion) AttemptHistory.render(seccion, {
      tipo: "camara",
      intentos: [],
      error: "No se pudo cargar el historial. Comprueba la conexión e inténtalo de nuevo.",
    });
  }
}

function pintarHistorialCamara(historial) {
  const seccion = $("historialCamara");
  if (seccion) AttemptHistory.render(seccion, { tipo: "camara", intentos: historial });
}

// ---------------------------------------------------------------- carga de recursos
async function comenzar() {
  limpiarError();
  $("btnComenzar").disabled = true;
  $("btnRepetir").disabled = true;
  mostrarPantalla("pantallaInicio");
  try {
    await prepararRecursos();
  } catch (error) {
    console.error(error);
    detenerCamara();
    mostrarError("No pudimos acceder a tu cámara. Revisa los permisos del navegador y vuelve a intentarlo", comenzar);
    $("btnComenzar").disabled = false;
    $("estadoCarga").textContent = "";
    return;
  }
  $("estadoCarga").textContent = "";
  $("btnComenzar").disabled = false;
  iniciarSesion();
}

/** Carga solo lo que falte: al repetir, el modelo y MediaPipe ya estan en memoria. */
async function prepararRecursos() {
  if (!clasificador) {
    $("estadoCarga").textContent = "Cargando modelo de letras...";
    clasificador = await cargarModelo();
    control = new ControlSostener({ umbral: UMBRAL_CONFIANZA, sostenerMs: SOSTENER_MS });
  }
  if (!landmarker) {
    $("estadoCarga").textContent = "Cargando detector de manos...";
    landmarker = await cargarMediaPipe();
  }
  if (!stream) {
    $("estadoCarga").textContent = "Abriendo la cámara...";
    await abrirCamara();
  }
}

async function cargarModelo() {
  let modelo;
  try {
    const respuesta = await fetch(MODELO_URL);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    modelo = await respuesta.json();
  } catch (error) {
    console.error("Modelo:", error);
    throw new Error("No se pudo cargar el modelo de reconocimiento de letras. Recarga la página o avisa al administrador.");
  }
  if (!modelo || !Array.isArray(modelo.letras) || !Array.isArray(modelo.X) || !Array.isArray(modelo.y)) {
    throw new Error("El archivo del modelo de letras no tiene el formato esperado.");
  }
  return new ClasificadorKNN(modelo);
}

async function cargarMediaPipe() {
  try {
    // Import dinamico para poder mostrar un mensaje si el CDN no responde.
    const { FilesetResolver, HandLandmarker } = await import(MEDIAPIPE_URL);
    const archivos = await FilesetResolver.forVisionTasks(WASM_URL);
    const detector = await HandLandmarker.createFromOptions(archivos, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL },
      runningMode: "VIDEO",
      numHands: 1,
    });
    conexionesMano = HandLandmarker.HAND_CONNECTIONS;
    return detector;
  } catch (error) {
    console.error("MediaPipe:", error);
    throw new Error("No se pudo cargar el detector de manos (MediaPipe). Revisa tu conexión a internet y vuelve a intentar.");
  }
}

async function abrirCamara() {
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Tu navegador no permite usar la cámara en esta página. Ábrela desde https o desde localhost / 127.0.0.1.");
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
    stream.getVideoTracks().forEach((pista) => pista.addEventListener("ended", camaraDesconectada));
    video.srcObject = stream;
    await video.play();
  } catch (error) {
    detenerCamara();
    throw new Error(mensajeErrorCamara(error));
  }
}

function mensajeErrorCamara(error) {
  switch (error && error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "No diste permiso para usar la cámara. Actívalo en el ícono de la barra de direcciones y pulsa «Reintentar».";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No encontramos ninguna cámara conectada a tu equipo.";
    case "NotReadableError":
    case "AbortError":
      return "La cámara está ocupada por otra aplicación o no responde. Ciérrala y pulsa «Reintentar».";
    default:
      return `No se pudo abrir la cámara${error && error.message ? `: ${error.message}` : "."}`;
  }
}

function camaraDesconectada() {
  if (!sesion || sesion.terminada) return;
  abandonarSesion();
  detenerCamara();
  mostrarPantalla("pantallaInicio");
  mostrarError("Se perdió la conexión con la cámara. La evaluación se canceló y no se guardó nada.", comenzar);
}

function detenerCamara() {
  if (idAnimacion !== null) cancelAnimationFrame(idAnimacion);
  idAnimacion = null;
  if (stream) stream.getTracks().forEach((pista) => pista.stop());
  stream = null;
  video.srcObject = null;
  ultimoTiempoVideo = -1;
}

// ---------------------------------------------------------------- sesion
function elegirLetras(letras) {
  const disponibles = letras.filter((letra) => !LETRAS_EXCLUIDAS.includes(letra));
  for (let i = disponibles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [disponibles[i], disponibles[j]] = [disponibles[j], disponibles[i]];
  }
  return disponibles.slice(0, LETRAS_POR_SESION);
}

function iniciarSesion() {
  const letras = elegirLetras(clasificador.letras);
  if (!letras.length) {
    detenerCamara();
    mostrarError("No hay letras para evaluar: revisa LETRAS_EXCLUIDAS.", null);
    return;
  }
  sesion = { letras, indice: -1, intentos: [], estados: letras.map(() => "pendiente"), objetivo: null, inicio: 0, mejorConfianza: 0, bloqueada: true, terminada: false };
  pintarPuntos();
  mostrarPantalla("pantallaEvaluacion");
  siguienteLetra();
  if (idAnimacion === null) idAnimacion = requestAnimationFrame(bucle);
}

function siguienteLetra() {
  idPausa = null;
  sesion.indice++;
  if (sesion.indice >= sesion.letras.length) {
    terminarSesion();
    return;
  }
  const total = sesion.letras.length;
  const letra = sesion.letras[sesion.indice];
  sesion.objetivo = letra;
  sesion.mejorConfianza = 0;
  sesion.inicio = performance.now();
  sesion.bloqueada = false;
  control.reiniciar();

  $("contador").textContent = `Letra ${sesion.indice + 1} de ${total}`;
  pintarPuntos();
  $("letraObjetivo").textContent = letra;
  $("instruccionLetra").textContent = `Haz la letra ${letra} y mantenla un segundo.`;
  $("tiempoRestante").innerHTML = `<svg class="icon icon16" aria-hidden="true"><use href="#i-clock"></use></svg> ${Math.ceil(LIMITE_MS / 1000)} s`;
  $("barraTiempoPanel").style.width = "100%";
  $("barraTiempoPanel").parentElement.setAttribute("aria-valuenow", Math.ceil(LIMITE_MS / 1000));
  $("tiempoPanelValor").textContent = `${Math.ceil(LIMITE_MS / 1000)} s`;
  $("barraTiempoPanel").parentElement.classList.remove("poco");
  $("tiempoRestante").classList.remove("poco");
  $("barraTiempoPanel").style.width = "100%";
  $("barraTiempoPanel").parentElement.setAttribute("aria-valuenow", Math.ceil(LIMITE_MS / 1000));
  $("tiempoPanelValor").textContent = `${Math.ceil(LIMITE_MS / 1000)} s`;
  $("barraTiempoPanel").parentElement.classList.remove("poco");
  pintarSostener(0);
  $("estadoVideo").dataset.estado = "";
  actualizarEstadoVideo("sinMano");
}

function registrarIntento(acerto, confianza, ahora, omitida = false) {
  sesion.bloqueada = true;
  sesion.intentos.push({
    letra_objetivo: sesion.objetivo,
    acerto,
    tiempo_ms: Math.round(ahora - sesion.inicio),
    confianza: Math.round(confianza * 100) / 100,
  });
  sesion.estados[sesion.indice] = acerto ? "acertada" : "fallada";
  pintarPuntos();
  pintarSostener(acerto ? 1 : 0);
  actualizarEstadoVideo(acerto ? "acierto" : omitida ? "omitida" : "fallo", sesion.objetivo);
  idPausa = setTimeout(siguienteLetra, acerto ? 800 : PAUSA_ENTRE_LETRAS_MS);
}

function terminarSesion() {
  sesion.terminada = true;
  detenerCamara();
  pintarResumen(sesion.intentos);
  mostrarPantalla("pantallaResumen");
  enviarResultado(sesion.intentos);
}

/** Descarta la sesion a medias: no se envia nada. */
function abandonarSesion() {
  if (idPausa !== null) clearTimeout(idPausa);
  idPausa = null;
  sesion = null;
}

function salir(destino) {
  abandonarSesion();
  detenerCamara();
  window.location.href = destino;
}

/** Si la pestaña se oculta, el tiempo de la letra se congela hasta que vuelva. */
function pausarAlOcultar() {
  if (document.hidden) {
    ocultaDesde = performance.now();
  } else if (ocultaDesde !== null) {
    if (sesion && !sesion.bloqueada) {
      sesion.inicio += performance.now() - ocultaDesde;
      control.reiniciar();
    }
    ocultaDesde = null;
  }
}

// ---------------------------------------------------------------- deteccion
function bucle() {
  idAnimacion = requestAnimationFrame(bucle);
  if (video.readyState < 2 || video.currentTime === ultimoTiempoVideo) return;
  ultimoTiempoVideo = video.currentTime;
  if (canvas.width !== video.videoWidth) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const ahora = performance.now();
  let prediccion = null;
  let puntos = null;
  try {
    const res = landmarker.detectForVideo(video, ahora);
    puntos = res.landmarks && res.landmarks[0];
    if (puntos) {
      const categorias = (res.handedness || res.handednesses || [])[0];
      const mano = categorias && categorias[0] ? categorias[0].categoryName : "Right";
      // Se usa el fotograma ORIGINAL (sin espejar), igual que en el entrenamiento.
      const vector = normalizarLandmarks(landmarksAPixeles(puntos, video.videoWidth, video.videoHeight), mano);
      if (vector) prediccion = clasificador.predecir(vector);
    }
  } catch (error) {
    console.warn("Fotograma descartado:", error);
  }
  dibujarMano(puntos);

  $("detectado").textContent = prediccion
    ? `Detectado: ${prediccion.letra} (${Math.round(prediccion.confianza * 100)} %)`
    : "Detectado: —";
  if (!sesion || sesion.bloqueada) return;
  if (!prediccion) actualizarEstadoVideo("sinMano");
  else if (prediccion.letra !== sesion.objetivo) actualizarEstadoVideo("incorrecta", sesion.objetivo);

  if (prediccion && prediccion.letra === sesion.objetivo) {
    sesion.mejorConfianza = Math.max(sesion.mejorConfianza, prediccion.confianza);
  }
  const { progreso, logrado } = control.actualizar(sesion.objetivo, prediccion, ahora);
  pintarSostener(progreso);
  if (progreso > 0 && !logrado) actualizarEstadoVideo("sosteniendo");

  const restante = LIMITE_MS - (ahora - sesion.inicio);
  $("tiempoRestante").innerHTML = `<svg class="icon icon16" aria-hidden="true"><use href="#i-clock"></use></svg> ${Math.max(0, Math.ceil(restante / 1000))} s`;
  $("tiempoRestante").classList.toggle("poco", restante <= 5000);

  const segundosRestantes = Math.max(0, Math.ceil(restante / 1000));
  $("tiempoPanelValor").textContent = `${segundosRestantes} s`;
  $("barraTiempoPanel").style.width = `${Math.max(0, Math.min(100, (restante / LIMITE_MS) * 100))}%`;
  $("barraTiempoPanel").parentElement.setAttribute("aria-valuenow", segundosRestantes);
  $("barraTiempoPanel").parentElement.classList.toggle("poco", restante <= 5000);

  // Al acertar se envia la confianza del fotograma; al fallar, la mejor que logro la letra pedida.
  if (logrado) registrarIntento(true, prediccion.confianza, ahora);
  else if (restante <= 0) registrarIntento(false, sesion.mejorConfianza, ahora);
}

function dibujarMano(puntos) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!puntos) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = COLOR_TRAZO_MANO;
  for (const c of conexionesMano) {
    ctx.beginPath();
    ctx.moveTo(puntos[c.start].x * w, puntos[c.start].y * h);
    ctx.lineTo(puntos[c.end].x * w, puntos[c.end].y * h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLOR_PUNTO_MANO;
  for (const p of puntos) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pintarSostener(progreso) {
  const valor = Math.round(progreso * 100);
  $("anilloValor").style.strokeDashoffset = `${169.65 * (1 - progreso)}`;
  $("porcentajeSostener").textContent = `${valor}%`;
  $("anilloDeteccion").setAttribute("aria-valuenow", valor);
}

// ---------------------------------------------------------------- resumen y envio
function pintarResumen(intentos, oficial = null) {
  const total = Number(oficial?.total ?? intentos.length);
  const correctas = Number(oficial?.correctas ?? intentos.filter(i => i.acerto).length);
  const porcentaje = Number(oficial?.porcentaje ?? Math.floor(correctas * 100 / Math.max(1,total)));
  const umbral = Number(oficial?.umbral_aplicado ?? PORCENTAJE_APROBADO);
  const aprobado = typeof oficial?.aprobado === 'boolean' ? oficial.aprobado : correctas * 100 >= umbral * total;
  const falladas = intentos.filter(i => !i.acerto);
  const tiempos = intentos.filter(i => i.acerto && Number.isFinite(i.tiempo_ms)).map(i => i.tiempo_ms);
  const promedio = tiempos.length ? (tiempos.reduce((s,t)=>s+t,0)/tiempos.length/1000).toFixed(1)+' s' : '—';
  const items = intentos.map(i => { const ok=Boolean(i.acerto), agotado=!ok&&Number(i.tiempo_ms)>=LIMITE_MS; return { etiqueta:i.letra_objetivo, acierto:ok, detalle:ok?Math.max(1,Math.round(Number(i.tiempo_ms)/1000))+' s':agotado?'Tiempo agotado':'Fallo' }; });
  const slugSeguro=encodeURIComponent(slugCurso), cursoUrl=`curso.html?curso=${slugSeguro}&plantilla=15`, repetirUrl=`evaluacion-camara.html?curso=${slugSeguro}`;
  renderResultados({ curso:datosCursoResultado, modo:'camara', total, correctas, porcentaje, umbral, items, estadistica2:{valor:promedio,etiqueta:'Promedio por letra acertada'}, repasar:falladas.map(i=>i.letra_objetivo), insignia:{nueva:Boolean(oficial?.insignia_100_nueva),id:'curso-completado',curso100:oficial?.insignia_100||null}, slug:slugCurso, cursoUrl, repetirUrl, iconoCurso:datosCursoResultado.icono }, $('resumenLocal'), {onClose:()=>salir(cursoUrl)});
  datosFinalesAnimacion={porcentaje,umbral,correctas,total,promedioTexto:promedio,aprobado};
}

function limpiarAnimacionResultado(){ if(resultAnimFrame!==null) cancelAnimationFrame(resultAnimFrame); resultAnimFrame=null; resultTimers.forEach(clearTimeout); resultTimers=[]; resultAnimacionActiva=false; }
function iniciarAnimacionResultado(){}
function terminarAnimacionResultado(){}
function saltarAnimacionResultado(){}async function enviarResultado(intentos) {
  if (enviando) return; enviando=true; limpiarError(); if($('btnRepetir')) $('btnRepetir').disabled=true;
  const estado=$('resumenLocal').querySelector('[data-saved]'); if(estado){estado.className='estadoGuardado guardando';estado.textContent='Guardando tu resultado...';}
  try { const datos=await api(RUTA_RESULTADO,{metodo:'POST',cuerpo:{curso:slugCurso,intentos}}); pintarResumen(intentos,datos); pintarRespuestaServidor(); }
  catch(error) { console.error('Envio:',error); mostrarError(mensajeErrorEnvio(error),()=>enviarResultado(intentos)); }
  finally { enviando=false; if($('btnRepetir')) $('btnRepetir').disabled=false; }
}

function pintarRespuestaServidor() { /* El componente compartido renderiza el estado de guardado. */ }

function mensajeErrorEnvio(error) {
  if (error instanceof TypeError) return "No se pudo conectar con el servidor para guardar tu resultado. Revisa tu conexión y pulsa «Reintentar».";
  if (error.status === 403 || error.status === 404) return "El servidor no acepta la evaluación con cámara para este curso.";
  const detalle = typeof error.message === "string" && !error.message.includes("[object") ? error.message : "";
  return `No se pudo guardar tu resultado${detalle ? `: ${detalle}` : "."} Pulsa «Reintentar».`;
}

// ---------------------------------------------------------------- utilidades de pantalla
function mostrarPantalla(id) {
  ['pantallaInicio','pantallaEvaluacion','pantallaResumen'].forEach((p)=>{ $(p).hidden=p!==id; });
  const resultado=id==='pantallaResumen'; $('tarjetaCamaraNueva').classList.toggle('tarjetaResultadoActiva',resultado); $('textoBotonSalir').textContent=resultado?'Cerrar':'Salir'; $('btnSalirEvaluacion').querySelector('use').setAttribute('href',resultado?'#i-x':'#i-arrow-left');
  if(resultado) $('resumenLocal').querySelector('.resultadoCerrar')?.focus(); else if(resultAnimacionActiva) limpiarAnimacionResultado();
}

function mostrarError(texto,reintento) {
  const inicio=!$('pantallaInicio').hidden; accionReintento=reintento;
  if(inicio){ $('mensaje').hidden=false; mostrarMensaje('mensaje',texto); $('btnComenzar').hidden=Boolean(reintento); $('btnReintentar').hidden=!reintento; }
  else { const estado=$('resumenLocal').querySelector('[data-saved]'); if(estado){estado.className='estadoGuardado incorrecto';estado.innerHTML=`<span>No pudimos guardar tu resultado.</span><button type="button" class="btnReintentarGuardado">Reintentar</button>`;estado.querySelector('button').addEventListener('click',()=>reintento&&reintento());} }
}

function limpiarError() {
  mostrarMensaje('mensaje',''); $('mensaje').hidden=true; accionReintento=null;
  if($('estadoGuardado')){ $('estadoGuardado').hidden=true; $('btnReintentarError').hidden=true; }
  if($('btnComenzar')){ $('btnComenzar').hidden=false; $('btnReintentar').hidden=true; }
}

function esc(valor) {
  return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function pintarPuntos() {
  if (!sesion) return;
  $("puntosLetras").innerHTML = sesion.estados.map((estado, indice) => {
    const actual = indice === sesion.indice && !sesion.terminada;
    const clase = actual ? "actual" : estado;
    return `<span class="puntoLetra ${clase}" aria-label="Letra ${indice + 1}: ${actual ? "actual" : estado === "pendiente" ? "pendiente" : estado}">${estado === "acertada" ? "✓" : estado === "fallada" ? "×" : ""}</span>`;
  }).join("");
}

function actualizarEstadoVideo(tipo, objetivo = "") {
  const caja = $("estadoVideo");
  if (caja.dataset.estado === tipo && caja.dataset.objetivo === objetivo) return;
  caja.dataset.estado = tipo;
  caja.dataset.objetivo = objetivo;
  const estados = { sinMano: ["info-circle", "No veo tu mano"], incorrecta: ["info-circle", `Esa no es la ${objetivo}`], sosteniendo: ["check", "¡Casi! Mantén la seña"], acierto: ["check", "¡Letra correcta!"], fallo: ["clock", "Se acabó el tiempo"], omitida: ["arrow-right", "Letra marcada como fallo"] };
  const [icono, texto] = estados[tipo] || estados.sinMano;
  caja.className = `estadoVideo ${tipo}`;
  const videoCamara = caja.closest(".videoCamara");
  videoCamara.classList.toggle("estadoAcertado", tipo === "acierto");
  videoCamara.classList.toggle("estadoSosteniendo", tipo === "sosteniendo");
  videoCamara.classList.toggle("estadoIncorrecto", tipo === "incorrecta");
  videoCamara.classList.toggle("estadoFallo", tipo === "fallo" || tipo === "omitida");
  caja.innerHTML = `<svg class="icon icon16" aria-hidden="true"><use href="#i-${icono}"></use></svg><span>${texto}</span>`;
}
