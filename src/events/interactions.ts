import {
  type AutocompleteInteraction,
  type BaseInteraction,
  type ButtonInteraction,
  type Client,
  type CommandInteraction,
  type ContextMenuCommandInteraction,
  Events,
  type ModalSubmitInteraction,
} from "discord.js";
import { createGuild, createUser, getGuild, getUser } from "../database.ts";
import { commands } from "../handlers/interactionHandler.ts";
import { buttons, modals } from "../handlers/otherHandlers.ts";
import type { GuildSchema, UserSchema } from "../types/Schemas.ts";
import logger from "../utils/logger.ts";

function checkUser(userId: string, guildId: string): UserSchema {
  checkGuild(guildId);
  const user = getUser(userId, guildId);
  return user || createUser(userId, guildId);
}

function checkGuild(guildId: string): GuildSchema {
  const guild = getGuild(guildId);
  return guild || createGuild(guildId);
}

async function handleInteraction(
  client: Client,
  interaction:
    | ButtonInteraction
    | ModalSubmitInteraction
    | CommandInteraction
    | ContextMenuCommandInteraction
    | AutocompleteInteraction,
  guildSchema: GuildSchema,
  userSchema: UserSchema,
): Promise<void> {
  if (interaction.isButton()) {
    const buttonId = interaction.customId.split("-")[0];
    const button = buttons.get(buttonId);
    if (!button)
      void interaction.reply({
        content: "This button is not supported.",
        ephemeral: true,
      });
    else return button.execute(client, interaction, guildSchema, userSchema);
  }
  if (interaction.isModalSubmit()) {
    const modalId = interaction.customId.split("-")[0];
    const modal = modals.get(modalId);
    if (!modal)
      void interaction.reply({
        content: "This modal is not supported.",
        ephemeral: true,
      });
    else return modal.execute(client, interaction, guildSchema, userSchema);
  }

  if (!("commandName" in interaction)) return;
  const command = commands.get(interaction.commandName as string);
  if (!command) return;

  try {
    if (interaction.isAutocomplete() && command.autocomplete)
      return command.autocomplete(interaction);

    await command.execute(client, interaction, guildSchema, userSchema);
  } catch (error) {
    console.error(error);
    if (interaction.isRepliable()) {
      await interaction.reply({
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
    const user = checkUser(interaction.user.id, interaction.guild.id);
    const guild = checkGuild(interaction.guild.id);

    logger.info(
      `Interaction received from ${interaction.user.tag} in ${interaction.guild.name} (${interaction.guild.id})`,
    );

    if (interaction.isCommand())
      return handleInteraction(client, interaction, guild, user);
    if (interaction.isAutocomplete())
      return handleInteraction(client, interaction, guild, user);
    if (interaction.isContextMenuCommand()) {
      if (interaction.isUserContextMenuCommand()) {
        return handleInteraction(client, interaction, guild, user);
      }
      if (interaction.isMessageContextMenuCommand()) {
        return handleInteraction(client, interaction, guild, user);
      }
    }

    if (interaction.isButton())
      return handleInteraction(client, interaction, guild, user);
    if (interaction.isModalSubmit())
      return handleInteraction(client, interaction, guild, user);

    if (interaction.isRepliable()) {
      logger.warn(
        `Unsupported interaction type: ${interaction.type} (${interaction.id})`,
      );
      return await interaction.reply({
        content: "This interaction is not supported.",
        ephemeral: true,
      });
    }
  },
};
