import type { IButton } from "../types/Interactions.ts";
import { getBugAndPermissions } from "../utils/bugUtils.ts";

export default {
  id: "bugDelete",
  execute: async (client, interaction, _guildSchema, userSchema) => {
    if (!interaction.member || !userSchema) return;
    const { bug, canModify } = await getBugAndPermissions(
      client,
      interaction,
      userSchema,
    );
    if (!bug)
      return interaction.reply({
        content: ":x: Bug not found",
        ephemeral: true,
      });

    if (!canModify)
      return interaction.reply({
        content: ":x: You do not have permission to close this bug",
        ephemeral: true,
      });

    const message = await interaction.channel?.messages.fetch(bug.message_id);
    if (!message) return;

    const thread = message.thread;
    if (thread) {
      await thread.send({
        content: `Bug #${bug.id} has been deleted by <@${interaction.user.id}>`,
      });
      await thread.setLocked(true);
    }

    await message.delete();
    return interaction.reply({
      content: `Bug #${bug.id} has been deleted`,
      ephemeral: true,
    });
  },
} as IButton;
