import {
  ApplicationCommandType,
  type Client,
  ContextMenuCommandBuilder,
  type ContextMenuCommandType,
  type MessageContextMenuCommandInteraction,
} from "discord.js";
import type { GuildSchema, UserSchema } from "../../types/Schemas.ts";
import logger from "../../utils/logger.ts";
import { errorMessage } from "../../utils/misc.ts";

const data = new ContextMenuCommandBuilder()
  .setName("Highlight Clip")
  .setType(ApplicationCommandType.Message as ContextMenuCommandType);

export default {
  data: data.toJSON(),
  async execute(
    _client: Client,
    interaction: MessageContextMenuCommandInteraction,
    guildSchema: GuildSchema,
    _userSchema: UserSchema,
  ) {
    if (!interaction.guild) return;
    await interaction.deferReply({ ephemeral: true });

    const highlightChannelId = guildSchema.highlights_channel;
    if (!highlightChannelId || highlightChannelId === "")
      return errorMessage(
        interaction,
        "No highlight channel set up for this server.",
      );

    const highlightChannel =
      interaction.guild.channels.cache.get(highlightChannelId);
    if (!highlightChannel)
      return errorMessage(
        interaction,
        "The highlight channel set up for this server doesn't exist.",
      );
    if (!highlightChannel.isSendable())
      return errorMessage(
        interaction,
        "The highlight channel set up for this server is not sendable.",
      );

    const message = interaction.targetMessage;
    if (!message) return errorMessage(interaction, "Message not found.");

    const attachments = message.attachments;
    if (attachments.size === 0)
      return errorMessage(interaction, "There's nothing to highlight.");

    const messageToSend = `:star: New highlight from <@${message.author.id}>\n-# [Jump to message](${message.url})`;
    // downloading x attachments:
    // - attachment1 (x megabytes)
    await interaction.editReply(
      `Downloading ${attachments.size} attachments:\n${attachments
        .map(
          (attachment) =>
            `- ${attachment.name} (${Math.round(
              attachment.size / 1024 / 1024,
            )}MB)`,
        )
        .join("\n")}`,
    );

    const attachmentData: { name: string; attachment: Buffer }[] = [];

    await Promise.all(
      attachments.map(async (attachment) => {
        const response = await fetch(attachment.url);
        if (!response.ok) {
          logger.error(
            `Failed to fetch attachment ${attachment.url} for highlight.`,
          );
          return;
        }

        const buffer = await response.arrayBuffer();
        attachmentData.push({
          name: attachment.name,
          attachment: Buffer.from(buffer),
        });
      }),
    );

    if (attachmentData.length === 0)
      return errorMessage(interaction, "Failed to download attachments.");

    await interaction.editReply("Uploading attachments...");

    try {
      const highlight = await highlightChannel.send({
        content: messageToSend,
        files: attachmentData,
      });

      await interaction.editReply(`Highlight sent! ${highlight.url}`);
    } catch (error) {
      logger.error(`Failed to send highlight: ${error}`);
      console.error(error);
      return errorMessage(interaction, "Failed to send highlight.");
    }
  },
};
