import { EmbedBuilder } from "discord.js";
import db, { getBug } from "../database.ts";
import type { IModal } from "../types/Interactions.ts";

export default {
  id: "editBug",
  execute: async (_client, interaction, guildSchema, userSchema) => {
    if (!interaction.guild) return;
    const bugId = interaction.customId.split("-")[1];
    const bug = getBug(Number(bugId));
    if (!bug)
      return interaction.reply({
        content: ":x: Bug not found",
        ephemeral: true,
      });

    if (!bug.sent)
      return interaction.reply({
        content: ":x: You can only edit sent bugs.",
        ephemeral: true,
      });

    if (!userSchema || !guildSchema)
      return interaction.reply({
        content: ":x: User or guild not found",
        ephemeral: true,
      });

    const managers = guildSchema.manager_roles;
    const user = interaction.guild.members.cache.get(userSchema.user_id);
    const roles = user?.roles.cache.map((r) => r.id);

    if (
      userSchema.user_id !== interaction.user.id &&
      !roles?.some((r) => !managers.includes(r))
    )
      return interaction.reply({
        content: ":x: Only the bug author or moderators can edit bugs",
        ephemeral: true,
      });

    const title = interaction.fields.getTextInputValue("title");
    const description = interaction.fields.getTextInputValue("description");

    if (!title || !description) {
      return interaction.reply({
        content: "Please fill out all fields.",
        ephemeral: true,
      });
    }

    if (title.length > 256 || description.length > 4000) {
      return interaction.reply({
        content:
          "Title must be less than 256 characters and description must be less than 4,000 characters.",
        ephemeral: true,
      });
    }

    const message = await interaction.channel?.messages.fetch(bug.message_id);
    if (!message)
      return interaction.reply({
        content: ":x: Bug message not found",
        ephemeral: true,
      });

    const embed = message.embeds[0];
    const newEmbed = EmbedBuilder.from(embed)
      .setTitle(title)
      .setDescription(description);

    await message.edit({ embeds: [newEmbed] });
    await interaction.reply({
      content: ":white_check_mark: Bug edited",
      ephemeral: true,
    });

    db.exec("UPDATE bugs SET title = ?, description = ? WHERE id = ?", [
      title,
      description,
      bugId,
    ]);
  },
} as IModal;
