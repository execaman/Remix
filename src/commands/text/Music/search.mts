import Discord from "discord.js";
import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("search")
  .setDescription("look for songs and playlists online");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const query = args.join("");

  if (query.length === 0) {
    await message.reply({
      embeds: [client.errorEmbed("No query provided")]
    });
    return;
  }

  try {
    const songs = await client.player.search(query, { limit: 25 });

    const options = songs.map((song) => {
      const formatted = client.util.formatSong(song);
      return new Discord.StringSelectMenuOptionBuilder()
        .setEmoji(client.config.emoji.clock)
        .setLabel(formatted.name)
        .setDescription(formatted.description)
        .setValue(formatted.url);
    });

    await message.reply({
      components: [
        new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>().setComponents(
          new Discord.StringSelectMenuBuilder()
            .setCustomId("player_search")
            .setPlaceholder(`Select from results for '${query.slice(0, 25).trim().concat("..")}'`)
            .setOptions(options)
            .setMaxValues(options.length)
        )
      ]
    });
  } catch {
    await message.reply({
      embeds: [client.errorEmbed()]
    });
  }
}
