import type {
  AutocompleteInteraction,
  BaseInteraction,
  ButtonInteraction,
  Client,
  ModalSubmitInteraction,
  SlashCommandBuilder,
} from "discord.js";
import type { GuildSchema, UserSchema } from "./Schemas";

export interface Command {
  data: ReturnType<SlashCommandBuilder["toJSON"]>;
  execute: (
    client: Client,
    interaction: BaseInteraction,
    guildSchema?: GuildSchema,
    userSchema?: UserSchema,
  ) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface IButton {
  id: string;
  execute: (
    client: Client,
    interaction: ButtonInteraction,
    guildSchema?: GuildSchema,
    userSchema?: UserSchema,
  ) => Promise<void>;
}

export interface IModal {
  id: string;
  execute: (
    client: Client,
    interaction: ModalSubmitInteraction,
    guildSchema?: GuildSchema,
    userSchema?: UserSchema,
  ) => Promise<void>;
}

export interface IEvent {
  event: string;
  execute: (client: Client, ...args: unknown[]) => Promise<void>;
  once?: boolean;
}
