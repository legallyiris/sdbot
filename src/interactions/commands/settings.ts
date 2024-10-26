import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  type Client,
  PermissionsBitField,
} from "discord.js";
import config from "../../config.ts";
import db, { getGuild } from "../../database.ts";

const command = new SlashCommandBuilder()
  .setName("settings")
  .setDescription("Edit the settings.")
  .addSubcommandGroup((subcommandGroup) =>
    subcommandGroup
      .setName("edit")
      .setDescription("Edit the settings.")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("highlights")
          .setDescription("Edit the highlights settings.")
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("The channel to send highlights to.")
              .setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("bugs")
          .setDescription("Edit the bug report settings.")
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("The channel to send bug reports to.")
              .setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("suggestions")
          .setDescription("Edit the suggestion settings.")
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("The forum where suggestions are sent.")
              .setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("command-channel")
          .setDescription("Edit the command channel settings.")
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("The channel.")
              .setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("manager-roles")
          .setDescription(
            "Edit the manager roles. These roles can manage bugs and highlights.",
          )
          .addRoleOption((option) =>
            option
              .setName("role")
              .setDescription("The role to add or remove.")
              .setRequired(true),
          )
          .addBooleanOption((option) =>
            option
              .setName("add")
              .setDescription("Whether to add or remove the role.")
              .setRequired(true),
          ),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("view").setDescription("View the settings."),
  );

export default {
  data: command.toJSON(),
  async execute(client: Client, interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId)
      return interaction.reply("This command can only be used in a server.");

    const member = interaction.member;
    if (!member) return;

    const permissions = member.permissions as PermissionsBitField;
    if (
      !permissions.has(PermissionsBitField.Flags.ManageGuild) &&
      interaction.user.id !== config.developer
    )
      return interaction.reply(
        "You do not have the required permissions to use this command.",
      );

    if (interaction.options.getSubcommandGroup() === "edit") {
      const subcommand = interaction.options.getSubcommand(true);

      if (subcommand === "manager-roles") {
        const role = interaction.options.getRole("role", true);
        const add = interaction.options.getBoolean("add", true);

        const guild = getGuild(interaction.guildId);
        if (!guild)
          return interaction.reply({
            content: "An error occurred while fetching guild data.",
            ephemeral: true,
          });

        let managerRoles: string[] = [];

        try {
          console.log(JSON.parse(guild.manager_roles));
          managerRoles = JSON.parse(guild.manager_roles) || [];
        } catch (error) {
          managerRoles = [];
          console.error(error);
        }

        console.log(managerRoles);

        if (add) {
          if (managerRoles.includes(role.id))
            return interaction.reply({
              content: "The role already exists as a manager role.",
              ephemeral: true,
            });

          managerRoles.push(role.id);
        } else {
          if (!managerRoles.includes(role.id))
            return interaction.reply({
              content: "The role does not exist as a manager role.",
              ephemeral: true,
            });

          managerRoles = managerRoles.filter(
            (managerRole) => managerRole !== role.id,
          );
        }

        db.run("UPDATE guilds SET manager_roles = ? WHERE guild_id = ?", [
          JSON.stringify(managerRoles),
          interaction.guildId,
        ]);

        return interaction.reply({
          content: `Successfully ${
            add ? "added" : "removed"
          } the role <@&${role.id}> as a manager role.`,
          ephemeral: true,
        });
      }

      const channel = interaction.options.getChannel("channel", true);

      const channelCache = client.channels.cache.get(channel.id);
      if (!channelCache) return;

      if (
        channelCache.type !== ChannelType.GuildText &&
        channelCache.type !== ChannelType.GuildForum
      )
        return interaction.reply({
          content: "The channel must be a text channel or a forum.",
          ephemeral: true,
        });

      switch (subcommand) {
        case "highlights":
          db.run(
            "UPDATE guilds SET highlights_channel = ? WHERE guild_id = ?",
            [channel.id, interaction.guildId],
          );
          break;
        case "bugs":
          db.run("UPDATE guilds SET bug_channel = ? WHERE guild_id = ?", [
            channel.id,
            interaction.guildId,
          ]);
          break;
        case "suggestions":
          if (channelCache.type !== ChannelType.GuildForum)
            return interaction.reply({
              content: "The channel must be a forum.",
              ephemeral: true,
            });
          db.run("UPDATE guilds SET suggestion_forum = ? WHERE guild_id = ?", [
            channel.id,
            interaction.guildId,
          ]);
          break;
        case "command-channel":
          db.run("UPDATE guilds SET commands_channel = ? WHERE guild_id = ?", [
            channel.id,
            interaction.guildId,
          ]);
          break;
      }

      return interaction.reply({
        content: `Successfully updated the ${subcommand} channel to <#${channel.id}>.`,
        ephemeral: true,
      });
    }
    if (interaction.options.getSubcommand() === "view") {
      const guild = getGuild(interaction.guildId);
      if (!guild)
        return interaction.reply({
          content: "An error occurred while fetching guild data.",
          ephemeral: true,
        });

      const highlightsChannel = client.channels.cache.get(
        guild.highlights_channel,
      );
      const bugChannel = client.channels.cache.get(guild.bug_channel);
      const suggestionForum = client.channels.cache.get(guild.suggestion_forum);
      const commandsChannel = client.channels.cache.get(guild.commands_channel);
      let managerRoles: string[] | null = null;

      try {
        managerRoles = JSON.parse(guild.manager_roles);
      } catch (error) {
        managerRoles = null;
        console.error(error);
      }

      const highlights = highlightsChannel
        ? `<#${highlightsChannel.id}>`
        : "None";
      const bugs = bugChannel ? `<#${bugChannel.id}>` : "None";
      const suggestions = suggestionForum ? `<#${suggestionForum.id}>` : "None";
      const commands = commandsChannel ? `<#${commandsChannel.id}>` : "None";

      return interaction.reply({
        content: `
          # Channels
          **Highlights Channel:** ${highlights}
          **Bug Channel:** ${bugs}
          **Suggestions Forum:** ${suggestions}
          **Commands Channel:** ${commands}
          
          # Manager Roles
          ${
            managerRoles
              ? managerRoles
                  .map((managerRole) => `- <@&${managerRole}>`)
                  .join("\n")
              : "None"
          }
          
          Management roles can manage bugs (close, edit, delete) and send clips to the highlights channel.
        `.replace(/ {2,}/g, ""),
        ephemeral: true,
      });
    }
  },
};
