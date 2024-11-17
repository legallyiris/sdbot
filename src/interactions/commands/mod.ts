import { SlashCommandBuilder } from "@discordjs/builders";
import {
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
} from "discord.js";
import config from "../../config.ts";
import logger from "../../utils/logger.ts";

const token = config.rblx;
type RobloxSearchUser = {
  previousUsernames: string[];
  hasVerifiedBadge: boolean;
  id: number;
  name: string;
  displayName: string;
};

type RobloxUser = {
  description: string;
  created: string;
  isBanned: boolean;
  externalAppDisplayName: string | null;
  hasVerifiedBadge: boolean;
  id: number;
  name: string;
  displayName: string;
};

async function httpRequest(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    logger.error(`Failed to fetch: ${response.statusText}`);
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  return response;
}

const command = new SlashCommandBuilder()
  .setName("mod")
  .setDescription("Search for a Roblox user.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("search")
      .setDescription("Search for a Roblox user by username.")
      .addStringOption((option) =>
        option
          .setName("username")
          .setDescription("The username to search for.")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("get")
      .setDescription("Get a Roblox user by ID.")
      .addIntegerOption((option) =>
        option
          .setName("id")
          .setDescription("The ID of the user to get.")
          .setRequired(true),
      ),
  );

export default {
  data: command.toJSON(),
  async execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "search") {
      const username = interaction.options.getString("username") as string;
      const userResponse = await httpRequest(
        `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(
          username,
        )}&limit=10`,
        {
          headers: { Cookie: token },
        },
      );

      if (!userResponse.ok) {
        logger.error(`Failed to search for user: ${userResponse.statusText}`);
        return interaction.reply({
          content: `Roblox API Error: ${userResponse.statusText} (${userResponse.status})`,
          ephemeral: true,
        });
      }

      const users: RobloxSearchUser[] = (await userResponse.json()).data;
      if (users.length === 0) {
        return interaction.reply({
          content: "No users found.",
          ephemeral: true,
        });
      }

      const userStrings = users.map((user) => {
        const link = `https://www.roblox.com/users/${user.id}/profile`;
        return `- \`${user.id}\` **[${user.displayName} (${user.name})](${link})**`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`Search results for "${username}"`)
        .setDescription(userStrings.join("\n"));

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "get") {
      const id = interaction.options.getInteger("id") as number;
      const userResponse = await httpRequest(
        `https://users.roblox.com/v1/users/${id}`,
        {
          headers: { Cookie: token },
        },
      );

      if (!userResponse.ok) {
        logger.error(`Failed to get user: ${userResponse.statusText}`);
        return interaction.reply({
          content: `Roblox API Error: ${userResponse.statusText} (${userResponse.status})`,
          ephemeral: true,
        });
      }

      const user: RobloxUser = await userResponse.json();
      await interaction.reply({
        content: `${id}: ${user.displayName} (${user.name}) [Profile](https://www.roblox.com/users/${id}/profile)`,
      });
    }
  },
};
