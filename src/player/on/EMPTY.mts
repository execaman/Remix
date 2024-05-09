import type Remix from "../../client.mjs";
import type { Queue } from "../../utility/types.mjs";

export default async (client: Remix, queue: Queue) => {
  if (!client.canSendMessageIn(queue.textChannel)) return;

  await queue.textChannel.send({
    embeds: [client.errorEmbed("Left the voice channel due to inactivity")]
  });
};
