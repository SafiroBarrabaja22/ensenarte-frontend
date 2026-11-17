"""
Politica de seguridad de contenido (CSP) del frontend: UNICA fuente.

GitHub Pages no deja configurar cabeceras HTTP, asi que la politica va en una
etiqueta <meta http-equiv="Content-Security-Policy"> en cada pagina. Este
script la escribe (o la actualiza) en todos los .html:

    python scripts/aplicar_csp.py

Si cambias algo de abajo (por ejemplo el dominio del backend en config.js),
vuelve a correrlo y commitea los .html.

Que hace la politica: el navegador SOLO ejecuta scripts de este sitio y de
cdn.jsdelivr.net (MediaPipe), y SOLO se conecta a la API y a los servidores de
MediaPipe. Si alguien lograra inyectar HTML, su <script> en linea no correria y
no podria enviar los tokens a un servidor suyo.
"""

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# Debe coincidir con BACKEND_PRODUCCION y BACKEND_LOCAL de js/config.js.
BACKEND_PRODUCCION = "https://cachyos-x8664.tailb93c3e.ts.net"
BACKEND_LOCAL = "http://127.0.0.1:8000 http://localhost:8000"

POLITICA = {
    # Por defecto, solo este sitio.
    "default-src": "'self'",
    # Scripts: los archivos propios y MediaPipe (evaluacion con camara).
    # 'wasm-unsafe-eval' permite compilar el WebAssembly de MediaPipe; NO
    # habilita eval() de JavaScript. Ningun script en linea.
    "script-src": "'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'",
    # Estilos: hojas propias y Google Fonts. 'unsafe-inline' porque las paginas
    # usan atributos style="..." (los estilos no ejecutan codigo).
    "style-src": "'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src": "'self' https://fonts.gstatic.com",
    # Imagenes: assets propios, subidas del backend (/media/) y vistas previas.
    "img-src": f"'self' data: blob: {BACKEND_PRODUCCION} {BACKEND_LOCAL}",
    "media-src": f"'self' blob: {BACKEND_PRODUCCION} {BACKEND_LOCAL}",
    # fetch(): la API, el wasm de MediaPipe y el modelo de la mano.
    "connect-src": f"'self' {BACKEND_PRODUCCION} {BACKEND_LOCAL} https://cdn.jsdelivr.net https://storage.googleapis.com",
    "worker-src": "'self' blob:",
    # Formulario de contacto.
    "form-action": "'self' https://formsubmit.co",
    "base-uri": "'self'",
    "object-src": "'none'",
}

CONTENIDO = "; ".join(f"{directiva} {valor}" for directiva, valor in POLITICA.items())
META = f'<meta http-equiv="Content-Security-Policy" content="{CONTENIDO}">'
EXISTENTE = re.compile(r'[ \t]*<meta http-equiv="Content-Security-Policy"[^>]*>(\r?\n)?')
# Algunas paginas tienen el <head> en una sola linea y otras usan CRLF.
CHARSET = re.compile(r'([ \t]*)(<meta charset="UTF-8">)(\r?\n)?', re.I)


def paginas():
    return sorted(list(RAIZ.glob("*.html")) + list(RAIZ.glob("pages/**/*.html")))


def aplicar():
    for pagina in paginas():
        texto = pagina.read_text(encoding="utf-8")
        texto = EXISTENTE.sub("", texto)
        # Justo despues de <meta charset>: tiene que ir antes de cualquier
        # recurso para que lo cubra.
        texto, cambios = CHARSET.subn(
            lambda m: f"{m.group(1)}{m.group(2)}{m.group(3) or ''}{m.group(1)}{META}{m.group(3) or ''}",
            texto, count=1,
        )
        if not cambios:
            sys.exit(f"{pagina}: no tiene <meta charset=\"UTF-8\">")
        pagina.write_text(texto, encoding="utf-8")
    print(f"CSP aplicada en {len(paginas())} paginas.")


if __name__ == "__main__":
    aplicar()
