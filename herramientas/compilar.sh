#!/usr/bin/env bash
# Cluzter PDF — compila el sitio para https://pdf.cluzter.dev. Todo se sirve desde el mismo dominio: los motores
# WASM viven en /wasm (herramientas/preparar-wasm.sh) y no se usa ningún CDN externo. Resultado en ./dist.
# Variables documentadas en el README de BentoPDF (Custom Branding, WASM Configuration, Disabling…).
set -euo pipefail
cd "$(dirname "$0")/.."

export SITE_URL=https://pdf.cluzter.dev
W=$SITE_URL/wasm
export VITE_WASM_PYMUPDF_URL=$W/pymupdf/
export VITE_WASM_GS_URL=$W/gs/
export VITE_WASM_CPDF_URL=$W/cpdf/
export VITE_TESSERACT_WORKER_URL=$W/ocr/worker.min.js
export VITE_TESSERACT_CORE_URL=$W/ocr/core
export VITE_TESSERACT_LANG_URL=$W/ocr/lang-data
export VITE_TESSERACT_AVAILABLE_LANGUAGES=spa,eng
export VITE_OCR_FONT_BASE_URL=$W/ocr/fonts
export VITE_DEFAULT_LANGUAGE=es
export VITE_BRAND_NAME="Cluzter PDF"
export VITE_BRAND_LOGO=images/cluzter-logo.png
export VITE_FOOTER_TEXT="© 2026 Cluzter"
export VITE_CORS_PROXY_URL=          # firma digital: sin proxy de terceros
export DISABLE_GITHUB_STARS=true     # sin llamadas a api.github.com
export COMPRESSION_MODE=g            # archivos .gz junto a los originales; nginx usa gzip_static
export SEO_SOCIAL_IMAGE=/images/og-cluzter-pdf.png
export ORG_SAME_AS=https://cluzter.dev,https://github.com/gianmarcozkret/pdf-cluzter
export NODE_OPTIONS="--max-old-space-size=3072 --dns-result-order=ipv4first"

nice -n 10 npm run build

# Compresión para nginx (gzip_static): cada archivo de texto o WASM queda con su .gz al lado. Brotli no se usa
# (nginx no trae el módulo) y Cloudflare no guarda en caché .wasm ni .data, así que van ya comprimidos.
find dist -name '*.br' -delete
find dist -type f \( -name '*.html' -o -name '*.js' -o -name '*.mjs' -o -name '*.css' -o -name '*.json' \
  -o -name '*.svg' -o -name '*.wasm' -o -name '*.data' -o -name '*.xml' -o -name '*.txt' -o -name '*.ftl' \) \
  -size +1k -exec nice -n 10 gzip -9 -k -n -f {} +
du -sh dist
