import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("shuffle")
  .setDescription("re-position upcoming songs in queue at random");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue || queue.songs.length < 3) {
    await message.reply({
      embeds: [
        client.errorEmbed(
          !queue ?
            "The player is inactive at the moment"
          : "There should be at least 3 songs for a shuffle"
        )
      ]
    });
    return;
  }

  const member = await message.guild.members.fetch(message.author.id);

  if (!member.voice.channel || queue.voice.channelId !== member.voice.channelId) {
    await message.reply({
      embeds: [
        client.errorEmbed(`You must be in ${!member.voice.channel ? "a" : "my"} voice channel`)
      ]
    });
    return;
  }

  queue.lastAction = {
    icon: member.displayAvatarURL(),
    text: `${member.displayName}: Queue: Shuffle`,
    time: message.createdTimestamp
  };

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description: `Shuffling ${queue.songs.length} songs`
        })
      ]
    });
  }

  try {
    await queue.shuffle();
  } catch {
    await message.reply({
      embeds: [client.errorEmbed()]
    });
  }

  if (message.channelId !== queue.textChannel?.id) {
    await message.reply({
      embeds: [client.playerAlertEmbed({ title: `Shuffled ${queue.songs.length} songs` })]
    });
  }
}
