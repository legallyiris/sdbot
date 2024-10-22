import { readdir } from "node:fs/promises";
import { type Client, Collection } from "discord.js";

interface Event {
  event: string;
  execute: (client: Client, ...args: unknown[]) => Promise<void>;
  once?: boolean;
}

async function registerEvents(
  client: Client,
  events: Collection<string, Event>,
): Promise<void> {
  for (const [name, event] of events) {
    if (event.once)
      client.once(name, (...args) => event.execute(client, ...args));
    else client.on(name, (...args) => event.execute(client, ...args));
  }
}

async function loadEventsFromDirectory(
  directory: string,
  client: Client,
): Promise<void> {
  const eventFiles = await readdir(directory);
  const events = new Collection<string, Event>();

  for (const file of eventFiles) {
    const { default: event } = await import(`../events/${file}`);
    events.set(event.event, event);
  }

  await registerEvents(client, events);
}

export { loadEventsFromDirectory };
