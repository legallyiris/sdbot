import { Client, Events, GatewayIntentBits } from "discord.js";

import config from "./config";
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.info(`Logged in as \`${c.user?.tag}\``);
});

void client.login(config.token);
