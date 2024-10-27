import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type Client,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import db, { getBug } from "../database.ts";
import type { BugSchema, UserSchema } from "../types/Schemas.ts";
import { isManager } from "./misc.ts";

export function createModal(
  bugId: string,
  title?: string,
  description?: string,
  editing = false,
) {
  const usedTitle = title || "";
  const modal = new ModalBuilder()
    .setTitle(editing ? `Editing Bug #${bugId}` : "Create a new bug report")
    .setCustomId(editing ? `editBug-${bugId}` : `bug-${bugId}`);

  const titleInput = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Title")
    .setPlaceholder("Enter a title for the bug report.")
    .setValue(usedTitle)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(256)
    .setRequired(true);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Description")
    .setValue(description || "")
    .setPlaceholder("Enter a description for the bug report.")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(4000)
    .setRequired(true);

  const titleRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    titleInput,
  );
  const descriptionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    descriptionInput,
  );

  modal.addComponents(titleRow, descriptionRow);
  return modal;
}

export function editModal(bug: BugSchema) {
  return createModal(bug.id.toString(), bug.title, bug.description, true);
}

export function createButtons(
  bugId: string,
  open = true,
): ActionRowBuilder<ButtonBuilder> {
  const actionRow = new ActionRowBuilder<ButtonBuilder>();

  const statusButton = new ButtonBuilder()
    .setCustomId(`bugStatus-${bugId}`)
    .setLabel(`Status: ${open ? "Open" : "Closed"}`)
    .setDisabled(true)
    .setStyle(ButtonStyle.Primary);

  const solvedButton = new ButtonBuilder()
    .setCustomId(open ? `bugSolved-${bugId}` : `bugReopen-${bugId}`)
    .setLabel(open ? "Mark as Solved" : "Reopen")
    .setStyle(ButtonStyle.Success);

  const editButton = new ButtonBuilder()
    .setCustomId(`bugEdit-${bugId}`)
    .setLabel("Edit")
    .setDisabled(!open)
    .setStyle(ButtonStyle.Secondary);

  const deleteButton = new ButtonBuilder()
    .setCustomId(`bugDelete-${bugId}`)
    .setLabel("Delete")
    .setStyle(ButtonStyle.Danger);

  actionRow.addComponents(statusButton, solvedButton, editButton, deleteButton);
  return actionRow;
}

export async function getBugAndPermissions(
  client: Client,
  interaction: ButtonInteraction,
  userSchema: UserSchema,
) {
  if (!interaction.guild || !userSchema) return { bug: null, canModify: false };
  const bugId = interaction.customId.split("-")[1];

  const bug = getBug(Number(bugId));
  if (!bug) return { bug: null, canModify: false };

  const canModify =
    (await isManager(client, interaction.user, interaction.guild.id)) ||
    bug.user_id === userSchema.id;

  return { bug, canModify };
}

export async function updateBugStatus(
  interaction: ButtonInteraction,
  bugId: string,
  status: string,
  messageContent: string,
) {
  db.exec("UPDATE bugs SET status = ? WHERE id = ?", [status, bugId]);
  await interaction.reply({
    content: `Bug #${bugId} has been ${status === "open" ? "reopened" : "closed"}`,
    ephemeral: true,
  });

  const bug = getBug(Number(bugId));
  const message = await interaction.channel?.messages.fetch(bug.message_id);
  if (!message) return;

  await message.edit({
    components: [createButtons(bugId, status === "open")],
  });

  const thread = message.thread;
  if (!thread) return;
  await thread.send({
    content: messageContent,
  });
}
