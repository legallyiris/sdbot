import {
  ApplicationCommandType,
  type Client,
  ContextMenuCommandBuilder,
  type ContextMenuCommandType,
  type MessageContextMenuCommandInteraction,
} from "discord.js";
import type { GuildSchema, UserSchema } from "../../types/Schemas.ts";
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

    const message = interaction.targetMessage;
    if (!message) return errorMessage(interaction, "Message not found.");

    const attachments = message.attachments;
    if (attachments.size === 0)
      return errorMessage(interaction, "There's nothing to highlight.");

    const messageToSend = `:star: New highlight from <@${message.author.id}>\n-# [Jump to message](${message.url})`;

    const files = attachments.map((attachment) => attachment.url);

    if (!highlightChannel.isSendable())
      return errorMessage(
        interaction,
        "I don't have permission to send messages in the highlight channel.",
      );
    const sentMessage = await highlightChannel.send({
      content: messageToSend,
      files,
    });
    await sentMessage.react("⭐");

    if (highlightChannel.lastMessage)
      await interaction.editReply(
        `Message has been highlighted [here](${highlightChannel.lastMessage.url}).`,
      );
    else await interaction.editReply("Message has been highlighted.");
  },
};
