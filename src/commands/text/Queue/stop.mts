import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder().setName("stop").setDescription("stop the player");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue) {
    await message.reply({
      embeds: [client.errorEmbed("The player is inactive at the moment")]
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

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: member.displayAvatarURL(),
          title: `${member.displayName}: Stop Player`,
          description: `Stopping Player.. [${queue.songs.length} Track${queue.songs.length > 1 ? "s" : ""} Remaining]`
        })
      ]
    });
  }

  try {
    await queue.stop();
  } catch {
    await message.reply({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  if (message.channelId !== queue.textChannel?.id) {
    await message.reply({
      embeds: [client.playerAlertEmbed({ title: "Player stopped" })]
    });
  }
}
