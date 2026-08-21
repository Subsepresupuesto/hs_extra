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
| `admin`       | `CambiarPassword123` | Administración (carga horas de cualquier área, liberar legajos, topes, usuarios, listado consolidado, remitos) |
| `area_ejemplo`| `CambiarPassword123` | Área de ejemplo (renombrar o borrar) |

Hay tres roles: **Secretaría** (rol `area`: carga y ve/borra sus propias cargas, y
tiene acceso completo a remitos de su secretaría), **Oficina** (rol `carga`: carga y
puede ver lo que cargó, pero no puede borrar ni exportar nada) y **Administración**.

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

- **Secretarías/Oficinas**: cargan horas extra por mes (no por día — no hace falta esa
  precisión) una por una o en lote subiendo un Excel (plantilla descargable desde la
  pantalla de carga, con dos botones separados: uno para elegir el archivo y otro para
  cargarlo). Al escribir un legajo que ya tiene cargas anteriores, nombre y apellido se
  autocompletan. No se pueden cargar meses futuros. Solo se puede cargar una vez por
  legajo y por mes desde una misma secretaría/oficina (si intenta cargarse de nuevo, se
  rechaza con aviso); la única excepción es una persona con más de un cargo, a quien
  cada oficina/secretaría le carga el suyo por separado. La carga en lote es todo-o-nada:
  si una sola fila del Excel tiene un error, se rechaza el archivo completo, no solo esa
  fila. La administración puede limitar la carga a una ventana de días del mes (por
  ejemplo, del 1 al 10); fuera de esa ventana, secretarías y oficinas no pueden cargar
  (administración sí, siempre). Ni el tope ni la posibilidad de "liberar" un legajo se
  les muestra a estos roles — si una carga se rechaza por tope, ven un mensaje genérico
  sin detalles del mecanismo interno. Tanto secretarías como oficinas pueden ver (no
  exportar) lo que cargaron hasta el momento, con quién lo cargó (si lo cargó otra
  persona del mismo usuario compartido no se distingue más allá del nombre de usuario).
  Solo las secretarías (no las oficinas) pueden generar, ver, e imprimir remitos, y
  únicamente de su propia secretaría — sin acceso a exportar Excel.
- **Administración**: además de todo lo anterior (puede cargar horas eligiendo cualquier
  secretaría/oficina, y ahí sí debe aclarar cuál), ve el **listado** de todas las
  secretarías/oficinas con filtro por secretaría/oficina y mes (no por legajo) y exporta
  a Excel; para el PDF/GDE abre una versión imprimible y usa "Guardar como PDF" del
  navegador; define los topes mensuales (50%, 100% y combinado) y la ventana de carga;
  libera legajos (temporal para un mes puntual, o permanente) para que puedan superar el
  tope; y gestiona los usuarios de cada secretaría/oficina.
- Los topes se controlan por legajo y mes calendario, sumando todas las cargas de ese
  legajo en el mes sin importar desde qué secretaría/oficina se cargaron; si se supera
  alguno la carga se rechaza con el detalle de qué tope se excedió, salvo que el legajo
  esté liberado.
- **Remitos**: para que las mismas horas nunca se manden dos veces por GDE. Desde
  "Remitos", administración (todas las áreas) o una secretaría (solo la propia) junta
  las horas de un período en un documento con un código único. **Queda confirmado en el
  momento en que se genera** (que es cuando se manda a imprimir): no hay un paso de
  confirmación aparte. Esas horas quedan bloqueadas para siempre (no se pueden borrar ni
  entrar en otro remito). Si hace falta corregir un error, se puede **anular** el remito
  (no hace falta indicar un motivo) y sus horas vuelven a estar disponibles para un
  remito nuevo. Queda todo el historial accesible desde ese menú.

## Cambiar el nombre de la URL

La URL pública tiene la forma `<nombre-del-worker>.<subdominio-de-la-cuenta>.workers.dev`.
El nombre del worker ya es "horas-extra" (se define en `wrangler.jsonc`); la parte que
suele quedar con datos personales es el subdominio de la cuenta de Cloudflare, que se
elige una vez al crear la cuenta y se puede cambiar desde el dashboard de Cloudflare →
Workers & Pages → (ícono de cuenta / Account Home) → ahí aparece la opción de cambiar el
subdominio `workers.dev`. Ese cambio aplica a todos los Workers de esa cuenta (en este
caso solo hay uno). También se puede usar un dominio propio del municipio en vez del
subdominio de Cloudflare, agregándolo como dominio personalizado del Worker.
