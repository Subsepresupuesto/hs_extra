# Sistema de Horas Extra

Aplicación web para que las áreas carguen horas extra y la administración saque un
listado consolidado para GDE, con topes mensuales configurables y liberación de legajos.

Corre en **Cloudflare Workers**, con **Cloudflare D1** (SQLite gestionado) como base de
datos. Todo el plan gratuito de Cloudflare.

## Requisitos

- [Node.js](https://nodejs.org) 22 o superior.
- Una cuenta de Cloudflare (gratis, sin tarjeta) para desplegar.

## Primer uso (desarrollo)

```
npm install
```

La primera vez, aplicar el esquema a la base de datos local (se emula en esta PC, no
hace falta cuenta de Cloudflare para esto):

```
npx wrangler d1 migrations apply horas-extra-db --local
```

Después, cada vez que se quiera probar:

```
npm run dev
```

Abrir http://localhost:3000. Queda sembrado con dos usuarios iniciales:

| Usuario       | Contraseña           | Rol           |
|---------------|-----------------------|---------------|
| `admin`       | `CambiarPassword123` | Administración (carga horas de cualquier área, liberar legajos, topes, usuarios, listado consolidado) |
| `area_ejemplo`| `CambiarPassword123` | Área de ejemplo (renombrar o borrar) |

**Cambiar estas contraseñas es el primer paso antes de usar el sistema en serio**
(desde "Mi cuenta" arriba a la derecha, una vez logueado). El usuario `admin` es el
único que puede liberar legajos por encima del tope y crear/gestionar el resto de
los usuarios — solo debería tenerlo la persona responsable de autorizar excepciones.

Cada área tiene su propio usuario simple (se crean desde el panel de administración,
en "Usuarios"); no hace falta un usuario por persona, alcanza con uno por área que
comparte todo el equipo.

## Desplegar a Cloudflare (gratis)

### 1. Crear la cuenta y la base de datos (una sola vez)

```
npx wrangler login
npx wrangler d1 create horas-extra-db
```

Ese comando imprime un `database_id`. Copiarlo y pegarlo en `wrangler.jsonc`, reemplazando
`REEMPLAZAR_DESPUES_DE_WRANGLER_D1_CREATE`.

Aplicar el esquema a la base ya creada en la nube:

```
npx wrangler d1 migrations apply horas-extra-db --remote
```

### 2. Desplegar

```
npm run cf:deploy
```

Esto compila la app y la sube a Cloudflare. Al terminar imprime la URL pública
(`https://horas-extra.<tu-cuenta>.workers.dev`, o el dominio propio que configures
después desde el panel de Cloudflare).

> **Nota sobre Windows:** el paso de empaquetado (`opennextjs-cloudflare build`) usa
> symlinks, que Windows solo permite si el usuario tiene el "modo desarrollador"
> activado o permisos de administrador. Si no los tenés, no hace falta correr el
> deploy desde tu PC: el workflow de GitHub Actions incluido en
> `.github/workflows/deploy.yml` hace exactamente este paso en un servidor Linux de
> GitHub, sin esa limitación. Solo hay que:
> 1. Subir este proyecto a un repositorio de GitHub.
> 2. En Cloudflare, crear un token de API (Perfil → API Tokens → "Edit Cloudflare
>    Workers") y copiar el "Account ID" (aparece en el panel principal de Cloudflare).
> 3. En GitHub, cargar esos dos valores como secretos del repositorio (Settings →
>    Secrets and variables → Actions): `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
> 4. Cada `git push` a `main` despliega solo. También se puede disparar a mano desde
>    la pestaña "Actions" de GitHub.

### Actualizar después de cambios

Si el esquema de la base no cambió, alcanza con `npm run cf:deploy` (o un `git push` si
se usa el workflow). Si se agrega una migración nueva en `migrations/`, aplicarla antes
con `npx wrangler d1 migrations apply horas-extra-db --remote`.

**Importante:** D1 hace backups automáticos, pero conviene igual exportar la base de
vez en cuando: `npx wrangler d1 export horas-extra-db --remote --output backup.sql`.

## Qué incluye

- **Áreas**: cargan horas extra una por una o en lote subiendo un Excel (plantilla
  descargable desde la pantalla de carga). Al escribir un legajo que ya tiene cargas
  anteriores, nombre y apellido se autocompletan.
- **Administración**: además de todo lo de las áreas (puede cargar horas eligiendo
  cualquier área), ve el listado consolidado de todas las áreas con filtros por área/
  legajo/fecha y exporta a Excel; para el PDF/GDE abre una versión imprimible y usa
  "Guardar como PDF" del navegador; define los topes mensuales (50%, 100% y combinado);
  libera legajos puntuales para que puedan superar el tope; y gestiona los usuarios de
  cada área.
- Los topes se controlan por legajo y mes calendario; si se supera alguno la carga se
  rechaza con el detalle de qué tope se excedió, salvo que el legajo esté liberado.
