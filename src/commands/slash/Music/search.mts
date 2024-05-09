import { URL } from "node:url";
import Discord from "discord.js";
import { SearchResultType } from "distube";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("search")
  .setDescription("look for songs and playlists online")
  .addStringOption((type) =>
    type
      .setName("type")
      .setDescription("select type of query")
      .setChoices(
        {
          name: "song",
          value: `${SearchResultType.VIDEO}`
        },
        {
          name: "playlist",
          value: `${SearchResultType.PLAYLIST}`
        }
      )
      .setRequired(true)
  )
  .addBooleanOption((safe) =>
    safe.setName("safe").setDescription("enable safe search").setRequired(true)
  )
  .addStringOption((query) =>
    query
      .setName("query")
      .setDescription("select an option to play or enter for results")
      .setAutocomplete(true)
      .setRequired(true)
  )
  .addBooleanOption((ephemeral) =>
    ephemeral
      .setName("ephemeral")
      .setDescription("whether the response should be visible to you only")
  );

export async function autocomplete(
  client: Remix,
  interaction: Discord.AutocompleteInteraction<"cached">
) {
  const option = interaction.options.getFocused(true);
  const options: Discord.ApplicationCommandOptionChoiceData[] = [];

  const safeSearch = interaction.options.getBoolean("safe") || false;
  const searchType = interaction.options.getString("type", true) as SearchResultType;

  if (option.value.length !== 0) {
    try {
      for (const result of await client.player.search(option.value, {
        limit: 5,
        safeSearch: safeSearch,
        type: searchType
      })) {
        options.push({
          name: result.name.slice(0, 99),
          value: result.url
        });
      }
    } catch {}
  }
  await interaction.respond(options);
}

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  const options = {
    type: interaction.options.getString("type", true) as SearchResultType,
    safe: interaction.options.getBoolean("safe", true),
    query: interaction.options.getString("query", true),
    ephemeral: interaction.options.getBoolean("ephemeral")
  };

  await interaction.deferReply({
    ephemeral: typeof options.ephemeral === "boolean" ? options.ephemeral : true
  });

  try {
    new URL(options.query);
  } catch {
    try {
      const selectMenuOptions: Discord.StringSelectMenuOptionBuilder[] = [];

      for (const result of await client.player.search(options.query, {
        limit: 25,
        safeSearch: options.safe,
        type: options.type
      })) {
        const song = client.util.formatSong(result);

        selectMenuOptions.push(
          new Discord.StringSelectMenuOptionBuilder()
            .setEmoji(client.config.emoji.clock)
            .setLabel(song.name)
            .setDescription(song.description)
            .setValue(result.url)
        );
      }

      await interaction.editReply({
        components: [
          new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>().setComponents(
            new Discord.StringSelectMenuBuilder()
              .setCustomId("player_search")
              .setPlaceholder(
                `${options.type === SearchResultType.PLAYLIST ? "Playlists" : "Songs"} matching '${options.query.slice(0, 20).trim().concat("..")}'`
              )
              .setOptions(selectMenuOptions)
              .setMaxValues(selectMenuOptions.length)
          )
        ]
      });
    } catch {
      await interaction.editReply({
        embeds: [client.errorEmbed()]
      });
    }
    return;
  }

  const queue = client.player.getQueue(interaction.guildId) as Queue | undefined;

  if (
    !interaction.member.voice.channel ||
    (queue && queue.voice.channelId !== interaction.member.voice.channelId)
  ) {
    await interaction.editReply({
      embeds: [
        client.errorEmbed(
          `You must be in ${!interaction.member.voice.channel ? "a" : "my"} voice channel`
        )
      ]
    });
    return;
  }

  try {
    await client.player.play(interaction.member.voice.channel, options.query, {
      member: interaction.member,
      textChannel: queue?.textChannel || interaction.channel || interaction.member.voice.channel
    });
    await interaction.deleteReply();
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
  }
}
