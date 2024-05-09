import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("previous")
  .setDescription("play the previous song in queue");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue || queue.previousSongs.length === 0) {
    await message.reply({
      embeds: [
        client.errorEmbed(
          !queue ? "The player is inactive at the moment" : "There are no previous songs in queue"
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
    text: `${member.displayName}: Play Previous`,
    time: message.createdTimestamp
  };

  if (client.canSendMessageIn(queue.textChannel)) {
    queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description: `Stopping '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
        })
      ]
    });
  }

  try {
    await queue.previous();
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
          title: `Now playing '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
        })
      ]
    });
  }
}
