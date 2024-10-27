import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { BugSchema } from "../types/Schemas.ts";

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
