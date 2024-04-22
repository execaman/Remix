import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";
import type { LyricResult } from "@execaman/lyricist";

export const data = new Discord.SlashCommandBuilder()
  .setName("lyrics")
  .setDescription("get lyrics of the current song or query you provide")
  .addStringOption((song) =>
    song.setName("song").setDescription("name of the song").setMaxLength(30)
  );

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const song = interaction.options.getString("song");

  let lyricData: LyricResult;

  if (typeof song !== "string") {
    const queue = client.player.getQueue(interaction.guildId) as Queue | undefined;

    if (!queue) {
      await interaction.editReply({
        embeds: [client.errorEmbed("The player is inactive at the moment")]
      });
      return;
    }

    if (!queue.lyricData) {
      const song = queue.songs[0];
      const songName = song.name?.slice(0, 25).trim();

      try {
        if (typeof songName !== "string" || typeof song.id !== "string") {
          throw null;
        }

        queue.lyricData = await client.util.lyrics.fetch(songName);
        queue.lyricId = song.id;
      } catch {
        await interaction.editReply({
          embeds: [client.errorEmbed()]
        });
        return;
      }
    }
    lyricData = queue.lyricData;
  } else {
    try {
      lyricData = await client.util.lyrics.fetch(song);
    } catch {
      await interaction.editReply({
        embeds: [client.errorEmbed()]
      });
      return;
    }
  }

  if (client.sessions.has(interaction.user.id)) {
    await client.sessions.get(interaction.user.id)!.destroy();
  }

  const session = new client.util.lyricRequest(interaction, lyricData);

  client.sessions.set(interaction.user.id, session);

  await session.init();
}
