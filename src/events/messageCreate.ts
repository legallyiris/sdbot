import { createWriteStream, existsSync, mkdirSync, unlink } from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

import CloudConvert from "cloudconvert";
import { type Client, Events, type Message } from "discord.js";
import config from "../config.ts";
import { getBug, getGuild, getUser } from "../database.ts";
import type { IEvent } from "../types/Interactions.ts";
import logger from "../utils/logger.ts";

const cloudConvert = new CloudConvert(config.cloudconvert, true);

const formatSize = (size: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let usedSize = size;
  let unitIndex = 0;
  while (usedSize > 1024) {
    usedSize /= 1024;
    unitIndex++;
  }
  return `${usedSize.toFixed(2)} ${units[unitIndex]}`;
};

async function convertVideos(_client: Client, message: Message) {
  const channels = [
    "896061337069830144",
    "1278372569044746373",
    "1301334875017576478",
    "1350518945282523186",
  ];
  if (!channels.includes(message.channel.id)) return;

  const skippedFormats = ["mp4", "mov", "webm", "quicktime"];
  const attachments = message.attachments.filter(
    (attachment) =>
      attachment.contentType?.startsWith("video/") &&
      !skippedFormats.includes(attachment.contentType.split("/")[1]),
  );
  if (!attachments.size) return;

  const statusMessage = await message.reply({
    content: `Converting ${attachments.size} video(s)...`,
    allowedMentions: { users: [] },
  });

  const conversionPromises = Array.from(attachments.values()).map(
    async (attachment) => {
      try {
        const jobCreate = await cloudConvert.jobs.create({
          tasks: {
            "import-file": {
              operation: "import/url",
              url: attachment.url,
            },
            convert: {
              operation: "convert",
              input: "import-file",
              output_format: "webm",
            },
            "export-file": {
              operation: "export/url",
              input: "convert",
            },
          },
        });

        const result = await cloudConvert.jobs.wait(jobCreate.id);
        const resultData = await cloudConvert.jobs.get(result.id);

        if (resultData.tasks[2].status === "error") {
          logger.error(`Conversion error: ${resultData.tasks[2].message}`);
          return null;
        }

        const files = cloudConvert.jobs.getExportUrls(resultData);
        return files[0]?.url || null;
      } catch (error) {
        logger.error(`Failed to convert video: ${error}`);
        return null;
      }
    },
  );

  const start = Date.now();
  const results = await Promise.all(conversionPromises);
  const convertedUrls = results.filter((url) => url !== null) as string[];

  if (convertedUrls.length) {
    const convertedStrings = convertedUrls
      .map((url, index) => `[video ${index + 1}](${url})`)
      .join(" • ");
    await message.reply({
      content: `Converted ${convertedUrls.length}/${attachments.size} video(s) in ${Math.floor((Date.now() - start) / 1000)}s\n-# ${convertedStrings}`,
      allowedMentions: { users: [] },
    });
    await statusMessage.delete().catch(() => {});
  } else {
    await statusMessage.edit("Failed to convert video(s)");
  }
}

export default {
  event: Events.MessageCreate,
  async execute(client, message: Message) {
    if (message.author.bot || !message.guild) return;
    await convertVideos(client, message);

    if (message.content.trim() === "?stinker") {
      void message.reply("khls stinks");
    }

    if (message.content.trim() === "you suck") {
      void message.reply("khls sucks");
    }

    const bugId = message.content.match(/bug#(\d+)/);
    if (!bugId) return;

    const bug = getBug(Number(bugId[1]));
    const guild = getGuild(message.guild.id);
    if (!guild || !bug) return;

    const reporterSchema = getUser(
      bug.user_id.toString(),
      message.guild.id,
      false,
    );
    const reporterId = reporterSchema.user_id;
    const reporter = client.users.cache.get(reporterId);
    if (!reporter) return;

    const bugChannel = await client.channels.fetch(guild.bug_channel);
    if (!bugChannel || !bugChannel.isTextBased()) return;
    const bugMessage = await bugChannel.messages.fetch(bug.message_id);

    await message.reply({
      content: `> *${bug.title}*, reported by <@${reporter.id}>.\n-# [Jump to bug](${bugMessage.url})`,
      allowedMentions: { users: [] },
    });
  },
} as IEvent;
