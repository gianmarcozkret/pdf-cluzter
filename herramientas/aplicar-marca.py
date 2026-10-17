#!/usr/bin/env python3
"""Cluzter PDF — cambia la marca BentoPDF por Cluzter PDF en el CONTENIDO VISIBLE del sitio.

Se puede volver a correr cuando se traigan actualizaciones de BentoPDF (es idempotente). Solo toca:
  - títulos, metadatos (og/twitter/autor), datos estructurados JSON-LD y URLs bentopdf.com de las páginas;
  - los textos de la interfaz en public/locales/{es,en}.
NO toca identificadores internos en minúsculas (clases, claves, «data-bentopdf-…»), ni los créditos y la
licencia: BentoPDF es AGPL-3.0 y el crédito al proyecto original debe quedar (pie de página y /licensing).

Uso: python3 herramientas/aplicar-marca.py
"""
import glob
import json
import os
import re

RAIZ = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
SITIO = 'https://pdf.cluzter.dev'
MARCA = 'Cluzter PDF'
IMAGEN_SOCIAL = f'{SITIO}/images/og-cluzter-pdf.png'

# Páginas con contenido propio de Cluzter (se escribieron a mano y mencionan a BentoPDF a propósito, como crédito).
EXCLUIR = {'about.html', 'licensing.html', 'privacy.html', 'terms.html', 'contact.html', 'src/partials/footer.html'}

REGLAS = [
    # cuentas de BentoPDF en Twitter/X: la línea se quita
    (re.compile(r'\n[ \t]*<meta name="twitter:(?:site|creator)" content="@BentoPDF" />'), ''),
    # imágenes para redes sociales (no existen en este sitio): una imagen genérica de Cluzter PDF
    (re.compile(r'https://(?:www\.)?bentopdf\.com/images/(?:og|twitter)-[a-z0-9-]+\.(?:png|jpg)'), IMAGEN_SOCIAL),
    (re.compile(r'https://(?:www\.)?bentopdf\.com'), SITIO),
    (re.compile(r'(<meta name="author" content=")BentoPDF(")'), r'\1Cluzter\2'),
    (re.compile(r'\bBento ?PDF\b'), MARCA),
]


def cambiar(texto):
    for patron, reemplazo in REGLAS:
        texto = patron.sub(reemplazo, texto)
    return texto


def archivos_html():
    rutas = glob.glob(os.path.join(RAIZ, '*.html')) + glob.glob(os.path.join(RAIZ, 'src/pages/*.html')) \
        + glob.glob(os.path.join(RAIZ, 'src/partials/*.html'))
    return [r for r in rutas if os.path.relpath(r, RAIZ) not in EXCLUIR]


def cambiar_json(valor):
    if isinstance(valor, dict):
        return {k: cambiar_json(v) for k, v in valor.items()}
    if isinstance(valor, list):
        return [cambiar_json(v) for v in valor]
    if isinstance(valor, str):
        return cambiar(valor)
    return valor


def main():
    tocados = 0
    for ruta in archivos_html():
        original = open(ruta, encoding='utf-8').read()
        nuevo = cambiar(original)
        if nuevo != original:
            open(ruta, 'w', encoding='utf-8').write(nuevo)
            tocados += 1
    for ruta in glob.glob(os.path.join(RAIZ, 'public/locales/*/*.json')):
        datos = json.load(open(ruta, encoding='utf-8'))
        nuevos = cambiar_json(datos)
        if nuevos != datos:
            with open(ruta, 'w', encoding='utf-8') as f:
                json.dump(nuevos, f, ensure_ascii=False, indent=2)
                f.write('\n')
            tocados += 1
    print(f'{tocados} archivos actualizados')


if __name__ == '__main__':
    main()
