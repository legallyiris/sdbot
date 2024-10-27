import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ChatInputCommandInteraction,
  type Client,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import { createBug, createMedia, getGuild, getUser } from "../../database.ts";
import type { UserSchema } from "../../types/Schemas.ts";
import { errorMessage } from "../../utils/misc.ts";

const MAX_FILE_SIZE = 90 * 1024 * 1024;

async function reportBug(
  interaction: ChatInputCommandInteraction,
  user: UserSchema,
) {
  await interaction.reply({
    content: "Processing your bug report...",
    ephemeral: true,
  });

  const title = interaction.options.getString("title");
  if (!title) return errorMessage(interaction, "Please provide a title.");

  const bug = createBug(user.id, title, "");
  if (!bug) return errorMessage(interaction, "An error occurred.");

  const media = interaction.options.getAttachment("media");
  if (media) {
    const mediaUrl = media.url;
    const mediaType = media.contentType;
    const mediaSize = media.size;

    if (mediaSize > MAX_FILE_SIZE) {
      return errorMessage(
        interaction,
        `Media file is too large. Please keep it under ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`,
      );
    }

    await interaction.editReply({
      content: `Downloading media (${Math.round(mediaSize / 1024)}KB)... This may take a while.`,
    });

    const mediaData = await fetch(mediaUrl);
    if (!mediaData.ok) {
      return errorMessage(
        interaction,
        "An error occurred while fetching the media.",
      );
    }

    const mediaBuffer = await mediaData.arrayBuffer();
    if (!mediaBuffer) {
      return errorMessage(
        interaction,
        "An error occurred while fetching the media.",
      );
    }

    if (mediaType !== "image/png" && mediaType !== "video/mp4") {
      return errorMessage(
        interaction,
        "Invalid media type. Please provide either a .png or .mp4 file.",
      );
    }
    const image = createMedia(
      mediaType === "image/png" ? "image" : "video",
      new Uint8Array(mediaBuffer),
      user.id,
      bug.id,
    );
    if (!image) {
      return errorMessage(
        interaction,
        "An error occurred while storing the media.",
      );
    }

    await interaction.editReply({
      content: "Media downloaded successfully.",
    });
  }

  const button = new ButtonBuilder()
    .setStyle(1)
    .setLabel("Add Details")
    .setCustomId(`bug-${bug.id}`);

  await interaction.editReply({
    content: "Click the button below to add more details to the bug report.",
    components: [
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        button,
      ),
    ],
  });
}

async function helpBug(interaction: ChatInputCommandInteraction) {
  await interaction.reply({
    content: `To report a bug, you can use the </bug report:${interaction.commandId}> command. \nYou will be asked to provide a summary of the bug when running the command, and will be asked to provide more details later.`,
    ephemeral: true,
  });
}

const command = new SlashCommandBuilder()
  .setName("bug")
  .setDescription("Report a bug to the developers.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("report")
      .setDescription("Report a bug to the developers.")
      .addStringOption((option) =>
        option
          .setName("title")
          .setDescription(
            "Provide a brief summary of the bug. You will be asked to provide more details later.",
          )
          .setMaxLength(256)
          .setMinLength(8)
          .setRequired(true),
      )
      .addAttachmentOption((option) =>
        option
          .setName("media")
          .setDescription(
            "Attach a screenshot or video of the bug. Supported formats are .png and .mp4.",
          ),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("help").setDescription("Get help with reporting a bug."),
  );

export default {
  data: command.toJSON(),
  async execute(client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      return errorMessage(
        interaction,
        "This command can only be used in a server.",
      );
    }

    const guild = getGuild(interaction.guildId);
    const user = getUser(interaction.user.id, interaction.guildId);
    if (!user || !guild) return errorMessage(interaction, "An error occurred.");

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "report") return await reportBug(interaction, user);
    if (subcommand === "help") return await helpBug(interaction);
  },
};
