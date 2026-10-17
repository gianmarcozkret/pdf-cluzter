#!/usr/bin/env bash
# Cluzter PDF — publica dist/ (compilar.sh) y wasm-local/ (preparar-wasm.sh) en /var/www/pdf.cluzter.dev.
# Antes guarda una copia de lo publicado (sin los motores, que se pueden volver a descargar).
set -euo pipefail
cd "$(dirname "$0")/.."
DESTINO=/var/www/pdf.cluzter.dev

[ -f dist/index.html ] || { echo "Falta compilar: bash herramientas/compilar.sh"; exit 1; }
[ -d wasm-local/pymupdf ] || { echo "Faltan los motores: bash herramientas/preparar-wasm.sh"; exit 1; }

if [ -f "$DESTINO/index.html" ]; then
  mkdir -p /root/respaldos_pdf_cluzter
  RESPALDO=/root/respaldos_pdf_cluzter/sitio_$(date +%Y%m%d_%H%M%S).tgz
  tar -czf "$RESPALDO" --exclude=./wasm -C "$DESTINO" .
  echo "Copia de respaldo: $RESPALDO"
fi

mkdir -p "$DESTINO/wasm"
rsync -a --delete --exclude=/wasm/ dist/ "$DESTINO/"
rsync -a --delete wasm-local/ "$DESTINO/wasm/"
echo "Publicado en $DESTINO ($(du -sh "$DESTINO" | cut -f1))"
