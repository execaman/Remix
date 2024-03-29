import Discord from "discord.js";
import type Remix from "../../client.mjs";
import type { Queue } from "../../utility/types.mjs";

export default async (client: Remix, queue: Queue) => {
  if (
    !queue.textChannel
      ?.permissionsFor(client.user.id, false)
      ?.has(Discord.PermissionFlagsBits.SendMessages)
  ) {
    return;
  }

  await queue.textChannel.send({
    embeds: [client.errorEmbed("Left the voice channel due to inactivity")]
  });
};
