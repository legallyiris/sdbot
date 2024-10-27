import { readdir } from "node:fs/promises";
import { Collection } from "discord.js";
import type { IButton, IModal } from "../types/Interactions.ts";

let buttons = new Collection<string, IButton>();
let modals = new Collection<string, IModal>();

async function loadFromDir<T>(
  dir: string,
  collection: Collection<string, T>,
): Promise<Collection<string, T>> {
  const dirExists = await readdir(`./src/${dir}`).catch(() => false);
  if (!dirExists) return collection;

  const files = await readdir(`./src/${dir}`);
  for (const file of files) {
    const { default: interaction } = await import(`../${dir}/${file}`);
    collection.set(interaction.id, interaction);
  }

  return collection;
}

async function loadButtonsAndModals(): Promise<void> {
  buttons = await loadFromDir("buttons", buttons);
  modals = await loadFromDir("modals", modals);

  console.log(modals);
}

export { buttons, modals, loadButtonsAndModals };
