#!/usr/bin/env bash
# Cluzter PDF — reemplaza public/libreoffice-wasm por los archivos OFICIALES del paquete npm
# @matbee/libreoffice-converter (la versión exacta del package-lock, instalada por `npm ci`, que verifica su
# integridad). Los que trae el repo de BentoPDF son una compilación propia que no coincide con ninguna versión
# publicada, así que no se pueden verificar. El cargador (src/js/utils/libreoffice-loader.ts) pide
# soffice.wasm.gz y soffice.data.gz, por eso esos dos se guardan comprimidos.
set -euo pipefail
cd "$(dirname "$0")/.."
ORIGEN=node_modules/@matbee/libreoffice-converter
VERSION=$(node -p "require('./$ORIGEN/package.json').version")
cp "$ORIGEN/wasm/soffice.js" "$ORIGEN/wasm/soffice.worker.js" public/libreoffice-wasm/
cp "$ORIGEN/dist/browser.worker.global.js" public/libreoffice-wasm/
gzip -9 -n -c "$ORIGEN/wasm/soffice.wasm" > public/libreoffice-wasm/soffice.wasm.gz
gzip -9 -n -c "$ORIGEN/wasm/soffice.data" > public/libreoffice-wasm/soffice.data.gz
echo "LibreOffice WASM oficial @matbee/libreoffice-converter@$VERSION:"
(cd public/libreoffice-wasm && sha256sum soffice.js soffice.worker.js browser.worker.global.js && for f in soffice.wasm soffice.data; do echo "$(gzip -dc $f.gz | sha256sum | cut -d' ' -f1)  $f (dentro de $f.gz)"; done)
