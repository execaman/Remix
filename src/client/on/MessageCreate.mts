import type Remix from "../../client.mjs";
import type { Message } from "../../utility/types.mjs";

export default async (client: Remix, message: Message) => {
  if (message.author.bot || !message.inGuild()) {
    return;
  }

  if (message.partial) {
    await message.fetch();
  }

  message.repliable = client.canSendMessageIn(message.channel);

  await Promise.allSettled(client.modules.map((module) => module(client, message)));
};
