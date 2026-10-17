#!/usr/bin/env python3
"""Cluzter PDF — genera las páginas de las herramientas propias de Cluzter (src/pages/<id>.html).

Usan el mismo diseño que las herramientas de BentoPDF (tarjeta del cargador, avisos, navbar y footer). El texto
de la página está en español (el público principal) y cada texto tiene su clave data-i18n para el inglés.
La lógica vive en src/js/logic/<id>-page.ts y los textos en public/locales/{es,en}/tools.json.

Uso: python3 herramientas/paginas-herramientas.py
"""
import html
import json
import os

RAIZ = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
SITIO = 'https://pdf.cluzter.dev'

CABECERA = '''<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="title" content="{titulo}" />
    <meta name="description" content="{descripcion}" />
    <meta name="keywords" content="{palabras}" />
    <meta name="author" content="Cluzter" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="{sitio}/{id}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{sitio}/{id}" />
    <meta property="og:title" content="{titulo}" />
    <meta property="og:description" content="{descripcion}" />
    <meta property="og:image" content="{sitio}/images/og-cluzter-pdf.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Cluzter PDF" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="{sitio}/{id}" />
    <meta name="twitter:title" content="{titulo}" />
    <meta name="twitter:description" content="{descripcion}" />
    <meta name="twitter:image" content="{sitio}/images/og-cluzter-pdf.png" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="{nombre}" />
    <title>{titulo}</title>
    <link href="/src/css/styles.css" rel="stylesheet" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="icon" type="image/svg+xml" href="/images/favicon.svg" />
    <link rel="icon" type="image/png" sizes="192x192" href="/images/favicon-192x192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/images/favicon-512x512.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
  </head>

  <body class="antialiased bg-gray-900">
    {{{{> navbar }}}}

    <div id="uploader" class="min-h-screen flex flex-col items-center justify-start py-12 p-4 bg-gray-900">
      <div id="tool-uploader" class="bg-gray-800 rounded-xl shadow-xl px-4 py-8 md:p-8 {ancho} w-full text-gray-200 border border-gray-700">
        <button id="back-to-tools" class="flex items-center gap-2 text-indigo-300 hover:text-indigo-400 mb-6 font-semibold">
          <i data-lucide="arrow-left" class="cursor-pointer"></i>
          <span class="cursor-pointer" data-i18n="tools.backToTools">Volver a las herramientas</span>
        </button>
        <h1 class="text-2xl font-bold text-white mb-2" data-i18n="tools:{clave}.name">{nombre}</h1>
        <p class="text-gray-400 mb-6" data-i18n="tools:{clave}.subtitle">{subtitulo}</p>
{cuerpo}
      </div>
    </div>

    <div id="loader-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-gray-800 p-8 rounded-lg flex flex-col items-center gap-4 border border-gray-700 shadow-xl">
        <div class="solid-spinner"></div>
        <p id="loader-text" class="text-white text-lg font-medium">Procesando...</p>
      </div>
    </div>

    <div id="alert-modal" class="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50 hidden">
      <div class="bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full border border-gray-700">
        <h3 id="alert-title" class="text-xl font-bold text-white mb-2" data-i18n="alert.title">Aviso</h3>
        <p id="alert-message" class="text-gray-300 mb-6"></p>
        <button id="alert-ok" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">OK</button>
      </div>
    </div>

    <section class="max-w-4xl mx-auto px-4 py-12">
      <h2 class="text-3xl md:text-4xl font-bold text-center text-white mb-10" data-i18n="tools:{clave}.comoTitulo">{como_titulo}</h2>
      <ol class="space-y-4 text-gray-300 list-decimal list-inside">
{pasos}
      </ol>
    </section>

    <section class="max-w-4xl mx-auto px-4 py-12">
      <h2 class="text-3xl md:text-4xl font-bold text-center text-white mb-10" data-i18n="faq.sectionTitle">Preguntas frecuentes</h2>
      <div class="space-y-4">
{preguntas}
      </div>
    </section>

    {{{{> footer }}}}
    <script type="module" src="/src/js/utils/lucide-init.ts"></script>
    <script type="module" src="/src/js/utils/full-width.ts"></script>
    <script type="module" src="/src/js/utils/simple-mode-footer.ts"></script>
    <script type="module" src="/src/js/logic/{id}-page.ts"></script>
    <script type="module" src="/src/js/mobileMenu.ts"></script>
    <script type="module" src="/src/js/main.ts"></script>
    <script type="application/ld+json">
{ld_app}
    </script>
    <script type="application/ld+json">
{ld_faq}
    </script>
  </body>
</html>
'''

CHECK = 'w-4 h-4 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500'
SELECT = 'w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5'
BOTON_GRIS = 'btn bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1'


def lado_dni(lado, input_id, titulo, clave_titulo):
    return f'''          <div>
            <h2 class="text-lg font-semibold text-white mb-2" data-i18n="tools:dniAmbasCaras.{clave_titulo}">{titulo}</h2>
            <div id="zona-{lado}" class="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-gray-900 hover:bg-gray-700 transition-colors duration-300">
              <i data-lucide="image-plus" class="w-10 h-10 mb-3 text-gray-400"></i>
              <p class="text-sm text-gray-400 px-4 text-center"><span class="font-semibold" data-i18n="tools:dniAmbasCaras.elegirFoto">Toca para elegir la foto</span></p>
              <p class="text-xs text-gray-500" data-i18n="tools:dniAmbasCaras.formatos">JPG, PNG o WEBP</p>
              <input id="{input_id}" type="file" accept="image/jpeg,image/png,image/webp,image/*" class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
            <div id="editor-{lado}" class="hidden">
              <div class="bg-gray-900 rounded-lg overflow-hidden" style="height: 260px">
                <img id="img-{lado}" alt="" style="display: block; max-width: 100%" />
              </div>
              <div class="flex flex-wrap gap-2 mt-2">
                <button type="button" class="{BOTON_GRIS}" data-girar="{lado}" data-grados="-90"><i data-lucide="rotate-ccw" class="w-4 h-4"></i><span data-i18n="tools:dniAmbasCaras.girarIzq">Girar</span></button>
                <button type="button" class="{BOTON_GRIS}" data-girar="{lado}" data-grados="90"><i data-lucide="rotate-cw" class="w-4 h-4"></i><span data-i18n="tools:dniAmbasCaras.girarDer">Girar</span></button>
                <button type="button" class="{BOTON_GRIS}" data-cambiar="{lado}"><i data-lucide="replace" class="w-4 h-4"></i><span data-i18n="tools:dniAmbasCaras.cambiarFoto">Cambiar foto</span></button>
              </div>
              <p class="text-xs text-gray-500 mt-2" data-i18n="tools:dniAmbasCaras.ajustaRecuadro">Ajusta el recuadro a los bordes del DNI.</p>
            </div>
          </div>
'''


CUERPO_DNI = f'''        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
{lado_dni('anverso', 'file-input', 'Anverso (cara con foto)', 'anverso')}{lado_dni('reverso', 'file-input-reverso', 'Reverso (cara de atrás)', 'reverso')}        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <label for="dni-tamano" class="block mb-2 text-sm font-medium text-gray-300" data-i18n="tools:dniAmbasCaras.tamano">Tamaño</label>
            <select id="dni-tamano" class="{SELECT}">
              <option value="real" data-i18n="tools:dniAmbasCaras.tamanoReal">Tamaño real del DNI (8.6 × 5.4 cm)</option>
              <option value="grande" data-i18n="tools:dniAmbasCaras.tamanoGrande">Ampliado 1.5 veces (más legible)</option>
            </select>
          </div>
          <div>
            <label for="dni-hoja" class="block mb-2 text-sm font-medium text-gray-300" data-i18n="tools:dniAmbasCaras.hoja">Hoja</label>
            <select id="dni-hoja" class="{SELECT}">
              <option value="a4">A4</option>
              <option value="carta" data-i18n="tools:dniAmbasCaras.hojaCarta">Carta</option>
            </select>
          </div>
        </div>
        <div class="mt-4">
          <label for="dni-texto" class="block mb-2 text-sm font-medium text-gray-300" data-i18n="tools:dniAmbasCaras.textoSeguridad">Texto de seguridad (opcional)</label>
          <input id="dni-texto" type="text" maxlength="60" class="{SELECT}" placeholder="Ej.: Solo para trámite en el banco - 17/10/2026" data-i18n-placeholder="tools:dniAmbasCaras.textoEjemplo" />
          <p class="mt-1 text-xs text-gray-400" data-i18n="tools:dniAmbasCaras.textoAyuda">Se escribe en diagonal sobre el DNI para que la copia no se pueda usar en otro trámite.</p>
        </div>
        <div class="flex flex-wrap gap-6 mt-4 text-sm text-gray-300">
          <label class="flex items-center gap-2"><input id="dni-guias" type="checkbox" class="{CHECK}" checked /><span data-i18n="tools:dniAmbasCaras.guias">Líneas de corte</span></label>
          <label class="flex items-center gap-2"><input id="dni-gris" type="checkbox" class="{CHECK}" /><span data-i18n="tools:dniAmbasCaras.gris">Blanco y negro</span></label>
        </div>

        <button id="process-btn" class="btn-gradient w-full mt-6" data-i18n="tools:dniAmbasCaras.crear">Crear PDF</button>
        <p class="text-xs text-gray-500 mt-3 text-center" data-i18n="upload.filesNeverLeave">Tus archivos nunca salen de tu dispositivo.</p>'''

CUERPO_TACHAR = f'''        <div id="drop-zone" class="relative flex flex-col items-center justify-center w-full h-48 md:h-56 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-gray-900 hover:bg-gray-700 transition-colors duration-300">
          <i data-lucide="file-search" class="w-10 h-10 mb-3 text-gray-400"></i>
          <p class="mb-2 text-sm text-gray-400"><span class="font-semibold" data-i18n="upload.clickToSelect">Haz clic para elegir un archivo</span> <span data-i18n="upload.orDragAndDrop">o arrástralo aquí</span></p>
          <p class="text-xs text-gray-500" data-i18n="upload.filesNeverLeave">Tus archivos nunca salen de tu dispositivo.</p>
          <input id="file-input" type="file" accept="application/pdf,.pdf" class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
        <div id="archivo-elegido" class="hidden mt-4 flex items-center justify-between bg-gray-700 p-3 rounded-lg text-sm"></div>

        <div id="opciones-tachar" class="hidden mt-6">
          <p class="text-sm font-medium text-gray-300 mb-2" data-i18n="tools:tacharDatosPdf.queBuscar">¿Qué quieres tachar?</p>
          <div class="grid grid-cols-2 gap-3 text-sm text-gray-300">
            <label class="flex items-center gap-2"><input id="tachar-dni" type="checkbox" class="{CHECK}" checked /><span data-i18n="tools:tacharDatosPdf.dni">Números de DNI</span></label>
            <label class="flex items-center gap-2"><input id="tachar-ruc" type="checkbox" class="{CHECK}" checked /><span data-i18n="tools:tacharDatosPdf.ruc">Números de RUC</span></label>
            <label class="flex items-center gap-2"><input id="tachar-celular" type="checkbox" class="{CHECK}" checked /><span data-i18n="tools:tacharDatosPdf.celular">Celulares</span></label>
            <label class="flex items-center gap-2"><input id="tachar-correo" type="checkbox" class="{CHECK}" checked /><span data-i18n="tools:tacharDatosPdf.correo">Correos electrónicos</span></label>
          </div>
          <label for="tachar-terminos" class="block mt-4 mb-2 text-sm font-medium text-gray-300" data-i18n="tools:tacharDatosPdf.otrasPalabras">Otras palabras o frases (separadas por coma)</label>
          <textarea id="tachar-terminos" rows="2" class="{SELECT}" placeholder="Ej.: Juan Pérez Peña, Av. Arequipa 123" data-i18n-placeholder="tools:tacharDatosPdf.ejemploPalabras"></textarea>
          <button id="buscar-btn" class="btn-gradient w-full mt-4" data-i18n="tools:tacharDatosPdf.buscar">Buscar datos</button>
        </div>

        <div id="resultados" class="hidden mt-6">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white" data-i18n="tools:tacharDatosPdf.encontrados">Datos encontrados</h2>
            <label class="flex items-center gap-2 text-sm text-gray-300"><input id="marcar-todos" type="checkbox" class="{CHECK}" checked /><span data-i18n="tools:tacharDatosPdf.todos">Todos</span></label>
          </div>
          <div id="lista-resultados" class="max-h-72 overflow-auto space-y-1 mt-3"></div>
          <button id="process-btn" class="btn-gradient w-full mt-4" data-i18n="tools:tacharDatosPdf.tachar">Tachar y descargar</button>
          <p class="text-xs text-gray-500 mt-3" data-i18n="tools:tacharDatosPdf.notaReal">El texto tachado se elimina del archivo: no se puede copiar ni recuperar. Revisa el resultado antes de compartirlo.</p>
        </div>'''

HERRAMIENTAS = {
    'dni-ambas-caras': dict(
        clave='dniAmbasCaras', ancho='max-w-4xl',
        nombre='DNI ambas caras en una hoja',
        subtitulo='Sube una foto de cada cara de tu DNI, recórtala y obtén un PDF listo para imprimir con el tamaño real del documento.',
        titulo='DNI ambas caras en una hoja PDF gratis | Cluzter PDF',
        descripcion='Junta el anverso y el reverso de tu DNI en una sola hoja A4, en tamaño real y listo para imprimir. Gratis, sin registro y sin subir tus fotos: todo se hace en tu celular o computadora.',
        palabras='dni ambas caras en una hoja, dni ambas caras pdf, copia de dni, imprimir dni, anverso y reverso dni, dni en una hoja a4',
        cuerpo=CUERPO_DNI,
        como_titulo='Cómo poner tu DNI por ambas caras en una hoja',
        pasos=['Toma una foto de cada cara de tu DNI sobre una superficie oscura y con buena luz.',
               'Sube el anverso y el reverso, y ajusta el recuadro a los bordes del documento.',
               'Elige el tamaño (real o ampliado) y, si quieres, escribe un texto de seguridad.',
               'Pulsa «Crear PDF» y descarga la hoja lista para imprimir o enviar.'],
        preguntas=[('¿Mis fotos se suben a algún servidor?', 'No. Todo se procesa dentro de tu navegador: tus fotos nunca salen de tu celular o computadora.'),
                   ('¿Sale con el tamaño real del DNI?', 'Sí. Con la opción «Tamaño real» cada cara mide 8.56 × 5.4 cm, el tamaño del DNI peruano. Al imprimir, elige «Tamaño real» o 100% (no «Ajustar a la página»).'),
                   ('¿Para qué sirve el texto de seguridad?', 'Escribe en diagonal sobre la copia para qué trámite la entregas y la fecha. Así nadie puede reutilizarla para otra cosa.')],
    ),
    'tachar-datos-pdf': dict(
        clave='tacharDatosPdf', ancho='max-w-2xl',
        nombre='Tachar datos personales en PDF',
        subtitulo='Encuentra y borra de verdad DNI, RUC, celulares, correos y las palabras que elijas. El texto tachado se elimina del archivo, no solo se tapa.',
        titulo='Tachar datos personales en PDF (DNI, RUC, celular) gratis | Cluzter PDF',
        descripcion='Oculta de verdad números de DNI, RUC, celulares, correos y cualquier palabra en tus PDF antes de compartirlos. Gratis y sin subir tus archivos: todo ocurre en tu navegador.',
        palabras='tachar datos pdf, ocultar dni en pdf, censurar pdf, borrar datos personales pdf, redactar pdf, tachar texto pdf',
        cuerpo=CUERPO_TACHAR,
        como_titulo='Cómo tachar datos personales en un PDF',
        pasos=['Sube el PDF que quieres compartir.',
               'Marca qué datos buscar (DNI, RUC, celulares, correos) y agrega otras palabras si hace falta.',
               'Revisa la lista de datos encontrados y desmarca los que no quieras tachar.',
               'Pulsa «Tachar y descargar»: los datos se borran del archivo y quedan cubiertos en negro.'],
        preguntas=[('¿El dato tachado se puede recuperar?', 'No. A diferencia de poner un rectángulo negro encima, esta herramienta elimina el texto del archivo: no se puede copiar, buscar ni recuperar.'),
                   ('¿Funciona con documentos escaneados?', 'Solo si el PDF tiene texto. Si es una foto o un escaneo, primero pásalo por la herramienta OCR para que tenga texto y luego táchalo.'),
                   ('¿Mi documento se sube a internet?', 'No. Todo se procesa dentro de tu navegador; el archivo nunca sale de tu dispositivo.')],
    ),
}


def generar(id_, h):
    pasos = '\n'.join(f'        <li data-i18n="tools:{h["clave"]}.paso{i + 1}">{html.escape(p)}</li>' for i, p in enumerate(h['pasos']))
    preguntas = '\n'.join(
        f'''        <details class="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <summary class="font-semibold text-white cursor-pointer" data-i18n="tools:{h["clave"]}.faq{i + 1}p">{html.escape(p)}</summary>
          <p class="mt-2 text-gray-300" data-i18n="tools:{h["clave"]}.faq{i + 1}r">{html.escape(r)}</p>
        </details>''' for i, (p, r) in enumerate(h['preguntas']))
    ld_app = json.dumps({'@context': 'https://schema.org', '@type': 'SoftwareApplication', 'name': f'{h["nombre"]} - Cluzter PDF',
                         'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any - Web Browser', 'url': f'{SITIO}/{id_}',
                         'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'PEN'}}, ensure_ascii=False, indent=2)
    ld_faq = json.dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': p, 'acceptedAnswer': {'@type': 'Answer', 'text': r}} for p, r in h['preguntas']]}, ensure_ascii=False, indent=2)
    sangria = lambda s: '\n'.join('      ' + l for l in s.splitlines())
    salida = CABECERA.format(sitio=SITIO, id=id_, pasos=pasos, preguntas=preguntas, ld_app=sangria(ld_app), ld_faq=sangria(ld_faq),
                             **{k: (html.escape(v, quote=True) if k in ('titulo', 'descripcion', 'palabras', 'nombre', 'subtitulo', 'como_titulo') else v)
                                for k, v in h.items() if k not in ('pasos', 'preguntas')})
    with open(os.path.join(RAIZ, 'src/pages', f'{id_}.html'), 'w', encoding='utf-8') as f:
        f.write(salida)


def main():
    for id_, h in HERRAMIENTAS.items():
        generar(id_, h)
    print('páginas:', ', '.join(f'src/pages/{i}.html' for i in HERRAMIENTAS))


if __name__ == '__main__':
    main()
