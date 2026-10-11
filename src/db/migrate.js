import { readdirSync, readFileSync } from "node:fs";

// مجلد الـ migrations بالنسبة لهذا الملف، وليس لمكان تشغيل الأمر
const MIGRATIONS_DIR = new URL("./migrations/", import.meta.url);

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT PRIMARY KEY,
      applied_at  TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db
      .prepare("SELECT version FROM schema_migrations")
      .all()
      .map((row) => row.version),
  );

  // الترتيب الأبجدي يعطي الترتيب الرقمي بفضل الأصفار البادئة: 001، 002...
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const recordStmt = db.prepare(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
  );

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(new URL(file, MIGRATIONS_DIR), "utf8");

    db.exec("BEGIN");
    try {
      db.exec(sql);
      recordStmt.run(file, new Date().toISOString());
      db.exec("COMMIT");
      console.log(`[db] Applied migration ${file}`);
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${error.message}`, {
        cause: error,
      });
    }
  }
}
