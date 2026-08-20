CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('area','admin')),
  area_name TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS horas_extra (
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
  cargado_por INTEGER NOT NULL REFERENCES users(id),
  cargado_por_usuario TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_horas_legajo_periodo ON horas_extra(legajo, periodo);
CREATE INDEX IF NOT EXISTS idx_horas_area ON horas_extra(area);
CREATE INDEX IF NOT EXISTS idx_horas_fecha ON horas_extra(fecha);

CREATE TABLE IF NOT EXISTS legajos_liberados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  legajo TEXT NOT NULL,
  nombre TEXT,
  apellido TEXT,
  periodo TEXT,
  motivo TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_por INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_liberados_legajo ON legajos_liberados(legajo, activo);

CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

INSERT OR IGNORE INTO config (clave, valor) VALUES ('limite_50', '30');
INSERT OR IGNORE INTO config (clave, valor) VALUES ('limite_100', '20');
INSERT OR IGNORE INTO config (clave, valor) VALUES ('limite_combinado', '50');

-- Usuario inicial: admin / CambiarPassword123 (cambiar apenas se entra al sistema).
INSERT OR IGNORE INTO users (username, password_hash, role, area_name)
VALUES ('admin', '$2b$10$qzSdpdi2gx0GgKfkgHu.7emXa0XvdF7FBSSm7krj98ee.fjFZicNG', 'admin', NULL);

-- Área de ejemplo: area_ejemplo / CambiarPassword123 (renombrar o borrar desde Usuarios).
INSERT OR IGNORE INTO users (username, password_hash, role, area_name)
VALUES ('area_ejemplo', '$2b$10$qzSdpdi2gx0GgKfkgHu.7emXa0XvdF7FBSSm7krj98ee.fjFZicNG', 'area', 'Área Ejemplo (renombrar o eliminar)');
