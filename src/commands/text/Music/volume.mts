import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder().setName("volume").setDescription("set player volume");

export async function execute(client: Remix, message: Message, args: string[]) {
  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue) {
    if (!message.repliable) return;
    await message.reply({
      embeds: [client.errorEmbed("The player is inactive at the moment")]
    });
    return;
  }

  if (!message.member?.voice.channel || queue.voice.channelId !== message.member.voice.channelId) {
    await message.reply({
      embeds: [
        client.errorEmbed(
          `You must be in ${!message.member?.voice.channel ? "a" : "my"} voice channel`
        )
      ]
    });
    return;
  }

  const volume = Number(args.join(" "));

  if (isNaN(volume)) {
    if (!message.repliable) return;
    await message.reply({
      embeds: [client.errorEmbed("No volume level specified")]
    });
    return;
  }

  queue.setVolume(volume);

  queue.lastAction = {
    icon: (message.member || message.author).displayAvatarURL(),
    text: `${(message.member || message.author).displayName}: Volume ${volume}%`,
    time: message.createdTimestamp
  };
}
