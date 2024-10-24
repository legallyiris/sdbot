import { SlashCommandBuilder } from "@discordjs/builders";
import type { ChatInputCommandInteraction, Client } from "discord.js";
import { getGuild, getUser } from "../../database.ts";

const command = new SlashCommandBuilder()
  .setName("info")
  .setDescription("Returns information about the user and the guild.")
  .setDefaultMemberPermissions(0);

export default {
  data: command.toJSON(),
  async execute(client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId)
      return interaction.reply("This command can only be used in a server.");

    const guild = getGuild(interaction.guildId);
    const user = getUser(interaction.user.id, interaction.guildId);
    if (!user || !guild)
      return interaction.reply({
        content: "An error occurred while fetching user and/or guild data.",
        ephemeral: true,
      });

    const userDate = new Date(user.created_at);
    const guildDate = new Date(guild.created_at);

    const guildInfo = `
      **Guild ID** ${guild.id}
      **Created** ${guildDate.toDateString()} (<t:${Math.floor(guildDate.getTime() / 1000)}>)
    `;

    const userInfo = `
      **User ID** ${user.id}
      **Guild ID** ${user.guild_id}
      **Created** ${userDate.toDateString()} (<t:${Math.floor(userDate.getTime() / 1000)}>)
    `;

    await interaction.reply({
      content: `## Guild Info${guildInfo}\n## User Info${userInfo}`,
      ephemeral: true,
    });
  },
};
