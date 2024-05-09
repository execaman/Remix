import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("jump")
  .setDescription("jump to a specific song in queue");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue) {
    await message.reply({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  const position = parseInt(args[0]);

  if (isNaN(position)) {
    await message.reply({
      embeds: [client.errorEmbed("Position must be a integer")]
    });
    return;
  }

  if (
    position === 0 ||
    position >= queue.songs.length ||
    position < -1 * queue.previousSongs.length
  ) {
    await message.reply({
      embeds: [client.errorEmbed("Invalid song position")]
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

  const absolutePosition = position < 0 ? -1 * position : position;

  queue.lastAction = {
    icon: member.displayAvatarURL(),
    text: `${member.displayName}: ${
      absolutePosition === 1 ?
        position < 0 ?
          "Play Previous"
        : "Play Next"
      : `Queue: Jump to ${position < 0 ? "previous" : ""}#${absolutePosition}`
    }`,
    time: message.createdTimestamp
  };

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description:
            absolutePosition === 1 ?
              `Stopping '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
            : `Skipping ${position} tracks`
        })
      ]
    });
  }

  try {
    await queue.jump(position);
  } catch {
    await message.reply({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  if (message.channelId !== queue.textChannel?.id) {
    await message.reply({
      embeds: [
        client.playerAlertEmbed({
          title: `Jumped to '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
        })
      ]
    });
  }
}
