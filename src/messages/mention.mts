import type Remix from "../client.mjs";
import type { Message, Queue } from "../utility/types.mjs";

export default async (client: Remix, message: Message) => {
  if (!message.repliable || message.content !== client.mention) {
    return;
  }

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue?.playerMessage) {
    await message.reply({
      embeds: [client.introEmbed(message)],
      components: [client.introComponents()]
    });
    return;
  }

  queue.editTimer!.refresh();
  queue.editCount = 0;
  queue.textChannel = message.channel;

  try {
    await queue.playerMessage.delete();
  } catch {}

  queue.playerMessage = await message.channel.send({
    embeds: [client.playerEmbed(queue)],
    components: client.playerComponents(queue)
  });
};
