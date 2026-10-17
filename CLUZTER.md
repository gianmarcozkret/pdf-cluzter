# Cluzter PDF

**Cluzter PDF** ([pdf.cluzter.dev](https://pdf.cluzter.dev)) es una versión modificada de
[BentoPDF](https://github.com/alam00000/bentopdf), distribuida bajo la misma licencia
[GNU AGPL-3.0](LICENSE). Este archivo cumple el aviso de cambios que pide la licencia (sección 5).

- Proyecto original: BentoPDF, © sus autores — https://github.com/alam00000/bentopdf
- Versión de partida: BentoPDF 2.8.8 (commit `167b7e8`)
- Rama con los cambios de Cluzter: `cluzter`
- Modificado por Cluzter desde el 17 de octubre de 2026

## Qué cambia respecto de BentoPDF

- **Marca y textos:** marca Cluzter PDF (logo, favicons, imagen para redes y manifest); español como idioma
  principal y solo español e inglés. Se quitaron secciones que solo aplican a BentoPDF (donaciones, «usado por»,
  testimonios, sellos de cumplimiento, Kura, Hyper Compress, blog, referidos y redes sociales). Páginas propias:
  acerca de, contacto, privacidad, términos y licencia.
- **Todo en español:** BentoPDF deja en inglés muchos textos fijos (opciones, avisos, preguntas frecuentes, títulos
  y datos estructurados). Los diccionarios `public/locales/es/textos.json` (interfaz y avisos con variables) y
  `public/locales/es/textos-info.json` (textos informativos) se aplican al compilar en las páginas `/es/`
  (`herramientas/traducir-paginas.mjs`) y en el navegador (`src/js/i18n/textos.ts`) para lo que se genera al usar las
  herramientas.
- **Sin terceros:** todos los motores WebAssembly (PyMuPDF, Ghostscript, CoherentPDF, Tesseract) se sirven desde
  el propio dominio y la CSP no permite conexiones externas. LibreOffice usa los archivos oficiales del paquete
  npm `@matbee/libreoffice-converter`.
- **Herramientas nuevas para Perú:** «DNI ambas caras en una hoja» (`src/pages/dni-ambas-caras.html`) y «Tachar
  datos personales en PDF» (`src/pages/tachar-datos-pdf.html`).
- **Desactivada por ahora:** «Sellar con fecha y hora» (necesita un proxy hacia las autoridades de sellado).

## Cómo se compila y publica

Todo está en `herramientas/`:

```bash
npm ci
bash herramientas/preparar-wasm.sh       # descarga los motores WASM a ./wasm-local (npm verifica su integridad)
bash herramientas/libreoffice-oficial.sh # copia el LibreOffice WASM oficial a public/libreoffice-wasm
bash herramientas/compilar.sh            # compila para https://pdf.cluzter.dev → ./dist
bash herramientas/desplegar.sh           # publica dist/ y wasm-local/ en /var/www/pdf.cluzter.dev
```

- `herramientas/aplicar-marca.py`: cambia la marca en el contenido visible (se puede repetir tras actualizar
  desde BentoPDF).
- `herramientas/paginas-propias.py` y `herramientas/paginas-herramientas.py`: generan las páginas propias.
- `herramientas/nginx/`: configuración del sitio y cabeceras de seguridad.

La marca y el logotipo de Cluzter no se licencian con el código.
