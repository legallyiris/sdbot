import { Database, type SQLQueryBindings } from "bun:sqlite";
import config from "./config";

const db = new Database(config.databasePath);

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bugs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bug_id INTEGER UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('open', 'closed')) DEFAULT 'open',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_type TEXT CHECK(media_type IN ('image', 'video')) NOT NULL,
      data BLOB NOT NULL,
      user_id INTEGER NOT NULL,
      bug_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (bug_id) REFERENCES bugs(id)
    );
  `);
}

export default db;

export function createUser(userId: string) {
  return db
    .query("INSERT INTO users (user_id) VALUES (?) RETURNING id")
    .get(userId) as { id: number };
}

export function createBug(
  bugId: number,
  userId: number,
  title: string,
  description: string,
) {
  return db
    .query(
      "INSERT INTO bugs (bug_id, user_id, title, description) VALUES (?, ?, ?, ?) RETURNING id",
    )
    .get(bugId, userId, title, description) as { id: number };
}

export function createMedia(
  mediaType: "image" | "video",
  data: Uint8Array,
  userId: number,
  bugId?: number,
) {
  return db
    .query(
      "INSERT INTO media (media_type, data, user_id, bug_id) VALUES (?, ?, ?, ?) RETURNING id",
    )
    .get(mediaType, data, userId, bugId ?? null) as { id: number };
}

export function query<T = unknown>(
  sql: string,
  params?: SQLQueryBindings[],
): T[] {
  if (params) return db.query(sql).all(...params) as T[];
  return db.query(sql).all() as T[];
}

export function run(sql: string, params?: SQLQueryBindings[]): void {
  if (params) db.query(sql).run(...params);
  else db.query(sql).run();
}
