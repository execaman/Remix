import Discord from "discord.js";
import type Remix from "../../client.mjs";
import type { Message } from "../../utility/types.mjs";

export default async (client: Remix, message: Message) => {
  if (message.author.bot || !message.inGuild()) {
    return;
  }

  if (message.partial) {
    await message.fetch();
  }

  message.repliable = !!message.channel
    .permissionsFor(client.user.id, false)
    ?.has(Discord.PermissionFlagsBits.SendMessages);

  await Promise.allSettled(
    client.modules.map((module) => module(client, message))
  );
};
