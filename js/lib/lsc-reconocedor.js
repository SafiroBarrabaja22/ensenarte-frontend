/**
 * Reconocedor de letras de la lengua de señas colombiana (LSC) en el navegador.
 *
 * Es lógica pura (sin DOM ni librerías externas) para poder reutilizarla en cualquier
 * página del frontend. Replica EXACTAMENTE la normalización de landmarks_utils.py:
 * si una de las dos cambia, hay que cambiar la otra o el modelo falla sin dar errores.
 *
 * Uso:
 *   import { normalizarLandmarks, landmarksAPixeles, ClasificadorKNN } from './lsc-reconocedor.js';
 *   const modelo = await (await fetch('modelo_knn.json')).json();
 *   const knn = new ClasificadorKNN(modelo);
 *   const vec = normalizarLandmarks(landmarksAPixeles(lm, ancho, alto), 'Right');
 *   const { letra, confianza } = knn.predecir(vec);
 */

export const MUNECA = 0;
export const BASE_DEDO_MEDIO = 9;

/**
 * Convierte los landmarks normalizados de MediaPipe (x, y en 0..1) a "píxeles":
 * (x*ancho, y*alto, z*ancho). Es la misma convención que usa el script de Python.
 * @param {{x:number,y:number,z:number}[]} landmarks 21 puntos
 */
export function landmarksAPixeles(landmarks, ancho, alto) {
  return landmarks.map((p) => [p.x * ancho, p.y * alto, p.z * ancho]);
}

/**
 * 1. Traslada: la muñeca (punto 0) queda en el origen.
 * 2. Escala: divide entre la distancia 3D muñeca -> base del dedo medio (punto 9).
 * 3. Si la mano es "Left", invierte el signo de x (todas quedan como "Right").
 * @param {number[][]} puntosPx 21 puntos [x, y, z] en píxeles
 * @param {'Left'|'Right'} mano etiqueta de MediaPipe
 * @returns {Float64Array|null} vector de 63 números, o null si los puntos son degenerados
 */
export function normalizarLandmarks(puntosPx, mano, unificarMano = true) {
  const w = puntosPx[MUNECA];
  const m = puntosPx[BASE_DEDO_MEDIO];
  const escala = Math.hypot(m[0] - w[0], m[1] - w[1], m[2] - w[2]);
  if (!(escala >= 1e-6)) return null;
  const signo = unificarMano && mano === 'Left' ? -1 : 1;
  const out = new Float64Array(63);
  for (let i = 0; i < 21; i++) {
    out[3 * i] = (signo * (puntosPx[i][0] - w[0])) / escala;
    out[3 * i + 1] = (puntosPx[i][1] - w[1]) / escala;
    out[3 * i + 2] = (puntosPx[i][2] - w[2]) / escala;
  }
  return out;
}

/**
 * KNN con distancia euclidiana y voto simple entre los k vecinos
 * (igual que el que evalúa 03_entrenar.py). La confianza es la fracción de
 * vecinos que votan por la letra ganadora; en un empate gana la letra de menor índice.
 */
export class ClasificadorKNN {
  /** @param {{k:number, letras:string[], n_caracteristicas:number, X:number[][], y:number[]}} modelo */
  constructor(modelo) {
    this.k = modelo.k;
    this.letras = modelo.letras;
    this.d = modelo.n_caracteristicas;
    this.n = modelo.y.length;
    this.y = Int32Array.from(modelo.y);
    this.X = new Float64Array(this.n * this.d);
    for (let i = 0; i < this.n; i++) this.X.set(modelo.X[i], i * this.d);
  }

  /** @param {ArrayLike<number>} v vector de 63 números ya normalizado */
  predecir(v) {
    const { k, d, n, X, y, letras } = this;
    const mejorDist = new Float64Array(k).fill(Infinity);
    const mejorIdx = new Int32Array(k).fill(-1);

    for (let i = 0; i < n; i++) {
      const off = i * d;
      const peor = mejorDist[k - 1];
      let dist = 0;
      let descartar = false;
      for (let j = 0; j < d; j++) {
        const t = X[off + j] - v[j];
        dist += t * t;
        if (dist >= peor) { descartar = true; break; }   // ya no entra entre los k mejores
      }
      if (descartar) continue;
      let pos = k - 1;
      while (pos > 0 && mejorDist[pos - 1] > dist) {
        mejorDist[pos] = mejorDist[pos - 1];
        mejorIdx[pos] = mejorIdx[pos - 1];
        pos--;
      }
      mejorDist[pos] = dist;
      mejorIdx[pos] = i;
    }

    const votos = new Int32Array(letras.length);
    for (let q = 0; q < k; q++) if (mejorIdx[q] >= 0) votos[y[mejorIdx[q]]]++;
    let mejor = 0;
    for (let c = 1; c < votos.length; c++) if (votos[c] > votos[mejor]) mejor = c;
    return { letra: letras[mejor], indice: mejor, confianza: votos[mejor] / k };
  }
}

/**
 * Decide cuándo una seña "cuenta": la letra objetivo debe detectarse con confianza
 * >= umbral y mantenerse `sostenerMs` milisegundos. Tolera cortes breves
 * (`toleranciaMs`) para que un fotograma malo no reinicie el contador.
 */
export class ControlSostener {
  constructor({ umbral = 0.6, sostenerMs = 1000, toleranciaMs = 250 } = {}) {
    this.umbral = umbral;
    this.sostenerMs = sostenerMs;
    this.toleranciaMs = toleranciaMs;
    this.reiniciar();
  }

  reiniciar() {
    this.inicio = null;
    this.ultimoOk = null;
  }

  /**
   * @param {string} objetivo letra que se pide
   * @param {{letra:string, confianza:number}|null} prediccion lo detectado en este fotograma
   * @param {number} ahoraMs reloj en milisegundos (performance.now())
   * @returns {{progreso:number, logrado:boolean}} progreso de 0 a 1
   */
  actualizar(objetivo, prediccion, ahoraMs) {
    const ok = prediccion && prediccion.letra === objetivo && prediccion.confianza >= this.umbral;
    if (ok) {
      if (this.inicio === null) this.inicio = ahoraMs;
      this.ultimoOk = ahoraMs;
    } else if (this.inicio !== null && ahoraMs - this.ultimoOk > this.toleranciaMs) {
      this.reiniciar();
    }
    const progreso = this.inicio === null ? 0 : Math.min(1, (this.ultimoOk - this.inicio) / this.sostenerMs);
    return { progreso, logrado: progreso >= 1 };
  }
}
