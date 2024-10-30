import { Events, type Message } from "discord.js";
import { getBug, getGuild, getUser } from "../database.ts";
import type { IEvent } from "../types/Interactions.ts";

export default {
  event: Events.MessageCreate,
  async execute(client, message: Message) {
    if (message.author.bot || !message.guild) return;

    const bugId = message.content.match(/bug#(\d+)/);
    if (!bugId) return;

    const bug = getBug(Number(bugId[1]));
    const guild = getGuild(message.guild.id);
    if (!guild || !bug) return;

    const reporterSchema = getUser(
      bug.user_id.toString(),
      message.guild.id,
      false,
    );
    const reporterId = reporterSchema.user_id;
    const reporter = client.users.cache.get(reporterId);
    if (!reporter) return;

    const bugChannel = await client.channels.fetch(guild.bug_channel);
    if (!bugChannel || !bugChannel.isTextBased()) return;
    const bugMessage = await bugChannel.messages.fetch(bug.message_id);

    await message.reply({
      content: `> *${bug.title}*, reported by <@${reporter.id}>.\n-# [Jump to bug](${bugMessage.url})`,
      allowedMentions: { users: [] },
    });
  },
} as IEvent;
