# Imagen del frontend de enSEÑArte: nginx sirve las paginas y hace de proxy
# hacia el backend (docker/nginx.conf). Guia: README.md, "Despliegue con Docker".
#
# nginx-unprivileged es la variante oficial de nginx que corre sin root (usuario
# 101). Por eso escucha en el 8080 dentro del contenedor: un usuario sin
# privilegios no puede abrir el 80.
FROM nginxinc/nginx-unprivileged:alpine

# Configuracion del sitio (reemplaza la de ejemplo de la imagen).
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Solo lo que el navegador necesita; scripts/, docs/ y la documentacion no se publican.
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY pages/ /usr/share/nginx/html/pages/
COPY assets/ /usr/share/nginx/html/assets/

EXPOSE 8080
# La imagen ya usa este usuario; se repite para dejarlo explicito.
USER 101
