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
for (const pagina of paginas) {
  const dom = new JSDOM(fs.readFileSync(pagina, 'utf8'));
  const { document, NodeFilter } = dom.window;
  let cambios = 0;
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
  if (cambios) fs.writeFileSync(pagina, dom.serialize());
  cambiosTotales += cambios;
  dom.window.close();
}

console.log(
  `[traducir-paginas] ${paginas.length} páginas /es/, ${cambiosTotales} textos traducidos, ` +
    `${pendientes.size} textos únicos aún en inglés`
);
if (process.argv.includes('--pendientes')) {
  fs.writeFileSync(
    path.join(RAIZ, 'dist', 'pendientes-es.json'),
    JSON.stringify(
      [...pendientes.entries()].sort((a, b) => b[1] - a[1]),
      null,
      1
    )
  );
}
