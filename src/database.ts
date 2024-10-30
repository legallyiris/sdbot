import { Database, type SQLQueryBindings } from "bun:sqlite";
import config from "./config";
import type {
  BugSchema,
  GuildSchema,
  MediaSchema,
  UserSchema,
} from "./types/Schemas";

const db = new Database(config.databasePath);

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      suggestion_forum TEXT,
      bug_channel TEXT,
      commands_channel TEXT,
      highlights_channel TEXT,

      manager_roles TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      guild_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
    );

    CREATE TABLE IF NOT EXISTS bugs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('open', 'closed')) DEFAULT 'open',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      sent BOOLEAN DEFAULT FALSE,
      message_id TEXT,
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

export function createUser(userId: string, guildId: string): UserSchema {
  return db
    .query("INSERT INTO users (user_id, guild_id) VALUES (?, ?) RETURNING *")
    .get(userId, guildId) as UserSchema;
}

export function createGuild(guildId: string): GuildSchema {
  return db
    .query("INSERT INTO guilds (guild_id) VALUES (?) RETURNING *")
    .get(guildId) as GuildSchema;
}

export function createBug(
  userId: number,
  title: string,
  description: string,
  sent = false,
  messageId?: string,
): BugSchema {
  return db
    .query(
      "INSERT INTO bugs (user_id, title, description, sent, message_id) VALUES (?, ?, ?, ?, ?) RETURNING *",
    )
    .get(userId, title, description, sent, messageId ?? null) as BugSchema;
}

export function createMedia(
  mediaType: "image" | "video",
  data: Uint8Array,
  userId: number,
  bugId?: number,
): MediaSchema {
  return db
    .query(
      "INSERT INTO media (media_type, data, user_id, bug_id) VALUES (?, ?, ?, ?) RETURNING *",
    )
    .get(mediaType, data, userId, bugId ?? null) as MediaSchema;
}

export function query<T = unknown>(
  sql: string,
  params?: SQLQueryBindings[],
): T[] {
  if (params) return db.query(sql).all(...params) as T[];
  return db.query(sql).all() as T[];
}

export function get<T = unknown>(sql: string, params?: SQLQueryBindings[]): T {
  if (params) return db.query(sql).get(...params) as T;
  return db.query(sql).get() as T;
}

export function run(sql: string, params?: SQLQueryBindings[]): void {
  if (params) db.query(sql).run(...params);
  else db.query(sql).run();
}

export function getUser(userId: string, guildId: string, useDiscordId = true) {
  if (useDiscordId)
    return query<UserSchema>(
      "SELECT * FROM users WHERE user_id = ? AND guild_id = ?",
      [userId, guildId],
    )[0];
  return query<UserSchema>(
    "SELECT * FROM users WHERE id = ? AND guild_id = ?",
    [userId, guildId],
  )[0];
}

export function getGuild(guildId: string) {
  return get<GuildSchema>("SELECT * FROM guilds WHERE guild_id = ?", [guildId]);
}

export function getBug(bugId: number) {
  return get<BugSchema>("SELECT * FROM bugs WHERE id = ?", [bugId]);
}

export function getMedia(mediaId: number) {
  return get<MediaSchema>("SELECT * FROM media WHERE id = ?", [mediaId]);
}
