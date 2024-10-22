import { readdir } from "node:fs/promises";
import type { ApplicationCommandData, Client } from "discord.js";
import { REST, Routes, type Snowflake } from "discord.js";
import config from "../config.ts";
import logger from "../utils/logger.ts";

async function registerInteractions(
  client: Client,
  interactions: ApplicationCommandData[],
): Promise<void> {
  const rest = new REST({ version: "9" }).setToken(config.token);
  try {
    await rest.put(Routes.applicationCommands(<Snowflake>client.user?.id), {
      body: interactions,
    });
  } catch (e: unknown) {
    if (typeof e === "string") logger.error(e);
    else if (e instanceof Error) logger.error(e.message);
    else
      logger.error("An unknown error occurred while registering interactions");
  }
}

async function loadInteractionsFromDirectory(
  directory: string,
  client: Client,
): Promise<void> {
  const interactionFiles = await readdir(directory);
  const interactions: ApplicationCommandData[] = [];

  for (const file of interactionFiles) {
    const { default: interaction } = await import(`../interactions/${file}`);
    interactions.push(interaction.data);
  }

  await registerInteractions(client, interactions);
}

export { loadInteractionsFromDirectory };
