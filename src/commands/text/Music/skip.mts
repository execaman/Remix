import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";
import type { Song } from "distube";

export const data = new TextCommandBuilder().setName("skip").setDescription("skip songs in queue");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue) {
    await message.reply({});
    return;
  }

  const skipCount = parseInt(args[0]) || 1;

  if (skipCount < 1 || skipCount >= queue.songs.length) {
    await message.reply({
      embeds: [
        client.errorEmbed(
          skipCount < 1 ?
            "Songs to skip should at least be 1"
          : "The queue does not have that many songs"
        )
      ]
    });
    return;
  }

  const member = await message.guild.members.fetch(message.author.id);

  queue.lastAction = {
    icon: member.displayAvatarURL(),
    text: `${member.displayName}: ${skipCount === 1 ? "Play Next" : `Queue: Jump to #${skipCount}`}`,
    time: message.createdTimestamp
  };

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description:
            skipCount === 1 ?
              `Stopping '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
            : `Skipping ${skipCount} tracks`
        })
      ]
    });
  }

  try {
    if (skipCount === 1) {
      await queue.skip();
    } else {
      await queue.jump(skipCount);
    }
  } catch {
    await message.reply({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  if (message.channelId !== queue?.textChannel?.id) {
    await message.reply({
      embeds: [
        client.playerAlertEmbed({
          title: `${skipCount === 1 ? "Skipped" : "Jumped to"} '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
        })
      ]
    });
  }
}
