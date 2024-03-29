import Discord from "discord.js";
import { setTimeout } from "node:timers";
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

  if (queue.lyricId && queue.lyricId !== song.id) {
    delete queue.lyricId;
    delete queue.lyricData;
  }

  queue.playerMessage = await queue.textChannel.send({
    embeds: [client.playerEmbed(queue)],
    components: client.playerComponents(queue)
  });

  queue.editCount = 0;

  queue.editTimer = setTimeout(
    client.handlePlayer,
    10_000,
    client,
    queue.id
  ).unref();
};
