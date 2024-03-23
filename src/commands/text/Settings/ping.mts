import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import { Message } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("ping")
  .setDescription("client latency with discord");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  await message.reply({
    content: client.ws.ping.toString().concat("ms")
  });
}
