# Portal de descarga de certificados — Opción B

Proyecto de una sola vez para una universidad: generar los certificados de participación de un evento a partir de su base de datos y publicar una página donde cada participante descarga el suyo con su número de documento y un segundo dato. **No es la plataforma Genie**: aquí no hay panel admin, ni editor de plantillas, ni base de datos en línea.

## Entorno de desarrollo (respetar siempre)

- Windows 10/11 con **Windows PowerShell 5.1**. `&&` NO funciona: usar `;` o líneas separadas.
- Node 24.x.
- **Sin Visual Studio ni Build Tools de C++**: nada que requiera node-gyp (`canvas`, `sharp`, `bcrypt`, etc.). Solo librerías JavaScript puras.

## Arquitectura

Dos piezas, sin backend:

1. **Generador local** (script de Node que corre en mi equipo): lee el Excel, normaliza los datos, genera un PDF por participante sobre el fondo del diseño y lo guarda con un nombre que es un hash de sus datos.
2. **Sitio estático** (carpeta `site/`, publicado en Cloudflare Pages): un formulario donde la persona escribe su documento y el segundo dato. El navegador calcula el mismo hash y descarga `c/<hash>.pdf`. Si el archivo no existe, muestra un mensaje genérico.

Hosting: **Cloudflare Pages, plan gratuito** (permite uso comercial). No usar Vercel Hobby (prohíbe uso comercial) ni Supabase.

## Estructura

```
/data/            ← base de datos de la universidad (NUNCA se publica, en .gitignore)
/diseno/          ← fondo.png, fuentes .ttf, ejemplo.png del diseñador
/config.json      ← posiciones de campos, columnas del Excel, segundo dato, salt
/scripts/
  generar.mjs     ← genera PDFs + reporte
  normalizar.mjs  ← funciones de normalización (compartidas con el sitio)
/site/            ← lo único que se publica
  index.html
  app.js
  normalizar.js   ← copia exacta de scripts/normalizar.mjs (el build la copia)
  _headers
  c/<hash>.pdf
/entrega/         ← ZIP para la universidad (PDFs nombrados por documento), no se publica
/reportes/        ← validación de la base, no se publica
```

## Dependencias

`pdf-lib`, `@pdf-lib/fontkit`, `xlsx` (SheetJS), `archiver` (para el ZIP). Todas JS puras. Para publicar: `wrangler` (npm) o subir la carpeta `site/` desde el panel de Cloudflare.

## Generador (`npm run generar`)

1. **Leer** el Excel/CSV de `data/`. Las columnas se mapean en `config.json`:
   ```json
   {
     "columnas": { "nombre": "Nombre completo", "documento": "Cédula", "ponencia": "Título ponencia", "segundoDato": "Correo" },
     "segundoDato": "correo",
     "salt": "<cadena aleatoria generada una vez>",
     "pagina": { "ancho": 792, "alto": 612 },
     "campos": [
       { "dato": "nombre", "x": 396, "y": 330, "anchoMax": 600, "fuente": "Lora-Bold.ttf", "tamano": 26, "tamanoMin": 14, "color": "#111111", "alineacion": "centro", "mayusculas": true },
       { "dato": "ponencia", "x": 396, "y": 200, "anchoMax": 560, "fuente": "Lora-Bold.ttf", "tamano": 14, "color": "#111111", "alineacion": "centro", "multilinea": true }
     ]
   }
   ```
   `segundoDato` puede ser `correo`, `celular` o `apellido` (primer apellido). Se define cuando llegue la base.
2. **Validar** y escribir `reportes/validacion.csv`: filas sin documento o sin segundo dato, documentos duplicados, nombres vacíos. Si hay errores, detenerse y mostrarlos; no generar a medias.
3. **Normalizar** para mostrar en el certificado: espacios dobles, mayúsculas/minúsculas según el campo, tildes conservadas.
4. **Generar** cada PDF con pdf-lib: incrustar `diseno/fondo.png` a página completa, dibujar cada campo convirtiendo coordenadas (en pdf-lib el eje Y crece hacia arriba), centrar según `alineacion`, reducir el tamaño hasta `tamanoMin` si el texto supera `anchoMax`, partir en líneas si `multilinea`. Si el participante no tiene ponencia, omitir ese campo y su texto fijo asociado.
5. **Nombrar y guardar**:
   - Publicado: `site/c/<sha256(salt + "|" + documentoNorm + "|" + segundoNorm)>.pdf` (hex en minúsculas).
   - Entrega: `entrega/<documento>.pdf`, y al final `entrega/certificados.zip`.
6. **Muestra**: generar también `reportes/muestra/` con 5 PDFs (incluir el nombre más largo y un participante sin ponencia) para revisarlos antes de publicar.

## Normalización para el hash (crítico)

La misma función, byte a byte, en el generador y en el navegador. Un archivo `normalizar` con:

- **Documento**: quitar todo lo que no sea dígito o letra (puntos, espacios, guiones), mayúsculas.
- **Correo**: `trim`, minúsculas.
- **Celular**: solo dígitos; si empieza por `57` y tiene 12 dígitos, quitar el `57`.
- **Apellido**: tomar la primera palabra, quitar tildes (`normalize('NFD')` + eliminar diacríticos), `ñ`→`n`, mayúsculas, sin espacios.

Escribir pruebas (`npm test`, con `node --test`) con casos como `1.065.123.456` = `1065123456`, `  Maria@Gmail.COM ` = `maria@gmail.com`, `Gómez Pérez` = `GOMEZ`, `+57 300 123 4567` = `3001234567`, y verificar que el hash en Node (`crypto`) y en el navegador (`crypto.subtle.digest`) coinciden para los mismos datos.

## Sitio (`site/`)

- Una sola página, sin frameworks: `index.html` + `app.js` + CSS inline. Sin dependencias externas.
- Título del evento, una línea de instrucciones, campo **Número de documento**, campo del segundo dato (etiqueta según `config.segundoDato`: "Correo registrado", "Celular registrado" o "Primer apellido"), botón **Descargar certificado**.
- Al enviar: normalizar → hash con Web Crypto → `fetch('c/<hash>.pdf', { method: 'HEAD' })`. Si responde 200, descargar con nombre `Certificado-<documento>.pdf`. Si no, mostrar: "No encontramos un certificado con esos datos. Revisa que sean los mismos que registraste en el evento."
- Nunca revelar si un documento existe por separado del segundo dato.
- Responsive, usable en celular, accesible (labels, foco visible, mensajes con `aria-live`).
- Pie con un correo de contacto de la universidad para casos que no encuentren su certificado (pendiente).
- El build genera `site/app.js` con el `salt` y el `segundoDato` desde `config.json`.

### `_headers`

```
/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
/c/*
  Cache-Control: private, max-age=0, no-store
```

Agregar también `<meta name="robots" content="noindex">` en `index.html`. Cloudflare Pages no lista directorios; no publicar ningún índice de participantes ni archivos de la base.

## Publicación

- `npx wrangler pages deploy site --project-name certificados-<evento>` (o subir `site/` desde el panel de Cloudflare).
- Límites del plan gratuito: 20.000 archivos por despliegue y 25 MiB por archivo. Verificar que el número de participantes y el peso de cada PDF entren (optimizar el PNG de fondo si un PDF pasa de ~1 MB).
- Dominio propio: agregarlo en Cloudflare Pages → Custom domains y pasarle a la universidad el registro CNAME que indique el panel. Si no tienen dominio, usar la dirección `*.pages.dev`.

## Seguridad y datos personales (Ley 1581 de 2012)

- `data/`, `entrega/` y `reportes/` en `.gitignore`. Nunca subirlos al repositorio ni a `site/`.
- Al cerrar el proyecto: entregar el ZIP, borrar `data/`, `entrega/` y `reportes/` del equipo, y dejar solo el código.
- El salt es público (va en `app.js`); su función es que los nombres de archivo no se puedan precalcular con listas genéricas, no reemplaza al segundo dato.

## Fases

1. Estructura del proyecto, `config.json`, normalización y pruebas de hash Node vs navegador.
2. Generador con datos de prueba ficticios y un fondo de prueba: PDFs, validación, muestra, ZIP.
3. Sitio estático y prueba local (`npx serve site`) con los PDFs de prueba.
4. Con el diseño y la base reales: ajustar posiciones de los campos, revisar la muestra y obtener aprobación.
5. Publicar en Cloudflare Pages, conectar el dominio y probar desde celular.
6. A los 3 meses: entregar el ZIP, retirar el sitio (o extender) y borrar los datos.

Trabajar fase por fase y resumir qué quedó y qué falta antes de seguir.

## Pendientes por recibir

- Base de datos real y cuál será el segundo dato.
- Diseño final del diseñador: fondo sin datos variables, fuentes y un ejemplo con nombre.
- Dominio (si lo hay) y correo de contacto de la universidad para el pie de la página.
- Fecha de publicación (desde ahí corren los 3 meses de vigencia).
