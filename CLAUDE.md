# Generador de Certificados — Universidad

Plataforma web reutilizable para que una universidad emita certificados de participación (cursos, diplomados, congresos). La universidad crea eventos, sube el diseño de cada uno, ubica los campos variables encima, carga participantes desde Excel/CSV, y los participantes descargan su certificado desde un portal público. Cada certificado es verificable con un código único y QR.

## Entorno de desarrollo (respetar siempre)

- Windows 10/11 con **Windows PowerShell 5.1**. El operador `&&` NO funciona: encadenar comandos con `;` o darlos en líneas separadas.
- Node 24.x.
- **No hay Visual Studio ni Build Tools de C++**: prohibido usar dependencias con módulos nativos que requieran node-gyp (`canvas`, `sharp`, `bcrypt`, `puppeteer` con builds nativos, etc.). Solo librerías JavaScript puras.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase: Postgres, Storage (plantillas y fuentes), Auth (solo panel admin)
- `pdf-lib` + `@pdf-lib/fontkit` para componer el PDF
- `qrcode` para generar el QR como PNG
- `react-rnd` para arrastrar y redimensionar campos en el editor
- `xlsx` (SheetJS) para leer Excel/CSV de participantes
- `zod` para validación

## Módulos

### 1. Panel administrativo (`/admin`, requiere login)

- CRUD de eventos: nombre, fecha, descripción, estado (`borrador` | `publicado` | `cerrado`).
- Subida del fondo del certificado en PNG/JPG (carta u oficio, horizontal o vertical). Guardar en Storage y registrar dimensiones.
- **Editor de plantilla**:
  - Muestra el fondo y encima cajas arrastrables/redimensionables (react-rnd) por cada campo.
  - Campos estándar: nombre, documento, nombre del evento, horas, fecha, código de verificación, QR.
  - Campos personalizados que se mapean a columnas del Excel (se guardan en `datos_extra`).
  - Por campo de texto: fuente (de un set fijo), tamaño, color, alineación (izquierda/centro/derecha), ancho máximo.
  - **Autoajuste**: si el texto supera el ancho máximo, reducir el tamaño de fuente hasta que quepa (mínimo configurable).
  - Posiciones y tamaños guardados en **porcentajes** (0–100) relativos al fondo, nunca en píxeles.
  - Botón "Vista previa" que genera el PDF real con datos de ejemplo usando el mismo endpoint de producción.
- Carga de participantes desde Excel/CSV: previsualizar, mapear columnas a campos, validar (documento obligatorio, correo válido, duplicados por documento dentro del evento) y mostrar errores por fila antes de confirmar.
- Edición manual de un participante (corregir nombre, etc.).
- Reporte de descargas por evento, exportable a Excel.
- **Bloqueo de plantilla**: cuando un evento tiene al menos un certificado emitido, la plantilla no se edita directamente; editarla crea una nueva versión. Los certificados ya emitidos se regeneran con su versión original.

### 2. Portal público (`/`)

- El participante ingresa número de documento y correo.
- Si coinciden con un registro, se envía un código OTP de 6 dígitos al correo (vigencia 10 minutos, máximo 5 intentos).
- Validado el OTP, ve la lista de sus certificados (puede tener de varios eventos publicados) y descarga cada uno.
- Rate limiting por IP y por documento para evitar enumeración. Mensajes de error genéricos (no revelar si un documento existe).
- Cumplimiento Ley 1581 (habeas data): nunca exponer datos de un participante sin validar OTP.

### 3. Verificación pública (`/verificar/[codigo]`)

- Muestra si el certificado es válido, nombre del participante, evento, fecha y horas.
- Si el código no existe, mensaje claro de "certificado no encontrado".
- El QR del PDF apunta a esta URL.

### 4. Generación de PDF (`/api/certificados/[id]/pdf`)

- Generación **al vuelo** en el servidor, sin almacenar los PDFs.
- Flujo: cargar fondo desde Storage → crear página con las dimensiones del fondo en puntos (carta horizontal = 792 × 612) → incrustar imagen de fondo → dibujar cada campo convirtiendo porcentajes a puntos (ojo: en pdf-lib el eje Y crece hacia arriba, invertir) → aplicar alineación y autoajuste → incrustar QR.
- Fuentes desde archivos .ttf en Storage o en `/public/fonts`, embebidas con fontkit. Set fijo inicial: una serif, una sans y una script.
- Cada descarga registra una fila en `descargas`.
- El código de verificación se crea una sola vez por participante/evento (primera generación) y no cambia.

## Modelo de datos (Supabase)

```sql
create table eventos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  fecha date not null,
  horas numeric,
  estado text not null default 'borrador' check (estado in ('borrador','publicado','cerrado')),
  created_at timestamptz default now()
);

create table plantillas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  version int not null default 1,
  fondo_url text not null,
  ancho_px int not null,
  alto_px int not null,
  orientacion text not null check (orientacion in ('horizontal','vertical')),
  tamano_pagina text not null default 'carta' check (tamano_pagina in ('carta','oficio')),
  activa boolean not null default true,
  created_at timestamptz default now(),
  unique (evento_id, version)
);

create table campos_plantilla (
  id uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references plantillas(id) on delete cascade,
  tipo text not null check (tipo in ('texto','qr')),
  fuente_dato text not null, -- 'nombre','documento','evento','horas','fecha','codigo','qr' o 'extra:<clave>'
  x_pct numeric not null,
  y_pct numeric not null,
  ancho_pct numeric not null,
  alto_pct numeric not null,
  fuente text,
  tamano numeric,
  tamano_min numeric default 8,
  color text default '#000000',
  alineacion text default 'centro' check (alineacion in ('izquierda','centro','derecha'))
);

create table participantes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  documento text not null,
  nombre text not null,
  correo text not null,
  datos_extra jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (evento_id, documento)
);

create table certificados (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null unique references participantes(id) on delete cascade,
  plantilla_id uuid not null references plantillas(id),
  codigo_verificacion text not null unique,
  emitido_en timestamptz default now()
);

create table descargas (
  id uuid primary key default gen_random_uuid(),
  certificado_id uuid not null references certificados(id) on delete cascade,
  fecha timestamptz default now(),
  ip text
);

create table otp_codigos (
  id uuid primary key default gen_random_uuid(),
  documento text not null,
  correo text not null,
  codigo_hash text not null,
  intentos int not null default 0,
  expira_en timestamptz not null,
  usado boolean not null default false,
  created_at timestamptz default now()
);
```

- Activar RLS en todas las tablas. El portal público y la verificación pasan por API routes con service role; el cliente nunca consulta participantes directamente.
- El código de verificación: 10–12 caracteres alfanuméricos en mayúscula sin caracteres ambiguos (sin 0/O, 1/I/L).
- Guardar el OTP hasheado (SHA-256 con `crypto` nativo de Node, no bcrypt).

## Fases

1. **Base**: proyecto Next + Supabase, esquema SQL, auth admin, CRUD de eventos.
2. **Plantillas**: subida de fondo, editor con react-rnd, guardado en porcentajes, vista previa PDF.
3. **Participantes**: importación Excel/CSV con validación y mapeo de columnas.
4. **Portal**: búsqueda + OTP por correo + descarga.
5. **Verificación**: página `/verificar/[codigo]` y QR en el PDF.
6. **Cierre**: reporte de descargas, versionado/bloqueo de plantillas, rate limiting.

Trabajar fase por fase. Al terminar cada una, resumir qué se hizo y qué falta antes de seguir.

## Pendientes por definir con la universidad

- Proveedor de correo para el OTP (Resend, SMTP institucional, etc.).
- Dominio y hosting (Vercel por defecto).
- Fuentes institucionales, si las tienen.
- Si un participante puede corregir su propio nombre o solo el admin.
