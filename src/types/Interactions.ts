import type { BaseInteraction, Client, SlashCommandBuilder } from "discord.js";

export interface Command {
  data: ReturnType<SlashCommandBuilder["toJSON"]>;
  execute: (client: Client, interaction: BaseInteraction) => Promise<void>;
}
