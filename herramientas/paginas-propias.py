#!/usr/bin/env python3
"""Cluzter PDF: genera las páginas propias del sitio (Acerca de, Contacto, Privacidad, Términos y Licencia).

Reemplazan a las de BentoPDF, que hablan de su empresa, sus productos y su licencia comercial. Mantienen el
diseño del sitio (navbar, footer y estilos .legal-content). Si BentoPDF cambia estas páginas, se vuelven a
generar con: python3 herramientas/paginas-propias.py
"""
import os

RAIZ = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
SITIO = 'https://pdf.cluzter.dev'
ACTUALIZADO = '17 de octubre de 2026'
WHATSAPP = 'https://wa.me/447400754038'
CORREO = 'ventas@cluzter.dev'
REPO = 'https://github.com/gianmarcozkret/pdf-cluzter'
ORIGINAL = 'https://github.com/alam00000/bentopdf'

CABECERA = '''<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{titulo}</title>
    <meta name="description" content="{descripcion}" />
    <meta name="author" content="Cluzter" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="{sitio}/{ruta}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{sitio}/{ruta}" />
    <meta property="og:title" content="{titulo}" />
    <meta property="og:description" content="{descripcion}" />
    <meta property="og:image" content="{sitio}/images/og-cluzter-pdf.png" />
    <meta property="og:site_name" content="Cluzter PDF" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{titulo}" />
    <meta name="twitter:description" content="{descripcion}" />
    <meta name="twitter:image" content="{sitio}/images/og-cluzter-pdf.png" />
    <link href="/src/css/styles.css" rel="stylesheet" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="icon" type="image/svg+xml" href="/images/favicon.svg" />
    <link rel="icon" type="image/png" sizes="192x192" href="/images/favicon-192x192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/images/favicon-512x512.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
  </head>

  <body class="antialiased bg-gray-900 text-gray-300">
    {{{{> navbar }}}}

    <div id="app" class="container mx-auto p-4 md:p-8">
      <section class="max-w-4xl mx-auto py-12">
        <h1 class="text-4xl md:text-5xl font-bold text-center text-white mb-4">{h1}</h1>
        <p class="text-center text-gray-500">Última actualización: {actualizado}</p>

        <div class="legal-content mt-12">
{contenido}
        </div>
      </section>
    </div>

    {{{{> footer }}}}
    <script type="module" src="src/js/utils/lucide-init.ts"></script>
    <script type="module" src="src/js/mobileMenu.ts"></script>
    <script type="module" src="src/js/main.ts"></script>
    <script type="application/ld+json">
      {{"@context": "https://schema.org", "@type": "{tipo}", "name": "{titulo}", "url": "{sitio}/{ruta}"}}
    </script>
  </body>
</html>
'''

PAGINAS = {
    'about': dict(
        titulo='Acerca de Cluzter PDF | Herramientas PDF gratis y privadas',
        descripcion='Cluzter PDF: herramientas PDF gratis que funcionan en tu navegador, sin subir tus archivos. Parte de Cluzter, la API de datos del Perú.',
        h1='Acerca de Cluzter PDF', tipo='AboutPage',
        contenido=f'''          <h2>Qué es Cluzter PDF</h2>
          <p>
            Cluzter PDF reúne más de cien herramientas para trabajar con PDF (unir, dividir, comprimir, convertir,
            firmar, reconocer texto y más) que funcionan <strong>dentro de tu navegador</strong>. Tus archivos no se
            suben a ningún servidor: se procesan en tu propio dispositivo y desaparecen cuando cierras la pestaña.
          </p>
          <p>Es gratis, sin registro, sin límite de archivos y sin marcas de agua.</p>

          <h2>Parte de Cluzter</h2>
          <p>
            Cluzter es una plataforma peruana de datos para empresas y desarrolladores: con una sola API se consultan
            DNI, RUC, placas vehiculares, SOAT, licencias de conducir, revisiones técnicas y se emiten comprobantes
            electrónicos SUNAT. Si necesitas automatizar procesos desde tu sistema, conoce la
            <a href="https://cluzter.dev" target="_blank" rel="noopener">API de Cluzter</a>.
          </p>

          <h2>Basado en BentoPDF</h2>
          <p>
            Cluzter PDF es una versión modificada de <a href="{ORIGINAL}" target="_blank" rel="noopener noreferrer">BentoPDF</a>,
            un proyecto de código abierto creado por su autor original y publicado bajo la licencia GNU AGPL-3.0.
            Agradecemos su trabajo. Nuestras modificaciones (marca, idioma, configuración y herramientas propias)
            también son públicas: puedes revisar todo el código en
            <a href="{REPO}" target="_blank" rel="noopener noreferrer">{REPO.replace('https://', '')}</a>.
            Más detalles en <a href="/licensing">Licencia y código fuente</a>.
          </p>''',
    ),
    'contact': dict(
        titulo='Contacto | Cluzter PDF',
        descripcion='Contacta a Cluzter por WhatsApp o correo para soporte, ventas de la API o sugerencias sobre Cluzter PDF.',
        h1='Contacto', tipo='ContactPage',
        contenido=f'''          <p>¿Tienes una pregunta, encontraste un error o quieres automatizar tus procesos con la API de Cluzter? Escríbenos.</p>

          <h2>WhatsApp (ventas y soporte)</h2>
          <p><a href="{WHATSAPP}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>. Es la forma más rápida de recibir ayuda.</p>

          <h2>Correo</h2>
          <p><a href="mailto:{CORREO}">{CORREO}</a></p>

          <h2>Clientes de la API</h2>
          <p>Si ya tienes una cuenta en Cluzter, entra a tu <a href="https://panel.cluzter.dev" target="_blank" rel="noopener">panel de clientes</a>.</p>

          <h2>Sobre tus archivos</h2>
          <p>
            Las herramientas de Cluzter PDF trabajan en tu navegador, así que nosotros nunca vemos tus documentos.
            Si nos reportas un problema, describe qué hiciste; no hace falta (ni recomendamos) enviarnos documentos
            con información personal.
          </p>''',
    ),
    'privacy': dict(
        titulo='Política de privacidad | Cluzter PDF',
        descripcion='Política de privacidad de Cluzter PDF: tus archivos se procesan en tu navegador y nunca se suben a nuestros servidores.',
        h1='Política de privacidad', tipo='WebPage',
        contenido=f'''          <h2>1. Nuestro principio: tus archivos no salen de tu dispositivo</h2>
          <p>
            Cluzter PDF («nosotros») procesa los documentos <strong>dentro de tu navegador</strong>, con tecnología
            JavaScript y WebAssembly que se ejecuta en tu propio dispositivo. Tus archivos no se suben a nuestros
            servidores y no tenemos forma de verlos, guardarlos ni compartirlos.
          </p>

          <h2>2. Lo que no recopilamos</h2>
          <ul>
            <li>El contenido de tus archivos.</li>
            <li>Los nombres de tus archivos.</li>
            <li>Los datos personales que contengan tus documentos (por ejemplo, números de DNI, nombres o direcciones).</li>
          </ul>

          <h2>3. Datos técnicos de las visitas</h2>
          <p>
            Como cualquier sitio web, nuestro servidor y nuestro proveedor de red (Cloudflare) registran datos técnicos
            de cada visita, como la dirección IP, el navegador, la página visitada y la fecha, para proteger el sitio
            frente a abusos y obtener estadísticas generales. <strong>No usamos cookies de seguimiento ni scripts de
            analítica.</strong> Las preferencias que elijas (idioma o configuración avanzada) se guardan solo en tu
            navegador.
          </p>

          <h2>4. Funciones que se conectan a terceros solo si tú las usas</h2>
          <p>
            La herramienta «Sellar con fecha y hora» envía a la autoridad de sellado de tiempo que elijas una huella
            digital (hash) de tu documento, no el documento. Si no usas esa función, no ocurre ninguna conexión.
          </p>

          <h2>5. Datos personales (Ley N.° 29733)</h2>
          <p>
            Como no recibimos tus archivos, no tratamos los datos personales que contienen. Si nos escribes por
            WhatsApp o correo, usamos tus datos de contacto solo para responderte. Puedes pedir que los eliminemos
            escribiendo a <a href="mailto:{CORREO}">{CORREO}</a>.
          </p>

          <h2>6. Cambios en esta política</h2>
          <p>Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización.</p>''',
    ),
    'terms': dict(
        titulo='Términos y condiciones | Cluzter PDF',
        descripcion='Términos y condiciones de uso de Cluzter PDF, las herramientas PDF gratuitas de Cluzter.',
        h1='Términos y condiciones', tipo='WebPage',
        contenido=f'''          <h2>1. Aceptación</h2>
          <p>Al usar Cluzter PDF aceptas estos términos. Si no estás de acuerdo, no uses el sitio.</p>

          <h2>2. El servicio</h2>
          <p>
            Cluzter PDF ofrece herramientas gratuitas para trabajar con archivos PDF que funcionan en tu navegador.
            Se ofrecen «tal cual», sin garantías de ningún tipo. Revisa siempre el resultado antes de usarlo y
            conserva una copia de tus archivos originales.
          </p>

          <h2>3. Uso responsable</h2>
          <p>
            Eres responsable de los archivos que procesas y de tener los derechos o permisos necesarios sobre ellos
            (por ejemplo, para quitar la contraseña de un documento). No uses el sitio para actividades ilegales ni
            para vulnerar derechos de terceros.
          </p>

          <h2>4. Limitación de responsabilidad</h2>
          <p>
            En la medida que permita la ley, Cluzter no será responsable por pérdidas de datos, daños o perjuicios
            derivados del uso del sitio o de la imposibilidad de usarlo.
          </p>

          <h2>5. Software y marca</h2>
          <p>
            El software de este sitio es código abierto bajo la licencia GNU AGPL-3.0 (ver
            <a href="/licensing">Licencia y código fuente</a>). La marca y el logotipo de Cluzter pertenecen a su
            titular y no se licencian con el código.
          </p>

          <h2>6. Ley aplicable</h2>
          <p>Estos términos se rigen por las leyes de la República del Perú.</p>

          <h2>7. Contacto</h2>
          <p>Para consultas sobre estos términos escribe a <a href="mailto:{CORREO}">{CORREO}</a>.</p>''',
    ),
    'licensing': dict(
        titulo='Licencia y código fuente | Cluzter PDF',
        descripcion='Cluzter PDF es software libre bajo la licencia GNU AGPL-3.0, basado en BentoPDF. Consulta aquí su código fuente.',
        h1='Licencia y código fuente', tipo='WebPage',
        contenido=f'''          <h2>Licencia</h2>
          <p>
            Cluzter PDF es software libre distribuido bajo la
            <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">GNU Affero General Public License v3.0 (AGPL-3.0)</a>.
            Puedes usarlo, estudiarlo, modificarlo y redistribuirlo bajo esos mismos términos.
          </p>

          <h2>Código fuente</h2>
          <p>
            El código fuente completo de este sitio, incluidas todas nuestras modificaciones y los scripts con los que
            lo compilamos, está publicado en
            <a href="{REPO}" target="_blank" rel="noopener noreferrer">{REPO.replace('https://', '')}</a>.
          </p>

          <h2>Proyecto original</h2>
          <p>
            Cluzter PDF es una versión modificada de <a href="{ORIGINAL}" target="_blank" rel="noopener noreferrer">BentoPDF</a>
            (© sus autores), publicado bajo AGPL-3.0. Cambios principales de nuestra versión: marca Cluzter,
            español como idioma principal, todos los motores servidos desde nuestro propio dominio (sin CDNs externos),
            páginas propias y herramientas adicionales.
          </p>

          <h2>Componentes de terceros</h2>
          <p>Cluzter PDF usa, entre otras, estas librerías de código abierto, cada una con su propia licencia:</p>
          <ul>
            <li>PyMuPDF y Ghostscript (Artifex): AGPL-3.0</li>
            <li>CoherentPDF (cpdf): AGPL-3.0</li>
            <li>LibreOffice (conversión de documentos de Office): MPL-2.0</li>
            <li>PDF.js (Mozilla): Apache-2.0</li>
            <li>Tesseract y Tesseract.js (reconocimiento de texto): Apache-2.0</li>
            <li>qpdf: Apache-2.0</li>
            <li>PDFium y EmbedPDF: BSD/Apache-2.0 y MIT</li>
            <li>pdf-lib: MIT</li>
          </ul>
          <p>La lista completa está en los archivos <code>package.json</code> y <code>package-lock.json</code> del repositorio.</p>

          <h2>Marca</h2>
          <p>La licencia cubre el código, no la marca: el nombre y el logotipo de Cluzter pertenecen a su titular.</p>''',
    ),
}


def main():
    for ruta, p in PAGINAS.items():
        html = CABECERA.format(sitio=SITIO, ruta=ruta, actualizado=ACTUALIZADO, **p)
        with open(os.path.join(RAIZ, f'{ruta}.html'), 'w', encoding='utf-8') as f:
            f.write(html)
    print('páginas:', ', '.join(f'{r}.html' for r in PAGINAS))


if __name__ == '__main__':
    main()
