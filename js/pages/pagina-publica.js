/**
 * Paginas informativas (contacto, sobre nosotros): solo montan la cabecera.
 * Antes era un <script> en linea con un error de sintaxis (tenia otra etiqueta
 * <script> dentro), asi que la cabecera no se mostraba.
 */
montarLayout(Sesion.activa() ? "usuario" : "publico");
