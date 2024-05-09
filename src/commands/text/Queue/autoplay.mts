import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("autoplay")
  .setDescription("enable player autoplay mode");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue || queue.autoplay) {
    await message.reply({
      embeds: [
        client.errorEmbed(
          !queue ? "The player is inactive at the moment" : "Autoplay already enabled"
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

  queue.toggleAutoplay();

  queue.lastAction = {
    icon: member.displayAvatarURL(),
    text: `${member.displayName}: Queue Mode: Auto`,
    time: message.createdTimestamp
  };

  await message.reply({
    embeds: [client.playerAlertEmbed({ title: "Autoplay Enabled" })]
  });
}
