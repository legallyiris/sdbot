import { Client, Events, GatewayIntentBits } from "discord.js";

import config from "./config";
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
  logger.info(`Logged in as \`${c.user?.tag}\``);
});

void client.login(config.token);
