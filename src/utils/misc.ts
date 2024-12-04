import type {
  ChatInputCommandInteraction,
  Client,
  MessageContextMenuCommandInteraction,
  User,
  UserContextMenuCommandInteraction,
} from "discord.js";

import { getGuild } from "../database.ts";

type AnyCommandInteraction =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction;

export const errorMessage = async (
  interaction: AnyCommandInteraction,
  message: string,
) => {
  if (interaction.replied)
    return await interaction.followUp({
      content: `❌ ${message}`,
      ephemeral: true,
    });

  if (interaction.deferred)
    return await interaction.editReply({
      content: `❌ ${message}`,
    });

  return await interaction.reply({
    content: `❌ ${message}`,
    ephemeral: true,
  });
};

export async function isManager(client: Client, user: User, guildId: string) {
  const guild = getGuild(guildId);
  if (!guild) return false;

  const member = await client.guilds.cache.get(guildId)?.members.fetch(user.id);
  if (!member) return false;
  const roles = member.roles.cache;

  if (!guild.manager_roles) return false;
  return roles.some((role) => guild.manager_roles.includes(role.id));
}
