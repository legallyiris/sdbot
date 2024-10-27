import type { Client, TextChannel } from "discord.js";
import { getGuild, query } from "../database";
import logger from "./logger";

// const SIX_HOURS = 6 * 60 * 60 * 1000;
const SIX_HOURS = 6 * 1000;

export function startTimedMessages(client: Client) {
  setTimeout(() => {
    sendPeriodicMessages(client);
    setInterval(() => sendPeriodicMessages(client), SIX_HOURS);
  }, 1000);
}

async function sendPeriodicMessages(client: Client) {
  try {
    const guilds = query<{ guild_id: string; commands_channel: string }>(
      "SELECT guild_id, commands_channel FROM guilds WHERE commands_channel IS NOT NULL AND commands_channel != ''",
    );

    for (const guildData of guilds) {
      const guild = client.guilds.cache.get(guildData.guild_id);
      if (!guild) continue;

      const channel = guild.channels.cache.get(
        guildData.commands_channel,
      ) as TextChannel;
      if (!channel || !channel.isTextBased()) continue;

      const message = createPeriodicMessage();

      await channel.send(message);
      logger.info(`Sent periodic message to ${guild.name} (${guild.id})`);
    }
  } catch (error) {
    logger.error(`Error sending periodic messages: ${error}`);
  }
}

function createPeriodicMessage(): string {
  const VERIFY_COMMAND = "</verify:1114974748624027711>";
  const GETROLE_COMMAND = "</getrole:836429412861214723>";

  return `
    # Can't talk? You need to verify.

This server requires you to verify before you can talk, send messages, or interact with others. This is to prevent spam and ensure that Stealth Developers is a safe plae for everyone.

## Steps

1. Click ${VERIFY_COMMAND} and send the message.
2. You will see three buttons.
   - Click the first button to verify.
   - Click the second button to see a video tutorial.
3. Follow the steps on the website or the video.

## Verified, but still can't talk?

This is likely because Bloxlink hasn't given you the correct role. To get the role, click ${GETROLE_COMMAND} and send the message. You *should* receive the role within a few seconds.

## Still having issues?

If you're still having issues, please contact a staff member, or Gace. They'll be able to help you out.

`.trim();
}
