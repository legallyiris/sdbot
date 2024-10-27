import type { IButton } from "../types/Interactions.ts";
import { getBugAndPermissions, updateBugStatus } from "../utils/bugUtils.ts";

export default {
  id: "bugSolved",
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

    await updateBugStatus(
      interaction,
      bug.id.toString(),
      "closed",
      `:white_check_mark: Bug #${bug.id} has been closed by <@${interaction.user.id}>`,
    );
  },
} as IButton;
