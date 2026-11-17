# enSEÑArte — Frontend

Cliente web del aplicativo de aprendizaje de Lengua de Señas Colombiana (LSC).
HTML, CSS y JavaScript sin frameworks ni proceso de compilación: se abre con
cualquier servidor estático.

Consume la API del repositorio
[`ensenarte-backend`](../ensenarte-backend). Este repositorio no contiene lógica
de negocio ni acceso a base de datos.

---

## Puesta en marcha

Necesitas el backend corriendo en `http://127.0.0.1:8000`. Después:

**Opción A — Live Server (VS Code)**
Instala la extensión *Live Server*, clic derecho sobre `index.html` →
*Open with Live Server*. Queda en `http://127.0.0.1:5500`.

**Opción B — Python**
```bash
python -m http.server 5500
```

**Opción C — Node**
```bash
npx serve -l 5500
```

> Ábrelo siempre por HTTP, nunca con doble clic (`file://`). El navegador
> bloquea las peticiones a la API desde `file://` por política de CORS.

Si cambias el puerto, agrégalo a `CORS_ALLOWED_ORIGINS` en el `.env` del
backend.

---

## Configuración

Toda la configuración está en `js/config.js`:

```js
const CONFIG = {
  BACKEND_PRODUCCION: "https://cachyos-x8664.tailb93c3e.ts.net",
  BACKEND_LOCAL: "http://127.0.0.1:8000",
  RUTA_IMAGENES: "assets/imagenes/",
  RUTA_VIDEOS: "assets/videos/",
  AVATAR_POR_DEFECTO: "imgPredeterminadaUsuario.png",
};
```

`API_BASE_URL` se calcula solo: abierto en `localhost`/`127.0.0.1` usa
`BACKEND_LOCAL`; en GitHub Pages (`https://safirobarrabaja22.github.io/ensenarte-frontend/`)
usa `BACKEND_PRODUCCION`. Si cambia el dominio del backend, se cambia solo ahí.
Despliegue completo: `docs/DESPLIEGUE.md` del backend.

---

## Estructura

```
ensenarte-frontend/
├── index.html              Portada pública
├── css/
│   ├── style.css           Hoja original del proyecto, sin cambios
│   ├── extra.css           Mensajes de error y estados de carga
│   └── panel.css           Estilos del panel administrativo
├── js/
│   ├── config.js           URL de la API y rutas de assets
│   ├── api.js              Cliente HTTP, sesión y refresco de token
│   ├── auth.js             Registro, login, perfil, contraseñas
│   ├── layout.js           Cabecera y menú compartidos
│   └── pages/              Un script por página
│       ├── login.js registro.js recuperar.js
│       ├── cursos.js curso.js diccionario.js
│       ├── evaluacion.js retroalimentacion.js
│       ├── inicio-usuario.js perfil.js editar-perfil.js
│       └── panel/
│           ├── layout-panel.js dashboard.js
│           └── preguntas.js diccionario.js
├── pages/
│   ├── login.html signup.html recuperar.html
│   ├── cursos.html cursos-usuario.html curso.html
│   ├── diccionario.html evaluacion.html retroalimentacion.html
│   ├── inicio-usuario.html perfil.html editar-perfil.html
│   ├── contacto.html sobre-nosotros.html
│   └── panel/
│       ├── index.html      Resumen y CRUD de cursos
│       ├── preguntas.html  CRUD de preguntas y opciones
│       └── diccionario.html CRUD del diccionario
└── assets/
    ├── imagenes/           Portadas, avatares e imágenes de las señas
    └── videos/             Gifs de las señas
```

---

## Los assets van aquí

La base de datos guarda **solo el nombre del archivo**
(`abecedario/a.gif`), no la imagen. Los archivos viven en este repositorio.

Copia tus carpetas originales `static/imagenes/` y `static/videos/` dentro de
`assets/`. Dos cosas a tener en cuenta:

- **Usa siempre minúsculas en los nombres de carpeta.** El proyecto original
  mezclaba `videos/` y `VIDEOS/`; en Windows daba igual, pero en Linux (que es
  donde se despliega) son carpetas distintas y las imágenes no cargan.
- El nombre que escribas en el panel administrativo debe coincidir exactamente
  con el archivo, incluida la subcarpeta si la hay.

Los avatares que espera `editar-perfil.html` son:
`imgPredeterminadaUsuario.png`, `opcionUnoPerfil.png`, `opcionDosPerfil.png`,
`opcionTresPerfil.png`, `opcionCuatroPerfil.png`, `opcionCincoPerfil.png`.

---

## Cómo se maneja la sesión

No hay cookies de sesión de Django. El flujo es:

1. `login.html` envía usuario y contraseña a `/api/auth/login/`.
2. La API devuelve `access`, `refresh` y los datos del usuario.
3. Todo se guarda en `localStorage` bajo las claves `ensenarte_tokens` y
   `ensenarte_usuario`.
4. `api.js` adjunta `Authorization: Bearer <access>` en cada petición.
5. Si la API responde 401, `api.js` intenta refrescar el token una sola vez; si
   tampoco funciona, limpia la sesión y redirige al login.

Las páginas protegidas llaman a `requiereSesion()` antes de pintar nada.

---

## Equivalencia con las plantillas originales

| Plantilla Django | Página nueva |
|---|---|
| `base.html` / `baseUsuarios.html` | `js/layout.js` (función `montarLayout`) |
| `index.html` | `index.html` |
| `indexUsuario.html` | `pages/inicio-usuario.html` |
| `cursos.html` | `pages/cursos.html` |
| `cursosUsuarios.html` | `pages/cursos-usuario.html` |
| `baseSelectorCursos.html` | `pages/curso.html?curso=<slug>` |
| `diccionario.html` | `pages/diccionario.html?curso=<slug>` |
| `evaluadorCursos.html` | `pages/evaluacion.html?curso=<slug>` |
| `retroalimentacion.html` | `pages/retroalimentacion.html?curso=<slug>` |
| `login.html` / `signup.html` / `recuperar.html` | mismas, en `pages/` |
| `perfilUsuario.html` / `editarPerfil.html` | `pages/perfil.html` y `pages/editar-perfil.html` |
| `contac.html` / `contacUsers.html` | `pages/contacto.html` (una sola, se adapta a la sesión) |
| `sobreNosotros.html` | `pages/sobre-nosotros.html` |
| `panelCursos/*.html` | `pages/panel/` |

Donde antes había `{% url 'nombre' %}` ahora hay enlaces relativos, y donde
había `{{ variable }}` ahora hay una llamada a la API que inyecta el dato con
JavaScript. Las clases CSS se conservaron idénticas para no tocar `style.css`.

---

## Antes de entregar

- [ ] Copiar `imagenes/` y `videos/` dentro de `assets/`, todo en minúsculas.
- [ ] Cambiar el correo de destino en el formulario de `pages/contacto.html`.
- [ ] Ajustar `API_BASE_URL` si el backend no corre en el puerto 8000.
- [ ] Revisar que el puerto del frontend esté en `CORS_ALLOWED_ORIGINS`.

---

## Despliegue

Es un sitio estático: sirve en GitHub Pages, Netlify, Vercel o cualquier CDN.

Para GitHub Pages: *Settings → Pages → Source: rama `main`, carpeta `/ (root)`*.
Luego agrega la URL resultante a `CORS_ALLOWED_ORIGINS` del backend y actualiza
`API_BASE_URL` en `js/config.js`.
