import Discord from "discord.js";
import type Remix from "../../client.mjs";
import type { Queue } from "../../utility/types.mjs";
import type { Song } from "distube";

export default async (client: Remix, queue: Queue, song: Song) => {
  if (
    !queue.textChannel
      ?.permissionsFor(client.user.id, false)
      ?.has(Discord.PermissionFlagsBits.SendMessages)
  ) {
    return;
  }

  const requester = song.member || song.user;

  await queue.textChannel.send({
    embeds: [
      new Discord.EmbedBuilder()
        .setColor(Discord.Colors.Yellow)
        .setAuthor({
          name: `Song Added by ${requester?.displayName || "Anonymous User"}`,
          iconURL: (requester || client.user).displayAvatarURL()
        })
        .setTitle(
          !song.name ? "Untitled Track"
          : song.name.length > 50 ? song.name.slice(0, 50).trim().concat("..")
          : song.name
        )
        .setURL(song.url)
    ]
  });
};
