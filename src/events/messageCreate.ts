import CloudConvert from "cloudconvert";
import { type Client, Events, type Message } from "discord.js";
import config from "../config.ts";
import { getBug, getGuild, getUser } from "../database.ts";
import type { IEvent } from "../types/Interactions.ts";
import logger from "../utils/logger.ts";

const userConversions = new Map<string, { count: number; timestamp: number }>();
const globalConversions = new Map<string, number>();

const cloudConvert = new CloudConvert(
  config.cloudconvert.token,
  config.cloudconvert.sandbox,
);

async function convertVideos(_client: Client, message: Message) {
  const channels = [
    "896061337069830144",
    "1278372569044746373",
    "1301334875017576478",
    "1350518945282523186",
  ];
  if (!channels.includes(message.channel.id)) return;

  const statusMessage = await message.reply({
    content: "Checking CloudConvert and user quota...",
    allowedMentions: { users: ["543793990005162015"] },
  });

  const today = new Date().toDateString();
  const userId = message.author.id;
  const userKey = `${userId}-${today}`;
  const userLimit = userConversions.get(userKey) || {
    count: 0,
    timestamp: Date.now(),
  };

  const attachmentCount = message.attachments.size;
  if (userLimit.count + attachmentCount >= 2) {
    const timeToNextDay = Math.floor(
      (new Date(today).setDate(new Date(today).getDate() + 1) - Date.now()) /
        1000,
    );
    return statusMessage.edit(
      `you've reached your daily limit of 2 video conversions. try again <t:${Math.floor(Date.now() / 1000 + timeToNextDay)}:R>`,
    );
  }

  const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
  const hourlyCount = globalConversions.get(currentHour.toString()) || 0;

  if (hourlyCount + attachmentCount >= 3) {
    const timeToNextHour = Math.floor(
      (currentHour + 1) * 3600 - Date.now() / 1000,
    );
    return statusMessage.edit(
      `server has reached the hourly limit of 3 video conversions. try again <t:${Math.floor(Date.now() / 1000 + timeToNextHour)}:R>`,
    );
  }

  userConversions.set(userKey, {
    count: userLimit.count + attachmentCount,
    timestamp: Date.now(),
  });
  globalConversions.set(currentHour.toString(), hourlyCount + attachmentCount);

  try {
    const ccUser = await cloudConvert.users.me();
    if (ccUser.credits <= 0) {
      return statusMessage.edit(
        "we ran out of cloudconvert credits lol please consider giving <@543793990005162015> money to buy more",
      );
    }
  } catch (error) {
    console.error(
      "couldn't check cloudconvert quota, make sure that user:read is granted to the token",
    );
    await statusMessage.edit("Failed to fetch CloudConvert user");
  }

  const skippedFormats = ["mp4", "mov", "webm", "quicktime"];
  const attachments = message.attachments.filter(
    (attachment) =>
      attachment.contentType?.startsWith("video/") &&
      !skippedFormats.includes(attachment.contentType.split("/")[1]),
  );
  if (!attachments.size) return;

  await statusMessage.edit({
    content: `Converting ${attachments.size} video(s)...`,
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
