export interface GuildSchema {
  id: number;
  guild_id: string;
  created_at: Date;
}

export interface UserSchema {
  id: number;
  user_id: string;
  guild_id: string;
  created_at: Date;
}

export interface BugSchema {
  id: number;
  user_id: number;
  status: "open" | "closed";
  title: string;
  description: string;
  created_at: Date;
}

export interface MediaSchema {
  id: number;
  media_type: "image" | "video";
  data: Buffer;
  user_id: number;
  bug_id: number;
  created_at: Date;
}
