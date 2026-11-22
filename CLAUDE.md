# CLAUDE.md — ensenarte-frontend

Cliente web de enSEÑArte (aprendizaje de Lengua de Señas Colombiana, LSC).
Consume la API del repositorio hermano `../ensenarte-backend`; aquí no hay
lógica de negocio ni acceso a base de datos. Contrato de la API en
`../ensenarte-backend/docs/API.md`.

## Stack y versiones

- **HTML + CSS + JavaScript sin framework, sin bundler y sin `package.json`.**
  No hay dependencias npm ni `requirements.txt` en este repo; no hay paso de
  compilación.
- Scripts clásicos cargados con `<script src>` en orden y que comparten
  globales (`CONFIG`, `Sesion`, `api`, `Auth`, `montarLayout`, ...). Solo
  [js/pages/evaluacion-camara.js](js/pages/evaluacion-camara.js),
  [js/lib/lsc-reconocedor.js](js/lib/lsc-reconocedor.js) y
  [js/pages/retroalimentacion.js](js/pages/retroalimentacion.js) usan ES modules.
- Dependencias externas por CDN (únicas):
  - `@mediapipe/tasks-vision@0.10.14` desde cdn.jsdelivr.net (bundle + wasm).
  - Modelo `hand_landmarker.task` (float16/1) desde storage.googleapis.com.
  - `formsubmit.co` en el formulario de contacto (correo de destino aún es un placeholder).
- Modelo KNN de reconocimiento de letras: [assets/modelos/modelo_knn.json](assets/modelos/modelo_knn.json).
  `lsc-reconocedor.js` debe replicar la normalización de `landmarks_utils.py`,
  script que **no está en ninguno de los dos repos**.
- Cache-busting manual con `?v=N` en los `<script>`; al cambiar un JS, sube el
  número en las páginas que lo cargan.

## Cómo correrlo

Siempre por HTTP en el puerto 5500 (nunca `file://`), con el backend en
`http://127.0.0.1:8000`:

```bash
python -m http.server 5500     # o Live Server de VS Code / npx serve -l 5500
```

Validación existente: [scripts/validate-evaluation-history.ps1](scripts/validate-evaluation-history.ps1)
(comprueba que las páginas de evaluación carguen el componente de historial).
No hay tests automáticos.

## Estructura

```
ensenarte-frontend/
├── index.html                 Portada pública
├── css/                       tokens.css (variables) → style.css | panel.css → extra.css → componentes.css
├── js/
│   ├── config.js              CONFIG (API_BASE_URL, rutas de assets), rutaImagen/rutaVideo, prefijoRaiz
│   ├── api.js                 Sesion (localStorage), api(), refresco de token, ROLES/ACCESO/exigirRol
│   ├── auth.js                Auth: registro, login, perfil, contraseñas
│   ├── layout.js              Cabecera/menú compartido (montarLayout)
│   ├── lib/                   lsc-reconocedor.js, historial-intentos.js,
│   │                          servicio-historial-intentos.js, resultados.js
│   └── pages/                 Un script por página
│       └── panel/             layout-panel.js (acceso + apiPanel), dashboard.js,
│                              preguntas.js, diccionario.js, recursos.js, selector-recursos.js
├── pages/                     Páginas de usuario (curso, diccionario, evaluacion,
│   │                          evaluacion-camara, evaluaciones, perfil, ...)
│   └── panel/                 index.html (cursos), preguntas.html, diccionario.html, recursos.html
├── assets/
│   ├── imagenes/              Portadas, abecedario/, pronombres/, íconos
│   ├── videos/                Gifs de señas (pronombres/)
│   └── modelos/modelo_knn.json
├── scripts/                   validate-evaluation-history.ps1
└── docs/                      (vacía)
```

Las páginas viven en tres profundidades (`/`, `/pages/`, `/pages/panel/`);
`prefijoRaiz()` calcula el `../` necesario para assets y enlaces.

## Modelos (vistos desde el frontend)

El frontend no define modelos; consume el JSON de la API. Entidades que maneja:
`Curso` (identificado por el slug `nombre`, que va en `?curso=<slug>`),
`Pregunta` → `OpcionPregunta`, `PalabraDiccionario`, `ProgresoUsuario`,
`IntentoEvaluacion`, `EvaluacionCamara`, `RecursoVisual`, y el perfil del
usuario. Detalle de campos y relaciones en el `CLAUDE.md` del backend.

Rutas de archivos: la API devuelve strings que pueden ser un nombre relativo
(se resuelve contra `assets/imagenes/` o `assets/videos/` de este repo), una
ruta `/media/...` (se resuelve contra el origen de `API_BASE_URL`) o una URL
absoluta. Usa siempre `rutaImagen()` / `rutaVideo()` de `config.js`.

## Endpoints que consume

Todos con `api()` (o `apiPanel()`, que añade un timeout de 12 s) y rutas
relativas a `CONFIG.API_BASE_URL` (en local, puerto 5500: `http://127.0.0.1:8000/api`; en
Docker: `<mismo dominio>/api`, que el nginx reenvía al backend):

- Auth: `/auth/registro/`, `/auth/login/`, `/auth/refresh/`, `/auth/perfil/`
  (GET/PATCH, FormData para foto), `/auth/cambiar-password/`,
  `/auth/recuperar/solicitar/`, `/auth/recuperar/confirmar/`.
- Catálogo: `/cursos/`, `/cursos/<slug>/`, `/cursos/<slug>/diccionario/`, `/progreso/`.
- Evaluación: `/cursos/<slug>/evaluacion/{iniciar,responder,resultado,historial}/`.
- Cámara: `/evaluacion-camara/` y `/evaluacion-camara/?curso=<slug>`.
- Panel: `/panel/resumen/`, `/panel/cursos/`, `/panel/preguntas/`,
  `/panel/opciones/`, `/panel/diccionario/` (+ `reordenar/`),
  `/panel/recursos/` (con `?categoria=`, `?page=`, búsqueda), `/panel/archivos/`.

`comoLista(datos)` normaliza respuestas paginadas (`results`) y no paginadas.

## Roles en el frontend

El backend devuelve `usuario.roles`, un arreglo con valores de `Estudiante`,
`Profesor`, `Interprete`, `CreadorDeCursos` y `Administrador`. Todo vive en
[js/api.js](js/api.js):

- `ROLES`: los nombres, que deben coincidir con `ensenarte-backend/apps/usuarios/roles.py`.
  No escribas esos strings en otro archivo.
- `ACCESO`: quién entra a cada tipo de página. `APRENDIZAJE` admite cualquier rol,
  `PANEL_CONTENIDO` a Profesor, Creador y Admin, y `BIBLIOTECA` a Intérprete y Admin.
  Debe reflejar `apps/cursos/permissions.py`.
- `tieneRol(usuario, ACCESO.X)` y `paginaInicioDe(usuario)`, que da el inicio
  según el rol: panel, biblioteca o inicio de usuario.
- `exigirRol(ACCESO.X)`: **toda página protegida empieza con
  `if (!(await exigirRol(...))) return;`**. Pide `/auth/perfil/` al servidor
  (no confía en el localStorage) y, si el rol no alcanza, redirige con
  `location.replace` al inicio del rol con `?acceso=denegado`, que muestra un aviso.
  Si el usuario no tiene ningún rol, muestra un bloqueo.
- **No pintar antes de verificar:** las páginas protegidas tienen
  `<body class="... paginaProtegida">`. [css/extra.css](css/extra.css) las oculta
  hasta que `exigirRol` agrega `accesoVerificado`. Toda página protegida nueva
  necesita esa clase y la llamada a `exigirRol`.
- **Menú:** `montarLayout` ([js/layout.js](js/layout.js)) arma los enlaces según
  el rol. Los enlaces escritos en el HTML con `data-acceso="BIBLIOTECA"` (u otra
  clave de `ACCESO`) se eliminan si el rol no corresponde.
- **403:** `api()` lanza `ApiError` con el mensaje "Permiso denegado: tu rol no
  permite realizar esta acción." seguido del `detail` del backend.
- Esto es solo control de la interfaz. La autorización real la hace la API.

## Autenticación contra la API

Implementada en [js/api.js](js/api.js) y [js/auth.js](js/auth.js):

1. `Auth.iniciarSesion(nombre, password)` → `POST /auth/login/` con
   `{username, password}`.
2. Guarda `{access, refresh}` en `localStorage["ensenarte_tokens"]` y el perfil
   en `localStorage["ensenarte_usuario"]`.
3. `api()` añade `Authorization: Bearer <access>` cuando `autenticado` es `true`
   (por defecto). Las llamadas públicas pasan `autenticado: false`.
4. Ante un 401 llama a `POST /auth/refresh/` y reintenta la petición una vez.
   - Las peticiones simultáneas comparten un solo refresco (`refrescoEnCurso`),
     porque el backend **rota** el refresh y un segundo refresco con el viejo
     fallaría.
   - Guarda el access **y** el refresh nuevos.
   - Si otra pestaña ya rotó el refresh, usa el suyo.
   - Un error de red no cierra la sesión.
   - Si el refresco falla, llama a `Sesion.cerrar()` y redirige a
     `pages/login.html?sesion=expirada`, que muestra un aviso.
   - `Sesion.cerrar()` borra ambos tokens y el usuario del localStorage, y
     manda `POST /auth/logout/` con `keepalive` para invalidar el refresh en el
     servidor. Todo cierre de sesión debe pasar por `Sesion.cerrar()`.
5. Las páginas protegidas llaman a `exigirRol(ACCESO.X)` (en el panel lo hace
   `montarPanel()`) antes de pintar. Ver "Roles en el frontend".
6. Un 403 se muestra como "Permiso denegado", no como error genérico.

Sin cookies ni CSRF. Backend: access 15 min y refresh 7 días con rotación.
En producción (Docker) la API está en el mismo dominio que las páginas, así que no hay CORS;
en desarrollo, el backend autoriza los orígenes de `:5500`. Errores de la API se convierten en `ApiError` con el mensaje
de `detail` o del primer error de validación de DRF.

Otro estado del cliente: `sessionStorage` (`evaluacion-items-<slug>`,
`evaluacion-resultado-<slug>`) y `localStorage` (`evaluacion-mejor-<slug>`).

## Seguridad del cliente

- **CSP:** cada página lleva `<meta http-equiv="Content-Security-Policy">`, generada por
  [scripts/aplicar_csp.py](scripts/aplicar_csp.py) (**única fuente**; para cambiarla,
  edita el script y córrelo: `python scripts/aplicar_csp.py`). Solo se ejecutan scripts
  del propio sitio y de cdn.jsdelivr.net (MediaPipe). Por eso:
  - **Ningún `<script>` en línea ni atributos `onclick=`/`onerror=`**: todo el JS va en
    archivos (`js/pages/inicio.js` y `js/pages/pagina-publica.js` reemplazaron los que había).
  - Un dominio nuevo para la API o un CDN nuevo hay que agregarlo en `aplicar_csp.py`.
- **Escapar todo dato de la API antes de `innerHTML`:** `escaparHtml()` (global, en
  `config.js`) o el `esc()` local de cada página. Incluye las rutas de `rutaImagen()` /
  `rutaVideo()` dentro de `src="..."`. Si no hace falta HTML, usa `textContent`.
- **Sin estilos en línea:** la CSP no lleva `'unsafe-inline'`, así que ningún HTML ni plantilla
  de JS puede usar `style="..."`. Para valores calculados (porcentajes, variables CSS) usa
  `data-css="--var: valor"` y, después de pintar, `aplicarVariablesCss(contenedor)` (config.js).
  Para mostrar u ocultar, la clase `.oculto` o `element.style.display` desde JS.
- **Toda promesa se espera o termina en `.catch(errorInesperado)`** (config.js), incluido el
  `(async function iniciar() {...})().catch(errorInesperado);` de cada página.
- Cada campo de formulario tiene su `<label for>` (si no se ve, con la clase `soloLectores`).
- Cada página carga `layout.js` **una sola vez**, después de `config.js` y `api.js`.
- Formatos de imagen permitidos (`recursos.js`, `selector-recursos.js`): los mismos que
  `apps/cursos/archivos.py` del backend.

## Configuración

Todo en [js/config.js](js/config.js). `API_BASE_URL`: en el puerto 5500 (Live Server)
usa `BACKEND_LOCAL`; en cualquier otro caso, el mismo dominio de la página. En Docker,
[docker/nginx.conf](docker/nginx.conf) reenvía `/api/`, `/admin/`, `/media/` y `/static/`
al backend. Si cambias `BACKEND_LOCAL`, cámbialo también en `scripts/aplicar_csp.py`. Al tocar
config.js, sube `config.js?v=` en todos los HTML. Las rutas siguen siendo relativas y las
mayúsculas deben coincidir exactamente (Linux las distingue). Ya no se usa GitHub Pages.
Además: `RUTA_IMAGENES`,
`RUTA_VIDEOS`, `AVATAR_POR_DEFECTO`, `CURSOS_CON_EVALUACION_CAMARA`
(hoy `["abecedario"]`). `js/config.local.js` está en `.gitignore`.
Si cambia el puerto u origen del frontend, debe agregarse a
`CORS_ALLOWED_ORIGINS` del backend.

## Línea gráfica

Orden de carga en **todas** las páginas: `tokens.css` → `style.css` (usuario) o
`panel.css` (panel) → `extra.css` → `componentes.css`.

- [css/tokens.css](css/tokens.css) es la única fuente de colores (`--color-*`),
  tipografía (`--fuente-base`, que es DM Sans y la importa ese archivo), radios
  (`--radio-xs` a `--radio-pill` y `--radio-circulo`), sombras (`--sombra-sm`,
  `--sombra-md`, `--sombra-lg`, `--anillo-foco`, `--contorno-foco`) y los tokens
  de componentes (`--boton-*`, `--campo-*`, `--tarjeta-*`).
- **No escribas colores en hex, `rgb()` ni con nombre** en ninguna otra hoja ni
  en el JS. Para transparencias usa
  `color-mix(in srgb, var(--color-teal) 30%, transparent)`. El canvas de la
  cámara lee los tokens con `getComputedStyle`.
- [css/componentes.css](css/componentes.css), que se carga al final, da el
  mismo aspecto a botones (principal, `--secundario`, `--peligro`,
  `--compacto`), campos, tarjetas y `mensajeError`/`mensajeOk` en las vistas
  de usuario y en el panel. Las clases antiguas (`panelBtn`, `botonGuardarPerfil`,
  `inputLogin`, `panelCard`, ...) están agrupadas ahí por variante. Para algo
  nuevo usa `.boton`, `.campo` y `.tarjeta`. Los botones del hero (`btnHome`,
  `contactButton`) son acentos propios y no entran en esas variantes.
- Si cambias una hoja, sube su `?v=` en las páginas que la cargan.

## Convenciones

- **Idioma:** código, comentarios, textos de interfaz y mensajes de commit en
  español.
- **Nombres en español**, siguiendo lo que ya existe: funciones y objetos
  (`iniciarSesion`, `requiereSesion`, `montarPanel`, `rutaImagen`, `Sesion`,
  `Auth`), variables (`respuesta`, `datos`, `cuerpo`, `metodo`, `slugCurso`),
  archivos con guiones (`editar-perfil.js`, `evaluacion-camara.html`),
  clases/ids CSS en camelCase en español (`mensajeError`, `botonSecundario`,
  `formLogin`). Las claves de JSON son las del backend (snake_case en español:
  `es_correcta`, `password_nueva`).
- No renombrar clases de [css/style.css](css/style.css): se conservaron
  idénticas a las plantillas originales.
- Nombres de carpetas y archivos de assets en minúsculas (Linux distingue
  mayúsculas).
- Sin frameworks ni bundler: no introducir dependencias npm sin acordarlo.
- **Migraciones siempre versionadas:** este repo no tiene base de datos; cuando
  un cambio del frontend requiera cambiar modelos, la migración se genera y se
  commitea en `ensenarte-backend` junto al cambio de modelo.

## Descarga de reportes (PDF / Excel)

- **Nunca uses un `<a href>` directo a la API para descargar:** no lleva el JWT y responde 401.
- Cualquier botón con `data-descargar="/reportes/..."` (y opcionalmente `data-nombre` y
  `data-mensaje`) se descarga solo: el listener de [js/api.js](js/api.js) llama a
  `descargarArchivo()`, que usa `api(ruta, { binario: true })` (fetch con token y refresco,
  convertido en blob) y dispara la descarga con un enlace temporal. El nombre sale de
  `Content-Disposition`.
- **Dónde están los botones:**
  - Constancia: en `curso.js`, si el curso está completado.
  - Progreso: en la tabla de cursos del panel (`dashboard.js`).
  - Estadísticas de la plataforma: en el panel, solo con `ACCESO.REPORTE_PLATAFORMA`
    (Administrador).
