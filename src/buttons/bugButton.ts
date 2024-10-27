import { getBug } from "../database.ts";
import type { IButton } from "../types/Interactions.ts";
import { createModal } from "../utils/bugUtils.ts";

export default {
  id: "bug",
  execute: async (_client, interaction, _guildSchema, _userSchema) => {
    const bugId = interaction.customId.split("-")[1];

    const bug = getBug(Number(bugId));
    if (!bug)
      return interaction.reply({
        content: ":x: Bug not found",
        ephemeral: true,
      });

    const modal = createModal(bugId, bug.title);
    await interaction.showModal(modal);
  },
} as IButton;
