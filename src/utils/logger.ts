import os from "node:os";
import type { Client, TextChannel } from "discord.js";
import { createLogger, format, transports } from "winston";
import config from "../config";

const queue: string[] = [];
let logChannel: TextChannel | null = null;
let timeout: Timer | null = null;

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    }),
  ),
  transports: [
    new transports.File({ filename: "bot.log" }),
    new transports.Console(),
  ],
});

function asciiDoc(message: string) {
  return `\`\`\`asciidoc\n${message}\n\`\`\``;
}

export function initDiscordLogger(client: Client) {
  client.on("ready", () => {
    const channel = client.channels.cache.get(config.logChannel);
    if (channel?.isTextBased()) {
      logChannel = channel as TextChannel;

      const hostname = os.hostname();
      const platform = os.platform();
      const arch = os.arch();

      const message = asciiDoc(`
      = Machine Details =
      Hostname :: ${hostname}
      Platform :: ${platform}
      Arch     :: ${arch}
      `);

      logChannel.send(message).catch((err) => {
        logger.error(`Failed to send log to Discord: ${err.message}`);
      });
    } else {
      logger.error("Log channel not found or not a text channel");
    }
  });
}

export function log(level: string, message: string) {
  logger.log(level, message);

  const discordMessage = `**[${level.toUpperCase()}]** ${message}`;
  queue.push(discordMessage);

  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setTimeout(() => {
    const message = asciiDoc(queue.join("\n"));
    if (!logChannel) return;
    logChannel.send(message).catch((err) => {
      logger.error(`Failed to send log to Discord: ${err.message}`);
    });

    queue.length = 0;
  }, 2000);
}

export const info = (message: string) => log("info", message);
export const warn = (message: string) => log("warn", message);
export const error = (message: string) => log("error", message);
export const debug = (message: string) => log("debug", message);

export default {
  initDiscordLogger,
  info,
  warn,
  error,
  debug,
};
