import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("volume")
  .setDescription("change player volume");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue) {
    await message.reply({
      embeds: [client.errorEmbed("The player is inactive at the moment")]
    });
    return;
  }

  const level = parseInt(args[0]);

  if (isNaN(level) || level < 10 || level > 150) {
    await message.reply({
      embeds: [
        client.errorEmbed(
          isNaN(level) ? "Volume level not specified" : "Volume level not in range [10 - 150]"
        )
      ]
    });
    return;
  }

  const member = await message.guild.members.fetch(message.guildId);

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
    text: `${member.displayName}: Volume ${level}%`,
    time: message.createdTimestamp
  };

  queue.setVolume(level);

  await message.reply({
    embeds: [
      client.playerAlertEmbed({
        title: `Volume set to ${level}%`
      })
    ]
  });
}
