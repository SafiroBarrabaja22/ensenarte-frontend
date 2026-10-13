const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/** Render común para evaluaciones de preguntas y cámara. */
export function renderResultados(resultado, root, opciones = {}) {
  const { curso, modo, total, correctas, porcentaje, umbral = 70, items = [], estadistica2, repasar = [], insignia, slug, cursoUrl, repetirUrl, iconoCurso = "books" } = resultado;
  const pregunta = modo === "preguntas", aprobado = porcentaje >= umbral, unidad = pregunta ? "pregunta" : "letra", plural = `${unidad}${total === 1 ? "" : "s"}`, correctLabel = pregunta ? (total === 1 ? "pregunta correcta" : "preguntas correctas") : (total === 1 ? "letra correcta" : "letras correctas");
  const nombreCurso = /^curso\s*\d+$/i.test(String(curso?.nombre || "").trim()) ? "Curso" : curso?.nombre || "Curso";
  const cols = total % 5 === 0 ? 5 : total % 4 === 0 ? 4 : total === 1 ? 1 : 3;
  const bad = items.filter(x => x.acierto === false);
  root.className = "resultadoUnificado resumenCamara tarjetaResultadoUnificada";
  root.innerHTML = `<header class="resultadoCabecera"><span class="resultadoCursoIcon"><svg class="icon icon26" aria-hidden="true"><use href="#i-${esc(iconoCurso)}"></use></svg></span><h1>${esc(nombreCurso)} · Evaluación ${pregunta ? "de preguntas" : "con cámara"}</h1><button type="button" class="botonResultadoSecundario resultadoCerrar">Cerrar</button></header>
  <section class="heroResultadoCamara"><div class="anilloResultadoCamara ${aprobado ? "aprobado" : "noAprobado"}" data-ring><svg viewBox="0 0 150 150" aria-hidden="true"><circle class="anilloResultadoFondo" cx="75" cy="75" r="62"/><circle class="anilloResultadoProgreso" data-arc cx="75" cy="75" r="62"/></svg><span class="marcaUmbralAnillo" style="transform:translate(-50%,-50%) rotate(${umbral*3.6}deg) translateY(-62px)" aria-hidden="true"></span><div class="puntosCelebracion" aria-hidden="true">${Array.from({length:6},()=>"<i></i>").join("")}</div><div class="rafagaResultado" aria-hidden="true"></div><div class="valorAnilloResultado"><strong data-percent aria-hidden="true">0%</strong><span>de aciertos</span></div><span class="medallonResultado ${aprobado?"":"noAprobado"}" data-chip aria-hidden="true"><svg class="icon icon20"><use href="#i-${aprobado?"award":"repeat"}"></use></svg></span></div><div class="textoResultado"><h2>${aprobado?"¡Aprobaste!":"¡Casi lo logras!"}</h2><p>${aprobado?`Hiciste ${correctas} de ${total} ${plural} correctamente.`:`Hiciste ${correctas} de ${total} ${plural}. Puedes intentarlo de nuevo cuando quieras.`}</p></div></section>
  <span class="soloLectores" data-live role="status" aria-live="polite"></span><section class="datosClaveResultado"><article><strong>${correctas} de ${total}</strong><span>${correctLabel}</span></article><article><strong>${esc(estadistica2?.valor ?? "—")}</strong><span>${esc(estadistica2?.etiqueta ?? "Mejor puntaje")}</span></article><article><strong>${umbral}%</strong><span>para aprobar</span></article></section>
  <section class="detalleResultado"><h2>${pregunta?"Tus respuestas":"Tus letras"}</h2><div class="cuadriculaLetrasResultado" style="--cols:${cols}">${items.map((x,i)=>`<article class="resultadoLetra ${x.acierto===null?"sinDetalle":x.acierto?"correcta":"fallida"}" style="--i:${i}"><strong>${esc(x.etiqueta)}</strong><span><svg class="icon icon16" aria-hidden="true"><use href="#i-${x.acierto===null?"help-circle":x.acierto?"check":"x"}"></use></svg>${esc(x.detalle)}</span></article>`).join("")}</div></section>
  ${aprobado&&insignia?.nueva?`<section class="insigniaDesbloqueada"><svg class="icon icon52"><use href="#i-insignia-${esc(insignia.id||"curso-completado")}"></use></svg><div><strong>¡Insignia desbloqueada!</strong><p>Curso completado · ya la puedes ver en tu perfil</p></div>${porcentaje===100?'<span class="insigniaPerfecta">Puntaje perfecto</span>':""}</section>`:""}
  ${bad.length?`<section class="bloquePracticar"><div class="letrasPracticar">${repasar.map(x=>`<span>${esc(x)}</span>`).join("")}</div><div class="textoPracticar"><strong>${pregunta?"Para repasar":"Letras para practicar"}</strong><a href="diccionario.html?curso=${encodeURIComponent(slug||"")}"><svg class="icon icon16"><use href="#i-book-2"></use></svg> Repasar en el diccionario</a></div></section>`:""}
  <div class="accionesResultado">${aprobado?`<a class="botonResultadoSecundario" href="${esc(repetirUrl)}"><svg class="icon icon16"><use href="#i-repeat"></use></svg> Repetir evaluación</a>`:""}<a class="botonResultadoPrincipal" href="${esc(aprobado?cursoUrl:repetirUrl)}">${aprobado?"Volver al curso":"Repetir evaluación"}</a></div><div class="estadoGuardado correcto" data-saved><span><svg class="icon icon16"><use href="#i-check"></use></svg> Resultado guardado en tu perfil</span></div>`;
  root.querySelector(".resultadoCerrar")?.addEventListener("click", opciones.onClose || (()=>history.back()));
  const arc=root.querySelector("[data-arc]"), ring=root.querySelector("[data-ring]"), pct=root.querySelector("[data-percent]"), circumference=2*Math.PI*62, reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.querySelectorAll(".resultadoLetra").forEach((el,i)=>el.style.setProperty("--delay",`${1500+i*90}ms`));
  const delayPost=1500+Math.max(0,total-1)*90+550+700;
  [".insigniaDesbloqueada",".bloquePracticar",".accionesResultado",".estadoGuardado"].forEach(sel=>root.querySelector(sel)?.style.setProperty("--postletters-delay",`${delayPost}ms`));
  arc.style.strokeDasharray=circumference; arc.style.strokeDashoffset=circumference;
  const complete=()=>{arc.style.strokeDashoffset=circumference*(1-porcentaje/100);pct.textContent=`${porcentaje}%`;ring.classList.toggle("alcanzoMeta",porcentaje>=umbral);pct.classList.toggle("superaUmbral",porcentaje>=umbral);root.querySelector("[data-live]").textContent=`${aprobado?"Aprobaste":"No aprobaste"} con ${porcentaje}%. ${correctas} de ${total} ${correctLabel}.`;};
  if(reduce) complete(); else {
    root.classList.add("resultadoAnimando");
    const particles=root.querySelector(".puntosCelebracion"), burst=root.querySelector(".rafagaResultado");
    if(aprobado&&burst) for(let i=0;i<14;i++){
      const el=document.createElement("i"),angle=Math.PI*2*i/14,radius=70+(i%3)*18;
      el.style.setProperty("--x",`${Math.cos(angle)*radius}px`);el.style.setProperty("--y",`${Math.sin(angle)*radius}px`);burst.append(el);
    }
    let raf,done=false;
    const clear=()=>{cancelAnimationFrame(raf);root.removeEventListener("click",skip);document.removeEventListener("keydown",key);window.removeEventListener("pagehide",clear);};
    const finish=skipNow=>{if(done)return;done=true;clear();complete();if(aprobado){particles?.classList.add("mostrar");burst?.classList.add("rafagaActiva");}root.querySelector("[data-chip]").classList.add("chipAparece");if(skipNow){root.classList.add("animacionFinalizada");root.classList.remove("resultadoAnimando");}};
    const skip=()=>finish(true),key=e=>{if(e.key==="Escape")finish(true);};
    const start=performance.now(),duration=1500;
    const step=now=>{if(done)return;const t=Math.min(1,(now-start)/duration),e=1-Math.pow(1-t,3),value=Math.round(porcentaje*e);arc.style.strokeDashoffset=circumference*(1-porcentaje*e/100);pct.textContent=`${value}%`;ring.classList.toggle("alcanzoMeta",value>=umbral);pct.classList.toggle("superaUmbral",value>=umbral);if(t<1)raf=requestAnimationFrame(step);else finish(false);};
    raf=requestAnimationFrame(step);root.addEventListener("click",skip,{once:true});document.addEventListener("keydown",key);window.addEventListener("pagehide",clear,{once:true});
  }
}
