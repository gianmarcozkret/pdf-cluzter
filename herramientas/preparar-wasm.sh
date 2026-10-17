#!/usr/bin/env bash
# Cluzter PDF — descarga los motores WebAssembly que el sitio sirve desde su PROPIO dominio (sin CDNs externos)
# y los deja en ./wasm-local con la misma estructura que usa scripts/prepare-airgap.sh de BentoPDF:
#   wasm-local/pymupdf/  wasm-local/gs/  wasm-local/cpdf/
#   wasm-local/ocr/worker.min.js  wasm-local/ocr/core/  wasm-local/ocr/lang-data/  wasm-local/ocr/fonts/
# No van en git (son librerías de terceros, AGPL/Apache, publicadas en npm): al desplegar se copian a
# /var/www/pdf.cluzter.dev/wasm. `npm pack` comprueba la integridad de cada paquete contra el registro de npm.
#
# Uso: bash herramientas/preparar-wasm.sh            (OCR en español e inglés)
#      IDIOMAS_OCR=spa,eng,por bash herramientas/preparar-wasm.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PYMUPDF=$(grep "pymupdf:" src/js/const/cdn-version.ts | grep -o "'[^']*'" | tr -d "'")
GS=$(grep "ghostscript:" src/js/const/cdn-version.ts | grep -o "'[^']*'" | tr -d "'")
CPDF=2.5.5
TESS=$(node -p "require('./package-lock.json').packages['node_modules/tesseract.js'].version")
TESS_CORE=$(node -p "require('./package-lock.json').packages['node_modules/tesseract.js-core'].version")
IDIOMAS_OCR=${IDIOMAS_OCR:-spa,eng}
# Tipografía del texto oculto del OCR para idiomas latinos (misma versión fijada en src/js/config/font-mappings.ts)
FUENTE_OCR=https://raw.githubusercontent.com/googlefonts/noto-fonts/ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf/NotoSans/NotoSans-Regular.ttf

rm -rf ./.wasm-descargas ./wasm-local
mkdir -p ./.wasm-descargas ./wasm-local/pymupdf ./wasm-local/gs ./wasm-local/cpdf \
  ./wasm-local/ocr/core ./wasm-local/ocr/lang-data ./wasm-local/ocr/fonts

echo "Descargando de npm: pymupdf-wasm@$PYMUPDF gs-wasm@$GS coherentpdf@$CPDF tesseract.js@$TESS tesseract.js-core@$TESS_CORE"
paquetes=("@bentopdf/pymupdf-wasm@$PYMUPDF" "@bentopdf/gs-wasm@$GS" "coherentpdf@$CPDF" "tesseract.js@$TESS" "tesseract.js-core@$TESS_CORE")
IFS=',' read -r -a idiomas <<< "$IDIOMAS_OCR"
for l in "${idiomas[@]}"; do paquetes+=("@tesseract.js-data/$l"); done
(cd ./.wasm-descargas && npm pack --silent --registry=https://registry.npmjs.org "${paquetes[@]}" > /dev/null)

extraer() { # extraer <tgz> <subcarpeta del paquete o .> <destino>
  local tmp=./.wasm-descargas/x
  rm -rf ./.wasm-descargas/x && mkdir -p ./.wasm-descargas/x
  tar xzf "$1" -C "$tmp"
  cp -r "$tmp/package/$2/." "$3/"
}
extraer ./.wasm-descargas/bentopdf-pymupdf-wasm-"$PYMUPDF".tgz . ./wasm-local/pymupdf
# Ghostscript: gs.js y gs.wasm en la raíz (como el script air-gap de BentoPDF) y además el paquete completo,
# porque PyMuPDF lo importa desde /wasm/gs/dist/index.js (sin eso, PDF/A y «texto a trazos» fallan).
extraer ./.wasm-descargas/bentopdf-gs-wasm-"$GS".tgz . ./wasm-local/gs
cp -r ./wasm-local/gs/assets/. ./wasm-local/gs/
extraer ./.wasm-descargas/coherentpdf-"$CPDF".tgz dist ./wasm-local/cpdf
extraer ./.wasm-descargas/tesseract.js-core-"$TESS_CORE".tgz . ./wasm-local/ocr/core
rm -rf ./.wasm-descargas/x && mkdir -p ./.wasm-descargas/x
tar xzf ./.wasm-descargas/tesseract.js-"$TESS".tgz -C ./.wasm-descargas/x
cp ./.wasm-descargas/x/package/dist/worker.min.js ./wasm-local/ocr/worker.min.js
for l in "${idiomas[@]}"; do
  rm -rf ./.wasm-descargas/x && mkdir -p ./.wasm-descargas/x
  tar xzf ./.wasm-descargas/tesseract.js-data-"$l"-*.tgz -C ./.wasm-descargas/x
  cp ./.wasm-descargas/x/package/4.0.0_best_int/"$l".traineddata.gz ./wasm-local/ocr/lang-data/
done
curl -4 -fsSL "$FUENTE_OCR" -o ./wasm-local/ocr/fonts/NotoSans-Regular.ttf

rm -rf ./.wasm-descargas
# .gz al lado de cada archivo (nginx gzip_static). Los .traineddata.gz ya vienen comprimidos y Tesseract los abre él mismo.
find ./wasm-local -type f \( -name '*.wasm' -o -name '*.js' -o -name '*.mjs' -o -name '*.json' -o -name '*.data' \) \
  -size +1k -exec gzip -9 -k -n -f {} +
du -sh ./wasm-local ./wasm-local/* ./wasm-local/ocr/*
