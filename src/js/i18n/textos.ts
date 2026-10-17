// Cluzter PDF: BentoPDF deja en inglés muchos textos fijos (opciones de las herramientas, avisos y mensajes de
// progreso). Este módulo los traduce al español en el navegador con el diccionario public/locales/es/textos.json.
// Las páginas /es/ ya salen traducidas al compilar (herramientas/traducir-paginas.mjs); aquí se cubre lo que se
// genera después: avisos, cargadores, listas armadas por código y alert()/confirm() nativos.
import i18next from 'i18next';

interface Diccionario {
  exactos: Record<string, string>;
  plantillas: [string, string][];
}

interface Plantilla {
  prefijo: string;
  patron: RegExp;
  es: string;
}

const exactos = new Map<string, string>();
const plantillas: Plantilla[] = [];
const ATRIBUTOS = ['placeholder', 'title', 'aria-label'];
// Zonas que nunca se tocan: código, campos donde escribe el usuario y lo marcado como no traducible
const OMITIR =
  'script,style,code,pre,textarea,noscript,[contenteditable],[translate="no"],.notranslate';

const normalizar = (texto: string): string => texto.replace(/\s+/g, ' ').trim();
const escaparRegex = (texto: string): string =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const conservarEspacios = (original: string, traducido: string): string => {
  const inicio = original.match(/^\s*/)?.[0] ?? '';
  const fin = original.match(/\s*$/)?.[0] ?? '';
  return inicio + traducido + fin;
};

export function traducirTexto(texto: string): string {
  const limpio = normalizar(texto);
  if (!limpio || !/[A-Za-z]/.test(limpio)) return texto;
  const exacto = exactos.get(limpio);
  if (exacto !== undefined) return conservarEspacios(texto, exacto);
  for (const p of plantillas) {
    if (!limpio.startsWith(p.prefijo)) continue;
    const m = p.patron.exec(limpio);
    if (!m) continue;
    const traducido = p.es.replace(/\{(\d+)\}/g, (_, i: string) => {
      const valor = m[Number(i) + 1] ?? '';
      return exactos.get(valor) ?? valor;
    });
    return conservarEspacios(texto, traducido);
  }
  return texto;
}

const omitido = (el: Element | null): boolean =>
  !el || el.closest(OMITIR) !== null;

function traducirNodoTexto(nodo: Text): void {
  if (omitido(nodo.parentElement)) return;
  const actual = nodo.data;
  const nuevo = traducirTexto(actual);
  if (nuevo !== actual) nodo.data = nuevo;
}

function traducirAtributo(el: Element, nombre: string): void {
  const actual = el.getAttribute(nombre);
  if (!actual || omitido(el)) return;
  const nuevo = traducirTexto(actual);
  if (nuevo !== actual) el.setAttribute(nombre, nuevo);
}

function traducirArbol(raiz: Node): void {
  if (raiz.nodeType === Node.TEXT_NODE) {
    traducirNodoTexto(raiz as Text);
    return;
  }
  if (raiz.nodeType !== Node.ELEMENT_NODE) return;
  const el = raiz as Element;
  if (omitido(el)) return;
  for (const a of ATRIBUTOS) traducirAtributo(el, a);
  el.querySelectorAll(ATRIBUTOS.map((a) => `[${a}]`).join(',')).forEach(
    (hijo) => {
      for (const a of ATRIBUTOS) traducirAtributo(hijo, a);
    }
  );
  const recorrido = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodos: Text[] = [];
  while (recorrido.nextNode()) nodos.push(recorrido.currentNode as Text);
  nodos.forEach(traducirNodoTexto);
}

function envolverDialogos(): void {
  const alertar = window.alert.bind(window);
  const confirmar = window.confirm.bind(window);
  const preguntar = window.prompt.bind(window);
  const tr = (m: unknown) => (typeof m === 'string' ? traducirTexto(m) : m);
  window.alert = (mensaje?: unknown) => alertar(tr(mensaje));
  window.confirm = (mensaje?: string) =>
    confirmar(tr(mensaje) as string | undefined);
  window.prompt = (mensaje?: string, valor?: string) =>
    preguntar(tr(mensaje) as string | undefined, valor);
}

let activo = false;

// Se llama una vez por página (main.ts). Solo actúa si el idioma es español.
export async function activarTextosEspanol(): Promise<void> {
  if (activo || !i18next.language?.startsWith('es')) return;
  activo = true;

  // El observador arranca ya para no perder avisos que aparezcan mientras carga el diccionario
  new MutationObserver((cambios) => {
    if (exactos.size === 0) return;
    for (const c of cambios) {
      if (c.type === 'characterData') traducirNodoTexto(c.target as Text);
      else if (c.type === 'attributes' && c.attributeName)
        traducirAtributo(c.target as Element, c.attributeName);
      else c.addedNodes.forEach(traducirArbol);
    }
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATRIBUTOS,
  });
  envolverDialogos();

  try {
    const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
    // Las páginas /es/ ya traen traducidos los textos informativos; fuera de /es/ (navegador en español en una
    // página de la raíz) también se cargan esos (preguntas frecuentes, pasos).
    const enEs = window.location.pathname.startsWith(`${base}es/`);
    const archivos = enEs
      ? ['textos.json']
      : ['textos.json', 'textos-info.json'];
    const dics = await Promise.all(
      archivos.map(async (a) => {
        const r = await fetch(`${base}locales/es/${a}`);
        return r.ok ? ((await r.json()) as Partial<Diccionario>) : {};
      })
    );
    for (const dic of dics)
      for (const [en, es] of Object.entries(dic.exactos ?? {}))
        exactos.set(en, es);
    for (const [en, es] of dics[0].plantillas ?? []) {
      const partes = en.split(/\{\d+\}/);
      plantillas.push({
        prefijo: partes[0],
        patron: new RegExp(`^${partes.map(escaparRegex).join('(.*?)')}$`),
        es,
      });
    }
    traducirArbol(document.body);
    document.title = traducirTexto(document.title);
  } catch (e) {
    console.warn('[textos] No se pudo cargar el diccionario en español', e);
  }
}
