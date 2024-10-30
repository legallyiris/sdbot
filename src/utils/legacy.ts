import type { ButtonInteraction, Client } from "discord.js";
import { createBug, createUser, getUser } from "../database.ts";
import { createButtons, createEmbed } from "./bugUtils.ts";

export async function portButton(
  interaction: ButtonInteraction,
  client: Client,
) {
  const embed = interaction.message.embeds[0];
  if (!embed) return interaction.reply("No embed found.");
  if (!embed.title || !embed.description || !embed.author?.name)
    return interaction.reply("Embed is missing fields.");
  if (!interaction.guildId) return interaction.reply("No guild found.");

  const user =
    client.users.cache.find((u) => u.username === embed.author?.name) ||
    interaction.user;

  const title = embed.title;
  const description = embed.description;
  const dbUser =
    getUser(user.id, interaction.guildId) ||
    createUser(user.id, interaction.guildId);

  const bug = createBug(
    dbUser.id,
    title,
    description,
    true,
    interaction.message.id,
  );
  const bugEmbed = createEmbed(bug, interaction.user);
  const buttons = createButtons(
    bug.id.toString(),
    bug,
    true,
    interaction.message.url,
  );

  await interaction.message.edit({ embeds: [bugEmbed], components: [buttons] });
  await interaction.reply({
    content:
      "This bug was using a legacy system. Please click the button again.",
    ephemeral: true,
  });
}
