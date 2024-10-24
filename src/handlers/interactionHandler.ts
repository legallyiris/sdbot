import { readdir } from "node:fs/promises";
import {
  type ApplicationCommandData,
  type Client,
  Collection,
} from "discord.js";
import { REST, Routes, type Snowflake } from "discord.js";

import config from "../config.ts";
import type { Command } from "../types/Interactions.ts";
import logger from "../utils/logger.ts";

export const commands = new Collection<string, Command>();

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
  const interactionDirectory = await readdir(directory);
  const interactions: ApplicationCommandData[] = [];

  for (const dir of interactionDirectory) {
    const files = await readdir(`${directory}/${dir}`);
    for (const file of files) {
      const { default: interaction } = await import(
        `../interactions/${dir}/${file}`
      );
      interactions.push(interaction.data);
      commands.set(interaction.data.name, interaction);
    }
  }

  await registerInteractions(client, interactions);
}

export { loadInteractionsFromDirectory };
