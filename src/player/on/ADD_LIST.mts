import Discord from "discord.js";
import type Remix from "../../client.mjs";
import type { Queue } from "../../utility/types.mjs";
import type { Playlist } from "distube";

export default async (client: Remix, queue: Queue, playlist: Playlist) => {
  if (!client.canSendMessageIn(queue.textChannel)) return;

  const requester = playlist.member || playlist.user || client.user;

  await queue.textChannel.send({
    embeds: [
      new Discord.EmbedBuilder()
        .setColor(Discord.Colors.Yellow)
        .setAuthor({
          name: `Playlist Added by ${requester?.displayName || "Anonymous User"}`,
          iconURL: (requester || client.user).displayAvatarURL()
        })
        .setTitle(
          playlist.name.length > 50 ? playlist.name.slice(0, 50).trim().concat("..") : playlist.name
        )
        .setURL(playlist.url || null)
    ]
  });
};
