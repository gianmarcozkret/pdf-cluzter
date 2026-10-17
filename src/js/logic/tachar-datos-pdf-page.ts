// Cluzter PDF — «Tachar datos personales en PDF».
// Busca en el texto de cada página números de DNI, RUC, celulares peruanos, correos y las palabras que pida el usuario,
// muestra la lista para revisarla y aplica un tachado REAL con PyMuPDF (add_redact_annot + apply_redactions): el texto
// se elimina del archivo, no solo se tapa con un rectángulo. Todo ocurre en el navegador.
import { createIcons, icons } from 'lucide';
import { showAlert, showLoader, hideLoader } from '../ui.js';
import { downloadFile, formatBytes } from '../utils/helpers.js';
import { loadPyMuPDF } from '../utils/pymupdf-loader.js';
import type { PyMuPDFInstance } from '@/types';
import { t } from '../i18n/i18n';

type Tipo = 'dni' | 'ruc' | 'celular' | 'correo' | 'palabra';
interface Hallazgo {
  pagina: number;
  tipo: Tipo;
  valor: string;
}

// Patrones del Perú. Los números no deben estar pegados a otros dígitos (un DNI dentro de un RUC no cuenta como DNI).
const PATRONES: Record<Exclude<Tipo, 'palabra'>, RegExp> = {
  dni: /(?<!\d)\d{8}(?!\d)/g,
  ruc: /(?<!\d)(?:10|15|16|17|20)\d{9}(?!\d)/g,
  // eslint-disable-next-line security/detect-unsafe-regex -- longitudes acotadas, sin repeticiones ilimitadas anidadas (peor caso probado: 0 ms)
  celular: /(?<![\d+])(?:\+51 ?)?9\d{2}[ -]?\d{3}[ -]?\d{3}(?!\d)/g,
  // Correos: se revisa palabra por palabra (solo las que tienen «@»), así el patrón nunca recorre textos largos.
  // eslint-disable-next-line security/detect-unsafe-regex -- longitudes acotadas, sin repeticiones ilimitadas anidadas (peor caso probado: 0 ms)
  correo: /^[\w.%+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){0,6}\.[A-Za-z]{2,24}$/,
};
const NEGRO = { r: 0, g: 0, b: 0 };
const MAX_PALABRAS = 50;

let archivo: File | null = null;
let hallazgos: Hallazgo[] = [];
let pymupdf: PyMuPDFInstance | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}

function iniciar() {
  createIcons({ icons });
  const input = document.getElementById(
    'file-input'
  ) as HTMLInputElement | null;
  const zona = document.getElementById('drop-zone');

  input?.addEventListener('click', () => {
    input.value = '';
  });
  input?.addEventListener('change', () => {
    if (input.files?.[0]) elegirArchivo(input.files[0]);
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
    const f = e.dataTransfer?.files?.[0];
    if (f) elegirArchivo(f);
  });

  document.getElementById('buscar-btn')?.addEventListener('click', buscar);
  document.getElementById('process-btn')?.addEventListener('click', tachar);
  document.getElementById('marcar-todos')?.addEventListener('change', (e) => {
    const marcado = (e.target as HTMLInputElement).checked;
    document.querySelectorAll<HTMLInputElement>('.hallazgo').forEach((c) => {
      c.checked = marcado;
    });
  });
  document.getElementById('back-to-tools')?.addEventListener('click', () => {
    window.location.href = import.meta.env.BASE_URL;
  });
}

function elegirArchivo(f: File) {
  if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
    showAlert(
      t('tools:tacharDatosPdf.alertaTitulo'),
      t('tools:tacharDatosPdf.alertaFormato')
    );
    return;
  }
  archivo = f;
  hallazgos = [];
  const caja = document.getElementById('archivo-elegido');
  if (caja) {
    caja.textContent = '';
    const nombre = document.createElement('span');
    nombre.className = 'truncate font-medium text-gray-200';
    nombre.textContent = `${f.name} (${formatBytes(f.size)})`;
    caja.appendChild(nombre);
    caja.classList.remove('hidden');
  }
  document.getElementById('opciones-tachar')?.classList.remove('hidden');
  document.getElementById('resultados')?.classList.add('hidden');
}

async function motor(): Promise<PyMuPDFInstance> {
  if (!pymupdf) pymupdf = (await loadPyMuPDF()) as PyMuPDFInstance;
  return pymupdf;
}

// Términos escritos por el usuario: sin comillas, barras invertidas ni saltos de línea (el adaptador de PyMuPDF
// arma código Python con el texto buscado).
function palabrasDelUsuario(): string[] {
  const texto =
    (document.getElementById('tachar-terminos') as HTMLTextAreaElement | null)
      ?.value || '';
  const vistas = new Set<string>();
  return texto
    .split(/[,\n]/)
    .map((p) => p.replace(/["\\\r\n]/g, '').trim())
    .filter(
      (p) =>
        p.length >= 2 &&
        !vistas.has(p.toLowerCase()) &&
        vistas.add(p.toLowerCase())
    )
    .slice(0, MAX_PALABRAS);
}

function marcado(id: string): boolean {
  return Boolean(
    (document.getElementById(id) as HTMLInputElement | null)?.checked
  );
}

async function buscar() {
  if (!archivo) return;
  const tipos = (Object.keys(PATRONES) as (keyof typeof PATRONES)[]).filter(
    (tipo) => marcado(`tachar-${tipo}`)
  );
  const palabras = palabrasDelUsuario();
  if (!tipos.length && !palabras.length) {
    showAlert(
      t('tools:tacharDatosPdf.alertaTitulo'),
      t('tools:tacharDatosPdf.alertaNada')
    );
    return;
  }

  showLoader(t('tools:tacharDatosPdf.buscando'));
  try {
    const doc = await (await motor()).open(archivo);
    if (doc.needsPass) {
      doc.close();
      showAlert(
        t('tools:tacharDatosPdf.alertaTitulo'),
        t('tools:tacharDatosPdf.alertaClave')
      );
      return;
    }
    hallazgos = [];
    let largoTexto = 0;
    for (let i = 0; i < doc.pageCount; i++) {
      const texto = doc.getPage(i).getText() || '';
      largoTexto += texto.trim().length;
      const enPagina = new Set<string>();
      const agregar = (tipo: Tipo, valor: string) => {
        const clave = `${tipo}|${valor}`;
        if (!enPagina.has(clave)) {
          enPagina.add(clave);
          hallazgos.push({ pagina: i, tipo, valor });
        }
      };
      for (const tipo of tipos) {
        if (tipo === 'correo') {
          for (const palabra of texto.split(/[\s:;,()<>[\]"']+/)) {
            if (!palabra.includes('@')) continue;
            const limpia = palabra.replace(/^[^\w]+|[^\w]+$/g, '');
            if (PATRONES.correo.test(limpia)) agregar('correo', limpia);
          }
          continue;
        }
        for (const m of texto.matchAll(PATRONES[tipo])) agregar(tipo, m[0]);
      }
      const minus = texto.toLowerCase();
      for (const p of palabras) {
        if (minus.includes(p.toLowerCase())) agregar('palabra', p);
      }
    }
    doc.close();

    if (largoTexto < 20) {
      showAlert(
        t('tools:tacharDatosPdf.alertaTitulo'),
        t('tools:tacharDatosPdf.alertaSinTexto')
      );
      return;
    }
    mostrarHallazgos();
  } catch (e: unknown) {
    console.error('[TacharDatos]', e);
    showAlert(
      t('tools:tacharDatosPdf.alertaTitulo'),
      e instanceof Error ? e.message : t('tools:tacharDatosPdf.alertaError')
    );
  } finally {
    hideLoader();
  }
}

function mostrarHallazgos() {
  const lista = document.getElementById('lista-resultados');
  const caja = document.getElementById('resultados');
  if (!lista || !caja) return;
  lista.textContent = '';
  caja.classList.remove('hidden');

  if (!hallazgos.length) {
    const vacio = document.createElement('p');
    vacio.className = 'text-sm text-gray-400';
    vacio.textContent = t('tools:tacharDatosPdf.ninguno');
    lista.appendChild(vacio);
    document.getElementById('process-btn')?.classList.add('hidden');
    return;
  }
  document.getElementById('process-btn')?.classList.remove('hidden');
  hallazgos.forEach((h, i) => {
    const fila = document.createElement('label');
    fila.className =
      'flex items-center gap-3 bg-gray-700 px-3 py-2 rounded-lg text-sm cursor-pointer';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    check.className =
      'hallazgo w-4 h-4 rounded bg-gray-600 border-gray-500 text-indigo-600';
    check.dataset.indice = String(i);
    const detalle = document.createElement('span');
    detalle.className = 'text-gray-400 flex-shrink-0';
    detalle.textContent = `${t('tools:tacharDatosPdf.pagina')} ${h.pagina + 1} · ${t(`tools:tacharDatosPdf.tipo_${h.tipo}`)}`;
    const valor = document.createElement('span');
    valor.className = 'font-mono text-gray-100 truncate';
    valor.textContent = h.valor; // textContent: el valor viene del PDF, nunca se interpreta como HTML
    fila.append(check, detalle, valor);
    lista.appendChild(fila);
  });
}

async function tachar() {
  if (!archivo) return;
  const elegidos = Array.from(
    document.querySelectorAll<HTMLInputElement>('.hallazgo:checked')
  ).map((c) => hallazgos[Number(c.dataset.indice)]);
  if (!elegidos.length) {
    showAlert(
      t('tools:tacharDatosPdf.alertaTitulo'),
      t('tools:tacharDatosPdf.alertaNadaElegido')
    );
    return;
  }

  showLoader(t('tools:tacharDatosPdf.tachando'));
  try {
    const doc = await (await motor()).open(archivo);
    const porPagina = new Map<number, Set<string>>();
    for (const h of elegidos) {
      if (!porPagina.has(h.pagina)) porPagina.set(h.pagina, new Set());
      porPagina.get(h.pagina)?.add(h.valor.replace(/["\\\r\n]/g, ''));
    }
    let areas = 0;
    for (const [i, valores] of porPagina) {
      const pagina = doc.getPage(i);
      let hayAlgo = false;
      for (const valor of valores) {
        for (const rect of pagina.searchFor(valor)) {
          pagina.addRedaction(rect, '', NEGRO);
          areas++;
          hayAlgo = true;
        }
      }
      if (hayAlgo) pagina.applyRedactions();
    }
    const bytes = doc.save();
    doc.close();
    const nombre =
      (archivo.name.replace(/\.pdf$/i, '') || 'documento') + '-tachado.pdf';
    downloadFile(
      new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
      nombre
    );
    showAlert(
      t('tools:tacharDatosPdf.listoTitulo'),
      t('tools:tacharDatosPdf.listo', { areas }),
      'success'
    );
  } catch (e: unknown) {
    console.error('[TacharDatos]', e);
    showAlert(
      t('tools:tacharDatosPdf.alertaTitulo'),
      e instanceof Error ? e.message : t('tools:tacharDatosPdf.alertaError')
    );
  } finally {
    hideLoader();
  }
}
