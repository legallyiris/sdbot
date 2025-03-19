import {
  AttachmentBuilder,
  type Message,
  PermissionFlagsBits,
} from "discord.js";
import db, { getBug, getMediaByBugId } from "../database.ts";
import type { IModal } from "../types/Interactions.ts";
import { createButtons, createEmbed } from "../utils/bugUtils.ts";

function threadMessage(userId: string): string {
  return `Hey, <@${userId}>! Thanks for submitting a bug report. This thread has been created for further discussion and for providing any additional information.

Please ensure that your report contains **all the necessary information**, like a clear description of the bug, steps to reproduce it and any other potentially useful information.

If possible, please provide the output in the console, which can be accessed by pressing F10 or entering /console in the chat.
Make sure to scroll all the way to the bottom to see the latest logs.

You can edit your report at any time by clicking the "Edit" button.`;
}

export default {
  id: "bug",
  execute: async (_client, interaction, guildSchema, _userSchema) => {
    if (!interaction.guild || !interaction.guildId)
      return interaction.reply({
        content: ":x: Guild not found",
        ephemeral: true,
      });

    const bugId = interaction.customId.split("-")[1];
    const bug = getBug(Number(bugId));
    if (!bug)
      return interaction.reply({
        content: ":x: Bug not found",
        ephemeral: true,
      });

    if (bug.sent)
      return interaction.reply({
        content: ":x: Bug already sent",
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

    const bugChannelId = guildSchema?.bug_channel;
    if (!bugChannelId) {
      return interaction.reply({
        content: "Bug channel not set up.",
        ephemeral: true,
      });
    }

    const bugChannel = interaction.guild?.channels.cache.get(bugChannelId);
    if (!bugChannel) {
      return interaction.reply({
        content: "Bug channel not found.",
        ephemeral: true,
      });
    }

    bug.description = description;
    bug.title = title;
    const bugEmbed = createEmbed(bug, interaction.user);

    if (!bugChannel.isSendable())
      return interaction.reply("Bug channel not sendable.");

    const clientMember = interaction.guild.members.me;
    if (!clientMember) return interaction.reply("Can't get bot member.");

    const permissions = clientMember?.permissionsIn(bugChannel);
    if (!permissions.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({
        content:
          "Bot does not have permission to send messages in the bug channel.",
        flags: ["Ephemeral"],
      });
    }

    let message: Message;
    const media = getMediaByBugId(bug.id);
    let attachment: AttachmentBuilder | undefined;

    if (media) {
      const buffer = Buffer.from(media.data);
      const attachment = new AttachmentBuilder(buffer, {
        name: `media.${media.media_type === "image" ? "png" : "mp4"}`,
      });
    }

    try {
      message = await bugChannel.send({
        embeds: [bugEmbed],
        ...(attachment ? { files: [attachment] } : {}),
      });
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: "Failed to send bug report.",
        ephemeral: true,
      });
    }

    if (!message) {
      return interaction.reply({
        content: "Failed to send bug report.",
        ephemeral: true,
      });
    }

    await message.edit({
      components: [createButtons(bugId, bug, true, message.url)],
    });

    const reply = await interaction.reply({
      content: `Thanks, your bug report has been sent! [View it here](${message.url})`,
      ephemeral: true,
    });

    let trimmedThreadName = `#${bugId} - ${title}`;
    if (trimmedThreadName.length > 128)
      trimmedThreadName = `${trimmedThreadName.slice(0, 127)}…`;

    const thread = await message.startThread({
      name: trimmedThreadName,
      autoArchiveDuration: 60,
    });
    await thread.members.add(interaction.user.id);
    await thread.send(threadMessage(interaction.user.id));

    db.exec(
      "UPDATE bugs SET title = ?, description = ?, sent = 1, message_id = ? WHERE id = ?",
      [title, description, message.id, bug.id],
    );

    await reply.edit(
      `Thanks, your bug report has been sent! [View it here](${message.url}). A [thread](${thread.url}) has been created for further discussion.`,
    );
  },
} as IModal;
