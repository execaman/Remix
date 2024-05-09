import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder().setName("resume").setDescription("resume the player");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue || !queue.paused) {
    await message.reply({
      embeds: [
        client.errorEmbed(`The player is ${!queue ? "inactive" : "not paused"} at the moment`)
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
    text: `${member.displayName}: Resume Player`,
    time: message.createdTimestamp
  };

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description: `Resuming '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
        })
      ]
    });
  }

  try {
    queue.resume();
  } catch {
    await message.reply({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  if (message.channelId !== queue.textChannel?.id) {
    await message.reply({
      embeds: [client.playerAlertEmbed({ title: `Player resumed` })]
    });
  }
}
