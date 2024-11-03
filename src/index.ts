import { Client, Events, GatewayIntentBits } from "discord.js";
import { startTimedMessages } from "./utils/tasks";

import config from "./config";
import db, { initializeDatabase } from "./database";
import { loadEventsFromDirectory } from "./handlers/eventHandler.ts";
import { loadInteractionsFromDirectory } from "./handlers/interactionHandler.ts";
import { loadButtonsAndModals } from "./handlers/otherHandlers.ts";
import logger from "./utils/logger";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

logger.initDiscordLogger(client);

client.once(Events.ClientReady, async (c) => {
  client.rest.options.timeout = 180_000;
  logger.info(`Logged in as \`${c.user?.tag}\``);
  logger.info("Initializing database...");

  initializeDatabase();
  logger.info("\tDatabase initialized");
  logger.info("Loading events and interactions...");

  await loadButtonsAndModals();
  await loadInteractionsFromDirectory("./src/interactions", client);
  await loadEventsFromDirectory("./src/events", client);
  logger.info("\tEvents and interactions loaded");

  startTimedMessages(client);
});

void client.login(config.token);

async function shutdown() {
  logger.info("Shutting down...");
  await client.destroy();
  db.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("unhandledRejection", (error: unknown) => {
  logger.error(`Unhandled promise rejection: ${error}`);
});

process.on("uncaughtException", (error: unknown) => {
  logger.error(`Uncaught exception: ${error}`);
});
