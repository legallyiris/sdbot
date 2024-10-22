import { type BaseInteraction, type Client, Events } from "discord.js";
import { createGuild, createUser, get } from "../database.ts";

function checkUser(userId: string, guildId: string) {
  checkGuild(guildId);

  const user = get("SELECT * FROM users WHERE user_id = ? AND guild_id = ?", [
    userId,
    guildId,
  ]);

  if (!user) {
    console.log(`Creating user ${userId}`);
    createUser(userId, guildId);
  } else {
    console.log(`User ${userId} already exists`);
  }
}

function checkGuild(guildId: string) {
  const guild = get("SELECT * FROM guilds WHERE guild_id = ?", [guildId]);
  if (!guild) {
    console.log(`Creating guild ${guildId}`);
    createGuild(guildId);
  } else {
    console.log(`Guild ${guildId} already exists`);
  }
}

export default {
  event: Events.InteractionCreate,
  async execute(client: Client, interaction: BaseInteraction) {
    if (!interaction.guild) return;

    checkUser(interaction.user.id, interaction.guild.id);
    if (interaction.isCommand()) {
    }
  },
};
