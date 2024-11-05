import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  EmbedBuilder,
  type TextChannel,
} from "discord.js";
import { query } from "../database";
import logger from "./logger";

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function startTimedMessages(client: Client) {
  setTimeout(() => {
    void sendPeriodicMessages(client);
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
      const URLS = {
        verify: "https://blox.link/dashboard/user/verifications",
        tutorial: "https://youtu.be/SbDltmom1R8",
      };

      const verifyButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Click here to verify")
        .setURL(URLS.verify)
        .setEmoji("✅");

      const tutorialButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Need help? Watch the tutorial")
        .setURL(URLS.tutorial)
        .setEmoji("📹");

      const getRoleRow = new ActionRowBuilder<ButtonBuilder>();
      getRoleRow.addComponents(verifyButton, tutorialButton);

      const embed = new EmbedBuilder()
        .setColor("#2F3136")
        .setDescription(message)
        .setTimestamp();

      await channel.send({ embeds: [embed], components: [getRoleRow] });
      logger.info(`Sent periodic message to ${guild.name} (${guild.id})`);
    }
  } catch (error) {
    logger.error(`Error sending periodic messages: ${error}`);
  }
}

function createPeriodicMessage(): string {
  const VERIFY_COMMAND = "</verify:1114974748624027711>";
  const GETROLE_COMMAND = "</getrole:836429412861214723>";

  return `# Can't talk? Verify now!

You need to verify to talk, send messages, or interact. This helps keep Stealth Developers safe.

**Click "Click here to verify" below to verify your account.** After that, you can talk and interact. If you need help, **click "Need help? Watch the tutorial"** or ask a staff member.
You can also use the ${VERIFY_COMMAND} command to verify.

## Verified but still can't talk?

Bloxlink might not have worked. Click ${GETROLE_COMMAND} and send the message. You should get the role in a few seconds.

## Still having issues?

Contact a staff member or Gace for help.

# Found a bug?

Report bugs in Warfare Tycoon, Ground War, or Airosft Battles with the \`/bug report\` command.
`.trim();
}
