import { readdir } from "node:fs/promises";
import { type Client, Collection } from "discord.js";
import type { IButton, IModal } from "../types/Interactions.ts";

const buttons = new Collection<string, IButton>();
const modals = new Collection<string, IModal>();

async function loadFromDir<T>(
  dir: string,
  collection: Collection<string, T>,
): Promise<void> {
  const dirExists = await readdir(dir).catch(() => false);
  if (!dirExists) return;

  const files = await readdir(dir);

  for (const file of files) {
    const { default: interaction } = await import(`../${dir}/${file}`);
    collection.set(interaction.id, interaction);
  }
}

const loadButtons = async () => loadFromDir("buttons", buttons);
const loadModals = async () => loadFromDir("modals", modals);

async function loadButtonsAndModals(): Promise<void> {
  await loadButtons();
  await loadModals();
}

export { buttons, modals, loadButtonsAndModals };
