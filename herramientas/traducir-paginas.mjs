// Cluzter PDF: después de `npm run build`, traduce en dist/es/**/*.html los textos que BentoPDF dejó fijos en inglés
// (los que no tienen data-i18n), con el diccionario public/locales/es/textos.json. Así Google y el usuario ven las
// páginas en español desde el primer momento. Lo que se genera en el navegador lo cubre src/js/i18n/textos.ts.
// Uso: node herramientas/traducir-paginas.mjs   (lo llama herramientas/compilar.sh)
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..'
);
const DIST_ES = path.join(RAIZ, 'dist', 'es');
const ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt'];
const OMITIR =
  'script,style,code,pre,textarea,noscript,[contenteditable],[translate="no"],.notranslate';

const normalizar = (t) => t.replace(/\s+/g, ' ').trim();
const exactos = new Map();
for (const archivo of ['textos.json', 'textos-info.json']) {
  const ruta = path.join(RAIZ, 'public', 'locales', 'es', archivo);
  if (!fs.existsSync(ruta)) continue;
  for (const [en, es] of Object.entries(
    JSON.parse(fs.readFileSync(ruta, 'utf8')).exactos
  ))
    exactos.set(en, es);
}

const valores = new Set([...exactos.values()].map(normalizar));

const traducir = (texto) => {
  const limpio = normalizar(texto);
  const es = limpio && exactos.get(limpio);
  if (!es) return null;
  return (texto.match(/^\s*/)[0] ?? '') + es + (texto.match(/\s*$/)[0] ?? '');
};

const paginas = [];
const recorrer = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) recorrer(p);
    else if (f.endsWith('.html')) paginas.push(p);
  }
};
recorrer(DIST_ES);

let cambiosTotales = 0;
const pendientes = new Map();
const pendientesLd = new Map();
for (const pagina of paginas) {
  const dom = new JSDOM(fs.readFileSync(pagina, 'utf8'));
  const { document, NodeFilter } = dom.window;
  let cambios = 0;
  // Datos estructurados (JSON-LD): antes de traducir, se ubica el elemento de la página que tiene exactamente cada
  // texto (p. ej. una respuesta de preguntas frecuentes con enlaces, que en el HTML está partida en varios nodos)
  const ldScripts = [
    ...document.querySelectorAll('script[type="application/ld+json"]'),
  ];
  const ldDatos = ldScripts.map((s) => {
    try {
      return JSON.parse(s.textContent);
    } catch {
      return null;
    }
  });
  const buscados = new Set();
  const recoger = (v) => {
    if (typeof v === 'string') buscados.add(normalizar(v));
    else if (v && typeof v === 'object') Object.values(v).forEach(recoger);
  };
  ldDatos.forEach(recoger);
  const elementosLd = new Map();
  for (const el of document.body.querySelectorAll(
    'h1,h2,h3,h4,h5,h6,p,li,dt,dd,summary,span,div,a,button'
  )) {
    const t = normalizar(el.textContent);
    if (t.length < 3000 && buscados.has(t) && !elementosLd.has(t))
      elementosLd.set(t, el);
  }
  const recorrido = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT
  );
  const nodos = [];
  while (recorrido.nextNode()) nodos.push(recorrido.currentNode);
  for (const nodo of nodos) {
    if (!nodo.parentElement || nodo.parentElement.closest(OMITIR)) continue;
    const nuevo = traducir(nodo.data);
    if (nuevo !== null && nuevo !== nodo.data) {
      nodo.data = nuevo;
      cambios++;
    } else if (
      nuevo === null &&
      /[A-Za-z]{3}/.test(nodo.data) &&
      !valores.has(normalizar(nodo.data)) &&
      !nodo.parentElement.closest('[data-i18n]')
    ) {
      const t = normalizar(nodo.data);
      pendientes.set(t, (pendientes.get(t) || 0) + 1);
    }
  }
  for (const el of document.body.querySelectorAll(
    ATRIBUTOS.map((a) => `[${a}]`).join(',')
  )) {
    if (el.closest(OMITIR)) continue;
    for (const a of ATRIBUTOS) {
      const v = el.getAttribute(a);
      const nuevo = v && traducir(v);
      if (nuevo && nuevo !== v) {
        el.setAttribute(a, nuevo);
        cambios++;
      }
    }
  }
  const NO_TRADUCIR = new Set([
    '@context',
    '@type',
    '@id',
    'url',
    'item',
    'logo',
    'image',
    'price',
    'priceCurrency',
    'sameAs',
    'inLanguage',
    'applicationCategory',
    'operatingSystem',
  ]);
  const titulo1 = normalizar(document.querySelector('h1')?.textContent ?? '');
  const traducirLd = (v, clave) => {
    if (typeof v === 'string') {
      if (NO_TRADUCIR.has(clave) || /^https?:/.test(v)) return v;
      const n = normalizar(v);
      const directo = exactos.get(n);
      if (directo) return directo;
      // Pasos genéricos de HowTo que BentoPDF arma con el nombre interno de la herramienta
      if (/^How to .+ online$/i.test(n) && titulo1)
        return `Cómo usar ${titulo1} en línea`;
      if (/^Learn how to .+ using Cluzter PDF$/.test(n) && titulo1)
        return `Aprende a usar ${titulo1} con Cluzter PDF`;
      const marca = n.match(/^(.*) - Cluzter PDF$/);
      if (marca && exactos.get(marca[1]))
        return `${exactos.get(marca[1])} - Cluzter PDF`;
      const el = elementosLd.get(n);
      const enPagina = el && normalizar(el.textContent);
      if (enPagina && enPagina !== n) return enPagina;
      if (/[A-Za-z]{3}/.test(n) && !valores.has(n))
        pendientesLd.set(n, (pendientesLd.get(n) || 0) + 1);
      return v;
    }
    if (Array.isArray(v)) return v.map((x) => traducirLd(x, clave));
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, traducirLd(x, k)])
      );
    return v;
  };
  ldScripts.forEach((s, i) => {
    if (!ldDatos[i]) return;
    const nuevo = JSON.stringify(traducirLd(ldDatos[i]));
    if (nuevo !== JSON.stringify(ldDatos[i])) {
      s.textContent = nuevo;
      cambios++;
    }
  });

  // Título y descripciones del <head> (pestaña, Google y vista previa al compartir)
  const titulo = traducir(document.title);
  if (titulo && titulo !== document.title) {
    document.title = titulo;
    cambios++;
  }
  for (const meta of document.head.querySelectorAll(
    'meta[name="description"],meta[property="og:title"],meta[property="og:description"],' +
      'meta[name="twitter:title"],meta[name="twitter:description"]'
  )) {
    const v = meta.getAttribute('content');
    const nuevo = v && traducir(v);
    if (nuevo && nuevo !== v) {
      meta.setAttribute('content', nuevo);
      cambios++;
    }
  }
  if (cambios) fs.writeFileSync(pagina, dom.serialize());
  cambiosTotales += cambios;
  dom.window.close();
}

console.log(
  `[traducir-paginas] ${paginas.length} páginas /es/, ${cambiosTotales} textos traducidos, ` +
    `${pendientes.size} textos únicos aún en inglés, ${pendientesLd.size} en datos estructurados`
);
if (process.argv.includes('--pendientes')) {
  fs.writeFileSync(
    path.join(RAIZ, 'dist', 'pendientes-es.json'),
    JSON.stringify(
      [
        ...pendientes.entries(),
        ...[...pendientesLd.entries()].map(([t, c]) => ['LD: ' + t, c]),
      ].sort((a, b) => b[1] - a[1]),
      null,
      1
    )
  );
}
