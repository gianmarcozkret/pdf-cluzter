// Cluzter PDF — «DNI ambas caras en una hoja».
// El usuario sube una foto de cada cara, la recorta con la proporción exacta del DNI (formato ID-1 de ISO/IEC 7810:
// 85.6 × 53.98 mm) y se arma un PDF A4 o Carta con las dos caras en tamaño real (o ampliado), listo para imprimir.
// Todo ocurre en el navegador: las fotos nunca salen del dispositivo.
import Cropper from 'cropperjs';
import { createIcons, icons } from 'lucide';
import { PDFDocument, rgb } from 'pdf-lib';
import { showAlert, showLoader, hideLoader } from '../ui.js';
import { downloadFile } from '../utils/helpers.js';
import { t } from '../i18n/i18n';

type Lado = 'anverso' | 'reverso';

const DNI_MM = { ancho: 85.6, alto: 53.98 };
const PT_POR_MM = 72 / 25.4;
const PX_POR_MM = 300 / 25.4; // cada cara se dibuja a 300 dpi
const HOJAS: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  carta: [612, 792],
};
const MARGEN_SUPERIOR_MM = 25;
const SEPARACION_MM = 12;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];

const croppers: Partial<Record<Lado, Cropper>> = {};
const urls: Partial<Record<Lado, string>> = {};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}

function iniciar() {
  createIcons({ icons });
  prepararLado('anverso', 'file-input');
  prepararLado('reverso', 'file-input-reverso');

  document
    .querySelectorAll<HTMLButtonElement>('[data-girar]')
    .forEach((boton) => {
      boton.addEventListener('click', () => {
        const lado = boton.dataset.girar as Lado;
        croppers[lado]?.rotate(Number(boton.dataset.grados) || 90);
      });
    });
  document
    .querySelectorAll<HTMLButtonElement>('[data-cambiar]')
    .forEach((boton) => {
      boton.addEventListener('click', () => {
        const lado = boton.dataset.cambiar as Lado;
        const input = document.getElementById(
          lado === 'anverso' ? 'file-input' : 'file-input-reverso'
        ) as HTMLInputElement | null;
        input?.click();
      });
    });

  document.getElementById('process-btn')?.addEventListener('click', crearPdf);
  document.getElementById('back-to-tools')?.addEventListener('click', () => {
    window.location.href = import.meta.env.BASE_URL;
  });
}

function prepararLado(lado: Lado, inputId: string) {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  const zona = document.getElementById(`zona-${lado}`);
  if (!input) return;

  input.addEventListener('click', () => {
    input.value = '';
  });
  input.addEventListener('change', () => {
    const archivo = input.files?.[0];
    if (archivo) cargarFoto(lado, archivo);
  });
  zona?.addEventListener('dragover', (e) => {
    e.preventDefault();
    zona.classList.add('bg-gray-700');
  });
  zona?.addEventListener('dragleave', () =>
    zona.classList.remove('bg-gray-700')
  );
  zona?.addEventListener('drop', (e) => {
    e.preventDefault();
    zona.classList.remove('bg-gray-700');
    const archivo = e.dataTransfer?.files?.[0];
    if (archivo) cargarFoto(lado, archivo);
  });
}

function cargarFoto(lado: Lado, archivo: File) {
  if (
    !TIPOS_IMAGEN.includes(archivo.type) &&
    !/\.(jpe?g|png|webp)$/i.test(archivo.name)
  ) {
    showAlert(
      t('tools:dniAmbasCaras.alertaTitulo'),
      t('tools:dniAmbasCaras.alertaFormato')
    );
    return;
  }
  const img = document.getElementById(`img-${lado}`) as HTMLImageElement | null;
  if (!img) return;

  croppers[lado]?.destroy();
  if (urls[lado]) URL.revokeObjectURL(urls[lado] as string);
  urls[lado] = URL.createObjectURL(archivo);

  document.getElementById(`zona-${lado}`)?.classList.add('hidden');
  document.getElementById(`editor-${lado}`)?.classList.remove('hidden');

  img.onload = () => {
    croppers[lado] = new Cropper(img, {
      aspectRatio: DNI_MM.ancho / DNI_MM.alto,
      viewMode: 1,
      autoCropArea: 0.92,
      background: false,
      responsive: true,
      // Los navegadores ya giran las fotos del celular según su EXIF al mostrarlas
      checkOrientation: false,
      ready() {
        const caja = detectarTarjeta(img);
        if (caja) croppers[lado]?.setData(caja);
      },
    });
  };
  img.src = urls[lado] as string;
}

// Recorte automático: busca la tarjeta (zona clara más grande) sobre un fondo más oscuro, como una mesa.
// Trabaja con una copia pequeña de la foto (umbral de Otsu + mayor región conectada). Si no encuentra algo con
// forma de tarjeta, devuelve null y queda el recuadro por defecto para ajustarlo a mano.
function detectarTarjeta(img: HTMLImageElement): Cropper.SetDataOptions | null {
  const anchoReal = img.naturalWidth;
  const altoReal = img.naturalHeight;
  if (!anchoReal || !altoReal) return null;
  const escala = 256 / Math.max(anchoReal, altoReal);
  const w = Math.max(1, Math.round(anchoReal * escala));
  const h = Math.max(1, Math.round(altoReal * escala));
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;

  const gris = new Uint8Array(w * h);
  const histograma = new Array<number>(256).fill(0);
  for (let i = 0; i < w * h; i++) {
    const v = Math.round(
      0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]
    );
    gris[i] = v;
    histograma[v]++;
  }
  // Umbral de Otsu
  let suma = 0;
  for (let v = 0; v < 256; v++) suma += v * histograma[v];
  let sumaFondo = 0;
  let pesoFondo = 0;
  let mejor = 0;
  let umbral = 128;
  for (let v = 0; v < 256; v++) {
    pesoFondo += histograma[v];
    if (!pesoFondo) continue;
    const pesoFrente = w * h - pesoFondo;
    if (!pesoFrente) break;
    sumaFondo += v * histograma[v];
    const mediaFondo = sumaFondo / pesoFondo;
    const mediaFrente = (suma - sumaFondo) / pesoFrente;
    const varianza = pesoFondo * pesoFrente * (mediaFondo - mediaFrente) ** 2;
    if (varianza > mejor) {
      mejor = varianza;
      umbral = v;
    }
  }

  // Mayor región clara conectada
  const visto = new Uint8Array(w * h);
  const cola = new Int32Array(w * h);
  let mejorRegion = { n: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
  for (let inicio = 0; inicio < w * h; inicio++) {
    if (visto[inicio] || gris[inicio] <= umbral) continue;
    let cabeza = 0;
    let fin = 0;
    cola[fin++] = inicio;
    visto[inicio] = 1;
    const r = { n: 0, x0: w, y0: h, x1: 0, y1: 0 };
    while (cabeza < fin) {
      const i = cola[cabeza++];
      const x = i % w;
      const y = (i - x) / w;
      r.n++;
      if (x < r.x0) r.x0 = x;
      if (x > r.x1) r.x1 = x;
      if (y < r.y0) r.y0 = y;
      if (y > r.y1) r.y1 = y;
      for (const j of [
        x > 0 ? i - 1 : -1,
        x < w - 1 ? i + 1 : -1,
        y > 0 ? i - w : -1,
        y < h - 1 ? i + w : -1,
      ]) {
        if (j >= 0 && !visto[j] && gris[j] > umbral) {
          visto[j] = 1;
          cola[fin++] = j;
        }
      }
    }
    if (r.n > mejorRegion.n) mejorRegion = r;
  }

  const ancho = mejorRegion.x1 - mejorRegion.x0 + 1;
  const alto = mejorRegion.y1 - mejorRegion.y0 + 1;
  const proporcion = ancho / alto;
  const cubre = (ancho * alto) / (w * h);
  if (
    mejorRegion.n < 50 ||
    cubre < 0.12 ||
    cubre > 0.97 ||
    proporcion < 1.2 ||
    proporcion > 2.1
  )
    return null;
  return {
    x: mejorRegion.x0 / escala,
    y: mejorRegion.y0 / escala,
    width: ancho / escala,
    height: alto / escala,
  };
}

// Dibuja una cara recortada a 300 dpi, en escala de grises y con el texto de seguridad si se pidieron.
function dibujarCara(
  lado: Lado,
  escala: number,
  gris: boolean,
  texto: string
): HTMLCanvasElement {
  const cropper = croppers[lado] as Cropper;
  const ancho = Math.round(DNI_MM.ancho * escala * PX_POR_MM);
  const alto = Math.round(DNI_MM.alto * escala * PX_POR_MM);
  const lienzo = cropper.getCroppedCanvas({
    width: ancho,
    height: alto,
    fillColor: '#ffffff',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  });
  const ctx = lienzo.getContext('2d') as CanvasRenderingContext2D;

  if (gris) {
    const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
    const p = datos.data;
    for (let i = 0; i < p.length; i += 4) {
      const y = Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]);
      p[i] = p[i + 1] = p[i + 2] = y;
    }
    ctx.putImageData(datos, 0, 0);
  }

  if (texto) {
    ctx.save();
    ctx.translate(lienzo.width / 2, lienzo.height / 2);
    ctx.rotate(-Math.PI / 9);
    ctx.font = `bold ${Math.round(lienzo.height * 0.075)}px sans-serif`;
    ctx.fillStyle = 'rgba(25, 25, 25, 0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let fila = -2; fila <= 2; fila++) {
      ctx.fillText(texto, 0, fila * lienzo.height * 0.24);
    }
    ctx.restore();
  }
  return lienzo;
}

function aJpeg(lienzo: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(
      (blob) =>
        blob
          ? blob.arrayBuffer().then(resolver, rechazar)
          : rechazar(new Error('canvas vacío')),
      'image/jpeg',
      0.92
    );
  });
}

async function crearPdf() {
  if (!croppers.anverso || !croppers.reverso) {
    showAlert(
      t('tools:dniAmbasCaras.alertaTitulo'),
      t('tools:dniAmbasCaras.alertaFaltaFoto')
    );
    return;
  }
  const escala =
    (document.getElementById('dni-tamano') as HTMLSelectElement | null)
      ?.value === 'grande'
      ? 1.5
      : 1;
  const hoja =
    HOJAS[
      (document.getElementById('dni-hoja') as HTMLSelectElement | null)
        ?.value || 'a4'
    ] || HOJAS.a4;
  const texto = (
    (document.getElementById('dni-texto') as HTMLInputElement | null)?.value ||
    ''
  )
    .trim()
    .slice(0, 60);
  const gris = Boolean(
    (document.getElementById('dni-gris') as HTMLInputElement | null)?.checked
  );
  const guias = Boolean(
    (document.getElementById('dni-guias') as HTMLInputElement | null)?.checked
  );

  showLoader(t('tools:dniAmbasCaras.creando'));
  try {
    const pdf = await PDFDocument.create();
    pdf.setTitle('DNI ambas caras');
    pdf.setCreator('Cluzter PDF (pdf.cluzter.dev)');
    pdf.setProducer('Cluzter PDF');
    const [anchoHoja, altoHoja] = hoja;
    const pagina = pdf.addPage([anchoHoja, altoHoja]);
    const ancho = DNI_MM.ancho * escala * PT_POR_MM;
    const alto = DNI_MM.alto * escala * PT_POR_MM;
    const x = (anchoHoja - ancho) / 2;
    const yAnverso = altoHoja - MARGEN_SUPERIOR_MM * PT_POR_MM - alto;
    const yReverso = yAnverso - SEPARACION_MM * PT_POR_MM - alto;

    for (const [lado, y] of [
      ['anverso', yAnverso],
      ['reverso', yReverso],
    ] as [Lado, number][]) {
      const imagen = await pdf.embedJpg(
        await aJpeg(dibujarCara(lado, escala, gris, texto))
      );
      pagina.drawImage(imagen, { x, y, width: ancho, height: alto });
      if (guias) {
        pagina.drawRectangle({
          x: x - 2,
          y: y - 2,
          width: ancho + 4,
          height: alto + 4,
          borderColor: rgb(0.55, 0.55, 0.55),
          borderWidth: 0.5,
          borderDashArray: [3, 3],
        });
      }
    }

    const bytes = await pdf.save();
    downloadFile(
      new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
      'dni-ambas-caras.pdf'
    );
    showAlert(
      t('tools:dniAmbasCaras.listoTitulo'),
      t('tools:dniAmbasCaras.listo'),
      'success'
    );
  } catch (e: unknown) {
    console.error('[DniAmbasCaras]', e);
    showAlert(
      t('tools:dniAmbasCaras.alertaTitulo'),
      e instanceof Error ? e.message : t('tools:dniAmbasCaras.alertaError')
    );
  } finally {
    hideLoader();
  }
}
