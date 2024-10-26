import type {
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
} from "discord.js";

type AnyCommandInteraction =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction;

export const errorMessage = async (
  interaction: AnyCommandInteraction,
  message: string,
) => {
  return await interaction.reply({
    content: `❌ ${message}`,
    ephemeral: true,
  });
};
