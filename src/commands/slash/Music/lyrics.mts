import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";
import type { LyricResult } from "@execaman/lyricist";

export const data = new Discord.SlashCommandBuilder()
  .setName("lyrics")
  .setDescription("get lyrics of a song by query or current queue")
  .addStringOption((query) =>
    query.setName("query").setDescription("name of song").setMaxLength(25)
  )
  .addBooleanOption((ephemeral) =>
    ephemeral
      .setName("ephemeral")
      .setDescription("whether the response should be visible to you only")
  );

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  const options = {
    query: interaction.options.getString("query", true),
    ephemeral: interaction.options.getBoolean("ephemeral")
  };

  await interaction.deferReply({
    ephemeral: typeof options.ephemeral === "boolean" ? options.ephemeral : true
  });

  let lyricData: LyricResult;

  if (typeof options.query === "string") {
    try {
      lyricData = await client.util.lyrics.fetch(options.query);
    } catch {
      await interaction.editReply({
        embeds: [client.errorEmbed("Couldn't find any lyrics for given query")]
      });
      return;
    }
  } else {
    const queue = client.player.getQueue(interaction.guildId) as Queue | undefined;

    if (queue?.lyricData) {
      lyricData = queue.lyricData;
    } else {
      const song = queue?.songs[0];

      if (!queue || !song?.name) {
        await interaction.editReply({
          embeds: [
            client.errorEmbed(
              !queue ?
                "The player is inactive at the moment"
              : "The current song does not have a name"
            )
          ]
        });
        return;
      }

      try {
        lyricData = await client.util.lyrics.fetch(song.name.slice(0, 25).trim());
        queue.lyricData = lyricData;
        queue.lyricId = `${song.id}`;
      } catch {
        await interaction.editReply({
          embeds: [client.errorEmbed("Couldn't find lyrics for the current song")]
        });
        return;
      }
    }
  }

  try {
    if (client.sessions.has(interaction.user.id)) {
      await client.sessions.get(interaction.user.id)!.destroy();
    }

    const session = new client.util.lyricRequest(interaction, lyricData);
    client.sessions.set(interaction.user.id, session);

    await session.init();
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
  }
}
