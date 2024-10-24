import {
  type BaseInteraction,
  type Client,
  type CommandInteraction,
  type ContextMenuCommandInteraction,
  Events,
} from "discord.js";
import { createGuild, createUser, getGuild, getUser } from "../database.ts";
import { commands } from "../handlers/interactionHandler.ts";

function checkUser(userId: string, guildId: string): void {
  checkGuild(guildId);
  const user = getUser(userId, guildId);
  if (!user) createUser(userId, guildId);
}

function checkGuild(guildId: string): void {
  const guild = getGuild(guildId);
  if (!guild) createGuild(guildId);
}

async function handleInteraction<T extends BaseInteraction>(
  client: Client,
  interaction: T,
): Promise<void> {
  if (!("commandName" in interaction)) return;
  const command = commands.get(interaction.commandName as string);
  if (!command) return;

  try {
    await command.execute(client, interaction);
  } catch (error) {
    console.error(error);
    if (interaction.isRepliable()) {
      interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
}

export default {
  event: Events.InteractionCreate,
  async execute(client: Client, interaction: BaseInteraction) {
    if (!interaction.guild) return;
    checkUser(interaction.user.id, interaction.guild.id);

    if (interaction.isCommand())
      return handleInteraction<CommandInteraction>(client, interaction);
    if (interaction.isContextMenuCommand()) {
      if (interaction.isUserContextMenuCommand()) {
        return handleInteraction<ContextMenuCommandInteraction>(
          client,
          interaction,
        );
      }
      if (interaction.isMessageContextMenuCommand()) {
        return handleInteraction<ContextMenuCommandInteraction>(
          client,
          interaction,
        );
      }
    }

    if (interaction.isRepliable())
      return await interaction.reply({
        content: "This interaction is not supported.",
        ephemeral: true,
      });
  },
};
