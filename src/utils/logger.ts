import type { Client, TextChannel } from "discord.js";
import { createLogger, format, transports } from "winston";
import config from "../config";

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

let logChannel: TextChannel | null = null;

export function initDiscordLogger(client: Client) {
  client.on("ready", () => {
    const channel = client.channels.cache.get(config.logChannel);
    if (channel?.isTextBased()) {
      logChannel = channel as TextChannel;
      logChannel.send("``` ```").catch((err) => {
        logger.error(`Failed to send log to Discord: ${err.message}`);
      });
    } else {
      logger.error("Log channel not found or not a text channel");
    }
  });
}

export function log(level: string, message: string) {
  logger.log(level, message);

  if (logChannel) {
    const discordMessage = `**[${level.toUpperCase()}]** ${message}`;
    logChannel.send(discordMessage).catch((err) => {
      logger.error(`Failed to send log to Discord: ${err.message}`);
    });
  }
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
