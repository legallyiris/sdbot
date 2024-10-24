import { type BaseInteraction, type Client, Events } from "discord.js";
import { createGuild, createUser, getGuild, getUser } from "../database.ts";

function checkUser(userId: string, guildId: string): void {
  checkGuild(guildId);
  const user = getUser(userId, guildId);
  if (!user) createUser(userId, guildId);
}

function checkGuild(guildId: string): void {
  const guild = getGuild(guildId);
  if (!guild) createGuild(guildId);
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
