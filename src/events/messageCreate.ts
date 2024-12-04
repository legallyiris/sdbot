import { createWriteStream, existsSync, mkdirSync, unlink } from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

import {
  AttachmentBuilder,
  type Client,
  Events,
  type Message,
} from "discord.js";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";

import { getBug, getGuild, getUser } from "../database.ts";
import type { IEvent } from "../types/Interactions.ts";
import logger from "../utils/logger.ts";

let usedPath = ffmpegPath;
logger.info(ffmpegPath ? `ffmpeg path: ${ffmpegPath}` : "ffmpeg path not set");
if (!ffmpegPath) {
  usedPath = "/usr/bin/ffmpeg";
  logger.warn("ffmpeg path not set");
}

const exists = existsSync(ffmpegPath);
if (!exists) {
  usedPath = "/usr/bin/ffmpeg";
  logger.warn("ffmpeg path not set - using default path");
}

const pipelineAsync = promisify(pipeline);

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
  ];
  if (!channels.includes(message.channel.id)) return;

  const skippedFormats = ["mp4", "mov", "webm", "quicktime"];
  const attachments = message.attachments.filter(
    (attachment) =>
      attachment.contentType?.startsWith("video/") &&
      !skippedFormats.includes(attachment.contentType.split("/")[1]),
  );
  if (!attachments.size) return;

  const convertedAttachments = [];
  let messageContent = `**Converted ${convertedAttachments.length}/${attachments.size} video(s)**`;
  const replyMessage = await message.reply({
    content: messageContent,
    allowedMentions: { users: [] },
  });

  for (const attachment of attachments.values()) {
    logger.info(`converting video: ${attachment.name}`);
    const inputPath = `./tmp/${attachment.id}.${attachment.name.split(".")[1]}`;
    const outputPath = `./tmp/${attachment.id}.${attachment.name.split(".")[1]}.mp4`;
    if (!existsSync("./tmp")) mkdirSync("./tmp");

    await replyMessage.edit({
      content: `${messageContent} • Downloading ${attachment.name} (${formatSize(attachment.size)})`,
    });

    const response = await fetch(attachment.url);
    if (!response.ok) {
      logger.error(`failed to fetch: ${response.statusText}`);
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    if (!response.body) throw new Error("Response body is empty");
    await replyMessage.edit(
      `${messageContent} • Downloaded ${attachment.name} (${formatSize(attachment.size)})`,
    );
    // @ts-ignore
    await pipelineAsync(response.body, createWriteStream(inputPath));

    try {
      await new Promise<void>((resolve, reject) => {
        if (!usedPath) {
          logger.error("ffmpeg path is not set");
          replyMessage.edit(
            `${messageContent} • Error converting ${attachment.name} to MP4`,
          );
          return reject(new Error("ffmpeg path is not set"));
        }
        logger.info(`converting video to MP4: ${attachment.name}`);
        logger.info(`  input: ${inputPath}`);
        logger.info(`  output: ${outputPath}`);
        replyMessage.edit(
          `${messageContent} • Converting ${attachment.name} to MP4...`,
        );
        ffmpeg(inputPath)
          .setFfmpegPath(usedPath)
          .outputOptions(["-preset ultrafast", "-crf 28", "-threads 4"])
          .output(outputPath)
          .on("end", () => {
            logger.info(`converted video to MP4: ${attachment.name}`);
            replyMessage.edit(
              `${messageContent} • Converted ${attachment.name} to MP4`,
            );
            resolve();
          })
          .on("error", (err) => {
            logger.error(`error converting video: ${err.message}`);
            replyMessage.edit(
              `${messageContent} • Error converting ${attachment.name} to MP4`,
            );
            reject(err);
          })
          .run();
      });
    } catch (err) {
      // @ts-ignore
      logger.error(`failed to convert video: ${err.message}`);
      continue;
    }

    const mp4Attachment = new AttachmentBuilder(outputPath);
    convertedAttachments.push(mp4Attachment);
    messageContent = `**Converted ${convertedAttachments.length}/${attachments.size} video(s)**`;
  }

  if (convertedAttachments.length) {
    await message.reply({
      content: `Converted ${convertedAttachments.length} video(s)`,
      files: convertedAttachments,
      allowedMentions: { users: [] },
    });
    await replyMessage.delete();
  } else {
    await replyMessage.edit("Failed to convert video(s)");
  }

  for (const attachment of attachments.values()) {
    const inputPath = `./tmp/${attachment.id}.${attachment.name.split(".")[1]}`;
    const outputPath = `./tmp/${attachment.id}.${attachment.name.split(".")[1]}.mp4`;
    if (existsSync(inputPath))
      unlink(inputPath, (err) => {
        if (err) logger.error(`failed to delete file: ${err.message}`);
      });
    if (existsSync(outputPath))
      unlink(outputPath, (err) => {
        if (err) logger.error(`failed to delete file: ${err.message}`);
      });
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
