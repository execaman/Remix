import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";
import type { PlayOptions } from "distube";

export const data = new TextCommandBuilder()
  .setName("play")
  .setUsage("play <name/url>")
  .setDescription("play music by name or url");

export async function execute(client: Remix, message: Message, args: string[]) {
  const query = args.join(" ");

  if (query.length === 0) {
    if (!message.repliable) return;
    await message.reply({
      embeds: [client.errorEmbed("No source provided to play from")]
    });
    return;
  }

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (
    !message.member?.voice.channel ||
    (queue && queue.voice.channelId !== message.member.voice.channelId)
  ) {
    if (!message.repliable) return;
    await message.reply({
      embeds: [
        client.errorEmbed(
          `You must be in ${!message.member?.voice.channel ? "a" : "my"} voice channel`
        )
      ]
    });
    return;
  }

  const playOptions: PlayOptions = {
    member: message.member
  };

  if (!queue?.textChannel) {
    playOptions.textChannel = message.channel;
  }

  try {
    await client.player.play(message.member.voice.channel, query, playOptions);
  } catch {
    if (!message.repliable) return;
    await message.reply({
      embeds: [client.errorEmbed()]
    });
  }
}
