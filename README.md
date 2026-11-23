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
  BACKEND_LOCAL: "http://127.0.0.1:8000",
  PUERTO_DESARROLLO: "5500",
  RUTA_IMAGENES: "assets/imagenes/",
  RUTA_VIDEOS: "assets/videos/",
  AVATAR_POR_DEFECTO: "imgPredeterminadaUsuario.png",
};
```

`API_BASE_URL` se calcula solo:

- **Puerto 5500** (Live Server / `http.server`): usa `BACKEND_LOCAL`, el `runserver` de
  desarrollo.
- **Cualquier otro caso** (Docker en la miniPC): usa el mismo dominio de la página, porque
  el nginx reenvía `/api/` al backend.

No hay que poner el dominio de producción en ningún archivo.

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
- [ ] Ajustar `BACKEND_LOCAL` en `js/config.js` si el backend local no corre en el puerto 8000.
- [ ] Revisar que el puerto del frontend esté en `CORS_ALLOWED_ORIGINS`.

---

## Despliegue con Docker

En producción el frontend corre en la miniPC dentro de un contenedor **nginx**
([Dockerfile](Dockerfile), [docker/nginx.conf](docker/nginx.conf)):

- **Contenido:** sirve las páginas, CSS, JS y assets.
- **Proxy:** reenvía `/api/`, `/admin/`, `/media/` y `/static/` al contenedor del
  backend. La API queda en el mismo dominio que las páginas.
- **Cabeceras:** agrega las de seguridad que el `<meta>` de la CSP no puede poner
  (`frame-ancestors`, `X-Frame-Options`, `Permissions-Policy` para la cámara).
- **HTTPS:** se publica en `127.0.0.1:8080` y Tailscale Funnel lo expone con HTTPS.
  La evaluación con cámara (MediaPipe) solo funciona por HTTPS.

Se levanta junto con el backend desde un único `docker-compose.yml`. **La guía completa
está en el README del backend, sección "Despliegue con Docker"**; en resumen:

```bash
cd /srv/ensenarte                                    # carpeta que contiene los dos repos
git clone https://github.com/SafiroBarrabaja22/ensenarte-backend.git
git clone https://github.com/SafiroBarrabaja22/ensenarte-frontend.git
cp ensenarte-backend/despliegue/docker-compose.yml .
cp ensenarte-backend/despliegue/docker.env.example .env && chmod 600 .env && nano .env
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
sudo tailscale funnel --bg 8080
```

**MySQL en la miniPC (no en Docker):**
- su `bind-address` no puede ser solo `127.0.0.1`;
- el usuario de la base tiene que poder entrar desde la red de Docker (`'<usuario>'@'172.%'`).

Detalle en el README del backend, paso 3.

**Para actualizar el frontend:** `git -C ensenarte-frontend pull && docker compose up -d --build frontend`.

Ya no se publica en GitHub Pages.
