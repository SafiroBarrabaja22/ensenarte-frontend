"""
Politica de seguridad de contenido (CSP) del frontend: UNICA fuente.

La politica va en una etiqueta <meta http-equiv="Content-Security-Policy"> en
cada pagina, asi funciona igual con nginx (Docker) y con Live Server. Lo unico
que no admite <meta>, frame-ancestors, lo envia nginx como cabecera
(docker/nginx.conf). Este script escribe (o actualiza) la etiqueta en todos los .html:

    python scripts/aplicar_csp.py

Si cambias algo de abajo (por ejemplo el dominio del backend en config.js),
vuelve a correrlo y commitea los .html.

Que hace la politica: el navegador SOLO ejecuta scripts de este sitio y de
cdn.jsdelivr.net (MediaPipe), y SOLO se conecta a la API y a los servidores de
MediaPipe. Si alguien lograra inyectar HTML, su <script> en linea no correria y
no podria enviar los tokens a un servidor suyo.
"""

import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# En produccion la API esta en el mismo dominio que las paginas (proxy de nginx,
# docker/nginx.conf): la cubre 'self'. BACKEND_LOCAL es el runserver de
# desarrollo (Live Server en el 5500); debe coincidir con js/config.js.
BACKEND_LOCAL = "http://127.0.0.1:8000 http://localhost:8000"

POLITICA = {
    # Por defecto, solo este sitio.
    "default-src": "'self'",
    # Scripts: los archivos propios y MediaPipe (evaluacion con camara).
    # 'wasm-unsafe-eval' permite compilar el WebAssembly de MediaPipe; NO
    # habilita eval() de JavaScript. Ningun script en linea.
    "script-src": "'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'",
    # Estilos: solo hojas propias y Google Fonts. Sin 'unsafe-inline': ninguna
    # pagina usa atributos style="..." ni <style>; los valores calculados se
    # aplican desde JS con element.style (aplicarVariablesCss en config.js).
    "style-src": "'self' https://fonts.googleapis.com",
    "font-src": "'self' https://fonts.gstatic.com",
    # Imagenes: assets propios, subidas del backend (/media/) y vistas previas.
    "img-src": f"'self' data: blob: {BACKEND_LOCAL}",
    "media-src": f"'self' blob: {BACKEND_LOCAL}",
    # fetch(): la API, el wasm de MediaPipe y el modelo de la mano.
    "connect-src": f"'self' {BACKEND_LOCAL} https://cdn.jsdelivr.net https://storage.googleapis.com",
    "worker-src": "'self' blob:",
    # Formulario de contacto.
    "form-action": "'self' https://formsubmit.co",
    "base-uri": "'self'",
    "object-src": "'none'",
}

CONTENIDO = "; ".join(f"{directiva} {valor}" for directiva, valor in POLITICA.items())
META = f'<meta http-equiv="Content-Security-Policy" content="{CONTENIDO}">'
INICIO_CSP = '<meta http-equiv="Content-Security-Policy"'
CHARSET = '<meta charset="UTF-8">'


# Paginas a las que se aplica la CSP. La lista es fija a proposito: el script
# solo escribe en estos archivos. Si creas una pagina nueva, agregala aqui.
PAGINAS = (
    "index.html",
    "pages/contacto.html",
    "pages/curso.html",
    "pages/cursos-usuario.html",
    "pages/cursos.html",
    "pages/diccionario.html",
    "pages/editar-perfil.html",
    "pages/evaluacion-camara.html",
    "pages/evaluacion.html",
    "pages/evaluaciones.html",
    "pages/inicio-usuario.html",
    "pages/login.html",
    "pages/panel/diccionario.html",
    "pages/panel/index.html",
    "pages/panel/preguntas.html",
    "pages/panel/recursos.html",
    "pages/panel/validacion.html",
    "pages/panel/vista-previa.html",
    "pages/perfil.html",
    "pages/recuperar.html",
    "pages/retroalimentacion.html",
    "pages/signup.html",
    "pages/sobre-nosotros.html",
)


def paginas_sin_registrar():
    """Paginas .html que existen pero no estan en PAGINAS (solo para avisar)."""
    existentes = {p.relative_to(RAIZ).as_posix() for p in RAIZ.glob("*.html")}
    existentes |= {p.relative_to(RAIZ).as_posix() for p in RAIZ.glob("pages/**/*.html")}
    return sorted(existentes - set(PAGINAS))


def quitar_csp(texto):
    """Quita la etiqueta CSP existente, con su sangria y su salto de linea."""
    inicio = texto.find(INICIO_CSP)
    if inicio < 0:
        return texto
    fin = texto.index(">", inicio) + 1
    while inicio > 0 and texto[inicio - 1] in " \t":
        inicio -= 1
    if texto.startswith("\r\n", fin):
        fin += 2
    elif texto.startswith("\n", fin):
        fin += 1
    return texto[:inicio] + texto[fin:]


def insertar_csp(texto):
    """
    Pone la CSP justo despues de <meta charset> (tiene que ir antes de cualquier
    recurso para cubrirlo), con la misma sangria y el mismo salto de linea.
    Algunas paginas tienen el <head> en una sola linea y otras usan CRLF.
    """
    inicio = texto.find(CHARSET)
    if inicio < 0:
        return None
    fin = inicio + len(CHARSET)
    comienzo_linea = texto.rfind("\n", 0, inicio) + 1
    sangria = texto[comienzo_linea:inicio]
    if sangria.strip():          # hay otras etiquetas antes en la misma linea
        sangria = ""
    salto = "\r\n" if texto.startswith("\r\n", fin) else "\n" if texto.startswith("\n", fin) else ""
    if salto:
        return texto[:fin + len(salto)] + sangria + META + salto + texto[fin + len(salto):]
    return texto[:fin] + META + texto[fin:]


def aplicar():
    faltan = paginas_sin_registrar()
    if faltan:
        sys.exit("Agrega estas paginas a PAGINAS en scripts/aplicar_csp.py: " + ", ".join(faltan))
    for relativa in PAGINAS:
        pagina = RAIZ / relativa
        texto = insertar_csp(quitar_csp(pagina.read_text(encoding="utf-8")))
        if texto is None:
            sys.exit(f"{relativa}: no tiene <meta charset=\"UTF-8\">")
        pagina.write_text(texto, encoding="utf-8")
    print(f"CSP aplicada en {len(PAGINAS)} paginas.")


if __name__ == "__main__":
    aplicar()
