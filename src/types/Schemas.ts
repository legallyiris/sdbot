export interface GuildSchema {
  id: number;
  guild_id: string;
  created_at: Date;

  suggestion_forum: string;
  bug_channel: string;
  commands_channel: string;
  highlights_channel: string;

  /**
    The IDs of roles that can delete, edit, and close bugs.
    Returns a stringified JSON array of strings.
    @example ["123456789012345678", "123456789012345678"]
  */
  manager_roles: string;
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
