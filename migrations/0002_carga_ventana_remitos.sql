-- Rol "carga" (solo carga, sin visibilidad), ventana temporal de carga y remitos
-- (control de que un mismo lote de horas no se mande dos veces por GDE).

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
  creado_por INTEGER NOT NULL REFERENCES users(id),
  creado_por_usuario TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmado_por_usuario TEXT,
  confirmado_at TEXT,
  anulado_por_usuario TEXT,
  anulado_at TEXT,
  motivo_anulacion TEXT
);

CREATE INDEX IF NOT EXISTS idx_remitos_estado ON remitos(estado);

ALTER TABLE horas_extra ADD COLUMN remito_id INTEGER REFERENCES remitos(id);
CREATE INDEX IF NOT EXISTS idx_horas_remito ON horas_extra(remito_id);
