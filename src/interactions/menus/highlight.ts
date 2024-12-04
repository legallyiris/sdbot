import {
  ApplicationCommandType,
  ChannelType,
  type Client,
  ContextMenuCommandBuilder,
  type ContextMenuCommandType,
  type Embed,
  type MessageContextMenuCommandInteraction,
  type TextChannel,
} from "discord.js";
import type { GuildSchema, UserSchema } from "../../types/Schemas.ts";
import logger from "../../utils/logger.ts";
import { errorMessage, isManager } from "../../utils/misc.ts";

const data = new ContextMenuCommandBuilder()
  .setName("Highlight Clip")
  .setType(ApplicationCommandType.Message as ContextMenuCommandType);

const MAX_FILE_SIZE = 90 * 1024 * 1024;

interface VideoProvider {
  name: string;
  domains: string[];
  extractUrl: (embed: Embed) => string | null;
}

const VIDEO_PROVIDERS: VideoProvider[] = [
  {
    name: "Medal.tv",
    domains: ["medal.tv"],
    extractUrl: (embed) => embed.url || null,
  },
  {
    name: "YouTube",
    domains: ["youtube.com", "youtu.be"],
    extractUrl: (embed) => embed.url || null,
  },
  {
    name: "Twitch",
    domains: ["twitch.tv"],
    extractUrl: (embed) => embed.url || null,
  },
];

function isSupportedVideoEmbed(embed: Embed): boolean {
  if (!embed.provider?.name && !embed.provider?.url) return false;

  const providerName = embed.provider.name?.toLowerCase() || "";
  const providerUrl = embed.provider.url?.toLowerCase() || "";

  return VIDEO_PROVIDERS.some((provider) =>
    provider.domains.some(
      (domain) => providerName.includes(domain) || providerUrl.includes(domain),
    ),
  );
}

function getVideoUrl(embed: Embed): string | null {
  if (!embed.provider?.name && !embed.provider?.url) return null;

  const providerName = embed.provider.name?.toLowerCase() || "";
  const providerUrl = embed.provider.url?.toLowerCase() || "";

  for (const provider of VIDEO_PROVIDERS) {
    if (
      provider.domains.some(
        (domain) =>
          providerName.includes(domain) || providerUrl.includes(domain),
      )
    ) {
      return provider.extractUrl(embed);
    }
  }

  return null;
}

async function downloadAndPrepareAttachments(
  interaction: MessageContextMenuCommandInteraction,
  attachments: Map<string, import("discord.js").Attachment>,
) {
  await interaction.editReply(
    `Downloading ${attachments.size} attachments:\n${Array.from(
      attachments.values(),
    )
      .map(
        (attachment) =>
          `- ${attachment.name} (${Math.round(
            attachment.size / 1024 / 1024,
          )}MB)`,
      )
      .join("\n")}`,
  );

  const attachmentData: { name: string; attachment: Buffer | string }[] = [];

  await Promise.all(
    Array.from(attachments.values()).map(async (attachment) => {
      if (attachment.size > MAX_FILE_SIZE) {
        logger.warn(
          `Skipping attachment ${attachment.name} - exceeds size limit`,
        );
        return;
      }

      try {
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
      } catch (error) {
        logger.error(
          `Error downloading attachment ${attachment.name}: ${error}`,
        );
      }
    }),
  );

  return attachmentData;
}

async function sendHighlight(
  interaction: MessageContextMenuCommandInteraction,
  channel: TextChannel,
  content: string,
  files?: { name: string; attachment: Buffer | string }[],
) {
  try {
    const highlight = await channel.send({
      content,
      files: files || [],
    });
    await highlight.react("⭐");
    return highlight;
  } catch (error) {
    logger.error(`Failed to send highlight: ${error}`);
    throw error;
  }
}

export default {
  data: data.toJSON(),
  async execute(
    client: Client,
    interaction: MessageContextMenuCommandInteraction,
    guildSchema: GuildSchema,
    _userSchema: UserSchema,
  ) {
    if (!interaction.guild) return;

    const canHighlight = await isManager(
      client,
      interaction.user,
      interaction.guild.id,
    );
    if (!canHighlight)
      return errorMessage(interaction, "You can't highlight clips.");

    await interaction.deferReply({ ephemeral: true });
    const highlightChannelId = guildSchema.highlights_channel;
    if (!highlightChannelId || highlightChannelId === "")
      return errorMessage(
        interaction,
        "No highlight channel set up for this server.",
      );

    const highlightChannel =
      interaction.guild.channels.cache.get(highlightChannelId);
    if (
      !highlightChannel?.isTextBased() ||
      highlightChannel.type !== ChannelType.GuildText
    )
      return errorMessage(
        interaction,
        "The highlight channel set up for this server is invalid.",
      );

    const message = interaction.targetMessage;
    const attachments = message.attachments;
    const embeds = message.embeds;

    const hasAttachments = attachments.size > 0;
    const hasVideoEmbed = embeds.some((embed) => isSupportedVideoEmbed(embed));

    if (!hasAttachments && !hasVideoEmbed) {
      return errorMessage(interaction, "There's nothing to highlight.");
    }

    let messageContent = `:star: New highlight from <@${message.author.id}>\n-# [Jump to message](${message.url})`;

    const videoUrls: string[] = [];
    let attachmentCount = 0;

    for (const embed of embeds) {
      if (isSupportedVideoEmbed(embed)) {
        const videoUrl = getVideoUrl(embed);
        if (!videoUrl) continue;

        attachmentCount++;
        videoUrls.push(videoUrl);
        messageContent += ` • [Attachment ${attachmentCount}](${videoUrl})`;
      }
    }

    try {
      if (videoUrls.length > 0 && !hasAttachments) {
        const highlight = await sendHighlight(
          interaction,
          highlightChannel,
          messageContent,
        );
        return interaction.editReply(`Highlight sent! ${highlight.url}`);
      }

      if (hasAttachments) {
        const attachmentData = await downloadAndPrepareAttachments(
          interaction,
          attachments,
        );

        if (attachmentData.length === 0) {
          return errorMessage(
            interaction,
            "Failed to download any attachments.",
          );
        }

        const highlight = await sendHighlight(
          interaction,
          highlightChannel,
          messageContent,
          attachmentData,
        );
        return interaction.editReply(`Highlight sent! ${highlight.url}`);
      }

      return errorMessage(interaction, "No valid content found to highlight.");
    } catch (error) {
      logger.error(`Failed to process highlight: ${error}`);
      return errorMessage(interaction, "Failed to send highlight.");
    }
  },
};
