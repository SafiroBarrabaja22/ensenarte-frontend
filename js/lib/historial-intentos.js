/* Componente universal de historial para todas las modalidades de evaluación. */
(function (global) {
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const fechaCorta = value => {
    if (!value) return "";
    const fecha = new Date(value);
    return Number.isNaN(fecha.getTime()) ? "" : new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(fecha);
  };

  function normalizar(items) {
    return (Array.isArray(items) ? items : []).map((item, indice) => {
      const total = Number(item.total || 0);
      const puntos = Number(item.puntaje ?? item.porcentaje ?? (total ? Number(item.aciertos || 0) * 100 / total : 0));
      return { puntos: Math.max(0, Math.min(100, Math.round(Number.isFinite(puntos) ? puntos : 0))), fecha: item.fecha || item.fecha_fin || item.created_at, indice };
    }).sort((a, b) => {
      const fa = Date.parse(a.fecha), fb = Date.parse(b.fecha);
      return Number.isFinite(fa) && Number.isFinite(fb) ? fa - fb : a.indice - b.indice;
    }).slice(-5);
  }

  function grafica(items) {
    const width = 700, height = 200, padY = 20;
    const plotHeight = height - padY * 2;
    const puntos = items.map((item, i) => ({
      ...item,
      x: width * (i + 0.5) / items.length,
      y: padY + (100 - item.puntos) / 100 * plotHeight,
    }));
    const d = puntos.map((p, i) => {
      if (!i) return `M ${p.x} ${p.y}`;
      const anterior = puntos[i - 1], dx = (p.x - anterior.x) / 3;
      return `C ${anterior.x + dx} ${anterior.y} ${p.x - dx} ${p.y} ${p.x} ${p.y}`;
    }).join(" ");
    const etiquetas = puntos.map((_, i) => `<span>${i === puntos.length - 1 ? "Hoy" : `Intento ${i + 1}`}</span>`).join("");
    const linea = puntos.length > 1
      ? `<path class="attemptChartLine" d="${d}"/>`
      : "";
    return `<div class="attemptChart"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Progreso de los últimos ${items.length} intentos"><line class="attemptChartGuide" x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}"/>${linea}${puntos.map((p, i) => `<circle class="attemptChartPoint ${i === puntos.length - 1 ? "isLatest" : ""}" cx="${p.x}" cy="${p.y}" r="${i === puntos.length - 1 ? 7 : 5.5}"/>`).join("")}</svg></div><div class="attemptChartLabels" data-css="--point-count:${items.length}">${etiquetas}</div>`;
  }

  function animar(root, puntaje, cantidad) {
    if (global.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const duracionDonut = 900;
    const anillo = root.querySelector(".attemptDonutProgress");
    const numero = root.querySelector("[data-score-count]");
    const insignia = root.querySelector(".attemptHistoryBadge");
    const linea = root.querySelector(".attemptChartLine");
    const puntos = [...root.querySelectorAll(".attemptChartPoint")];
    const etiquetas = [...root.querySelectorAll(".attemptChartLabels span")];
    const tarjetas = [...root.querySelectorAll(".attemptSessionCard")];

    if (puntaje > 0) {
      anillo.animate(
        [{ strokeDashoffset: "100" }, { strokeDashoffset: String(100 - puntaje) }],
        { duration: duracionDonut, easing: "ease-out", fill: "forwards" },
      );
      numero.textContent = "0%";
      const inicio = performance.now();
      const contar = ahora => {
        const avance = Math.min(1, (ahora - inicio) / duracionDonut);
        const suavizado = 1 - (1 - avance) ** 3;
        numero.textContent = `${Math.round(puntaje * suavizado)}%`;
        if (avance < 1) requestAnimationFrame(contar);
      };
      requestAnimationFrame(contar);
    }

    if (linea) {
      linea.animate(
        [
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0 0 0)" },
        ],
        { duration: 1000, delay: 100, easing: "ease-out", fill: "both" },
      );
    }

    puntos.forEach((punto, i) => {
      const fraccion = cantidad <= 1 ? 0 : i / (cantidad - 1);
      const delay = 100 + fraccion * 1000;
      punto.animate(
        [{ opacity: 0, transform: "scale(.35)" }, { opacity: 1, transform: "scale(1)" }],
        { duration: 240, delay, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" },
      );
      etiquetas[i]?.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 220, delay, easing: "ease-out", fill: "forwards" },
      );
    });

    tarjetas.forEach((tarjeta, i) => tarjeta.animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 300, delay: 600 + i * 60, easing: "ease-out", fill: "forwards" },
    ));
    if (insignia) insignia.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 240, delay: duracionDonut, easing: "ease-out", fill: "forwards" },
    );
  }

  /**
   * Boton "Exportar PDF" (solo si hay intentos). `exportar` = { curso, mensaje }:
   * el PDF lo genera el backend con el mismo diseno de esta tarjeta. Lo descarga
   * el listener global de data-descargar (api.js), que manda el token.
   */
  function botonExportar(exportar, camara) {
    if (!exportar || !exportar.curso) return "";
    const tipo = camara ? "camara" : "preguntas";
    const ruta = `/reportes/historial/${encodeURIComponent(exportar.curso)}/?tipo=${tipo}`;
    const icono = typeof global.iconoSvg === "function" ? global.iconoSvg("download", "icon icon16") : "";
    return `<button type="button" class="boton boton--secundario boton--compacto attemptHistoryExport"
      data-descargar="${escapeHtml(ruta)}" data-nombre="historial-${escapeHtml(exportar.curso)}-${tipo}.pdf"
      data-mensaje="${escapeHtml(exportar.mensaje || "mensaje")}">${icono}Exportar PDF</button>`;
  }

  function render(root, { tipo = "normal", intentos = [], titulo, error = "", exportar = null } = {}) {
    if (typeof root === "string") root = document.querySelector(root);
    if (!root) throw new Error("AttemptHistory requiere un contenedor en la página de evaluación.");
    const wrapper = root.closest(".evaluationPreparation");
    if (!wrapper || !wrapper.querySelector("[data-evaluation-start]")) throw new Error("El historial debe estar dentro del wrapper compartido con el botón de inicio.");
    const camara = tipo === "camara", sesiones = normalizar(intentos);
    const encabezado = titulo || (camara ? "Tu progreso con cámara" : "Tu progreso");
    const subtitulo = "Revisa tus últimas sesiones antes de comenzar";
    if (!sesiones.length) {
      const estado = error
        ? `<p class="attemptHistoryEmpty isError">${escapeHtml(error)}</p>`
        : '<p class="attemptHistoryEmpty">Aún no tienes intentos</p>';
      root.innerHTML = `<section class="attemptHistoryCard isEmpty"><header><h2>${escapeHtml(encabezado)}</h2><p>${subtitulo}</p></header>${estado}</section>`;
      return;
    }
    const ultima = sesiones.at(-1), anterior = sesiones.at(-2);
    const diferencia = anterior ? ultima.puntos - anterior.puntos : null;
    const comparacion = anterior
      ? `<span class="attemptHistoryBadge ${diferencia > 0 ? "isPositive" : ""}">${diferencia === 0 ? "= Sin cambios" : `${diferencia > 0 ? "↗" : "↘"} ${diferencia > 0 ? "+" : ""}${diferencia} puntos`} frente a tu sesión anterior (${anterior.puntos}%)</span>`
      : "";
    const tarjetas = sesiones.map((item, i) => `<article class="attemptSessionCard" role="listitem"><span>Sesión ${i + 1}</span><strong>${item.puntos}%</strong><time>${escapeHtml(fechaCorta(item.fecha))}</time></article>`).join("");
    root.innerHTML = `<section class="attemptHistoryCard"><header><div><h2>${escapeHtml(encabezado)}</h2><p>${subtitulo}</p></div>${botonExportar(exportar, camara)}</header><div class="attemptHistorySummary"><div class="attemptDonut" role="img" aria-label="Última sesión: ${ultima.puntos}%"><svg viewBox="0 0 160 160" aria-hidden="true"><circle class="attemptDonutTrack" cx="80" cy="80" r="72"/><circle class="attemptDonutProgress" cx="80" cy="80" r="72" pathLength="100" data-css="stroke-dashoffset:${100 - ultima.puntos}"/></svg><div><strong data-score-count>${ultima.puntos}%</strong><small>Última sesión</small></div></div>${comparacion ? `<div class="attemptHistoryCompare">${comparacion}</div>` : ""}</div><h3>Tus últimos intentos</h3>${grafica(sesiones)}<div class="attemptSessionCards" role="list">${tarjetas}</div></section>`;
    global.aplicarVariablesCss(root);
    animar(root, ultima.puntos, sesiones.length);
  }

  global.AttemptHistory = { render };
})(window);
