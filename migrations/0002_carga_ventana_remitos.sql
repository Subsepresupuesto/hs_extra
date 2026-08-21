-- Rol "carga" (solo carga, sin visibilidad), ventana temporal de carga y remitos
-- (control de que un mismo lote de horas no se mande dos veces por GDE).
--
-- D1/SQLite no permite modificar un CHECK con ALTER TABLE: hay que recrear la
-- tabla. Como "users" es referenciada por sessions/horas_extra/legajos_liberados,
-- primero se les saca la cláusula REFERENCES a esas tablas (sin tocar sus datos),
-- para poder recrear "users" sin que salte un error de clave foránea.

CREATE TABLE sessions_new (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO sessions_new SELECT * FROM sessions;
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;

CREATE TABLE horas_extra_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  legajo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  area TEXT NOT NULL,
  fecha TEXT NOT NULL,
  periodo TEXT NOT NULL,
  horas_50 REAL NOT NULL DEFAULT 0,
  horas_100 REAL NOT NULL DEFAULT 0,
  motivo TEXT,
  cargado_por INTEGER NOT NULL,
  cargado_por_usuario TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO horas_extra_new
  (id, legajo, nombre, apellido, area, fecha, periodo, horas_50, horas_100, motivo, cargado_por, cargado_por_usuario, created_at)
  SELECT id, legajo, nombre, apellido, area, fecha, periodo, horas_50, horas_100, motivo, cargado_por, cargado_por_usuario, created_at
  FROM horas_extra;
DROP TABLE horas_extra;
ALTER TABLE horas_extra_new RENAME TO horas_extra;

CREATE TABLE legajos_liberados_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  legajo TEXT NOT NULL,
  nombre TEXT,
  apellido TEXT,
  periodo TEXT,
  motivo TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_por INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO legajos_liberados_new
  (id, legajo, nombre, apellido, periodo, motivo, activo, creado_por, created_at)
  SELECT id, legajo, nombre, apellido, periodo, motivo, activo, creado_por, created_at
  FROM legajos_liberados;
DROP TABLE legajos_liberados;
ALTER TABLE legajos_liberados_new RENAME TO legajos_liberados;

CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('area','carga','admin')),
  area_name TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO users_new (id, username, password_hash, role, area_name, activo, created_at)
  SELECT id, username, password_hash, role, area_name, activo, created_at FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS idx_horas_legajo_periodo ON horas_extra(legajo, periodo);
CREATE INDEX IF NOT EXISTS idx_horas_area ON horas_extra(area);
CREATE INDEX IF NOT EXISTS idx_horas_fecha ON horas_extra(fecha);
CREATE INDEX IF NOT EXISTS idx_liberados_legajo ON legajos_liberados(legajo, activo);

-- Ventana de días del mes en que las áreas pueden cargar (ej: del 1 al 10). Vacío = sin restricción.
INSERT OR IGNORE INTO config (clave, valor) VALUES ('ventana_dia_inicio', '');
INSERT OR IGNORE INTO config (clave, valor) VALUES ('ventana_dia_fin', '');

CREATE TABLE IF NOT EXISTS remitos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE,
  area TEXT,
  desde TEXT NOT NULL,
  hasta TEXT NOT NULL,
  estado TEXT NOT NULL CHECK(estado IN ('borrador','confirmado','anulado')) DEFAULT 'borrador',
  creado_por INTEGER NOT NULL,
  creado_por_usuario TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmado_por_usuario TEXT,
  confirmado_at TEXT,
  anulado_por_usuario TEXT,
  anulado_at TEXT,
  motivo_anulacion TEXT
);

CREATE INDEX IF NOT EXISTS idx_remitos_estado ON remitos(estado);

ALTER TABLE horas_extra ADD COLUMN remito_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_horas_remito ON horas_extra(remito_id);
