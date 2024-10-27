import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../types/Interactions.ts";
import config from "./../../config.ts";

const cache = new Map<string, UnsplashResponse[]>();
const imageTypes = config.images || ["cat"];

const command = new SlashCommandBuilder()
  .setName("image")
  .setDescription("Returns a random image from the internet.")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("The search query for the image.")
      .setRequired(true)
      .setAutocomplete(true),
  );

type UnsplashResponse = {
  urls: {
    raw: string;
  };
  links: {
    html: string;
  };
  user: {
    name: string;
    profile_image: {
      small: string;
    };
    links: {
      html: string;
    };
  };
};

async function fetchImage(query: string): Promise<UnsplashResponse> {
  const response = await fetch(
    `https://api.unsplash.com/photos/random?query=${query}&client_id=${config.unsplash.accessKey}`,
  );

  if (!response.ok) {
    console.error(response.statusText);
    return cache.get(query)?.shift() as UnsplashResponse;
  }

  return response.json();
}

export default {
  data: command.toJSON(),
  async execute(_client, interaction) {
    if (!interaction.isChatInputCommand()) return;
    const query = interaction.options.getString("query");
    if (!query || !imageTypes.includes(query))
      return interaction.reply({ content: "Invalid query.", ephemeral: true });

    const image = await fetchImage(query);

    if (!image)
      return interaction.reply("An error occurred while fetching the image.");

    const cacheImages = cache.get(query) || [];
    cacheImages.push(image);
    cache.set(query, cacheImages);

    const unsplashButton = new ButtonBuilder()
      .setLabel("View on Unsplash")
      .setStyle(ButtonStyle.Link)
      .setURL(image.links.html);

    const authorButton = new ButtonBuilder()
      .setLabel("View Author")
      .setStyle(ButtonStyle.Link)
      .setURL(image.user.links.html);

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      unsplashButton,
      authorButton,
    );

    const embed = new EmbedBuilder()
      .setAuthor({
        name: image.user.name,
        iconURL: image.user.profile_image.small,
        url: image.user.links.html,
      })
      .setImage(image.urls.raw);

    await interaction.reply({ embeds: [embed], components: [buttons] });
  },
  async autocomplete(interaction) {
    const query = interaction.options.getString("query");
    let options: { name: string; value: string }[] = [];

    if (!query) {
      options = imageTypes.map((type) => ({ name: type, value: type }));
    } else {
      options = imageTypes
        .filter((type) => type.includes(query))
        .map((type) => ({ name: type, value: type }));
    }

    await interaction.respond(options);
  },
} as Command;
