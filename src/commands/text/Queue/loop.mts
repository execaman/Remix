import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import { RepeatMode } from "distube";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("loop")
  .setDescription("change the way queue loads music");

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

  const mode = args[0]?.toLowerCase();

  const repeatMode =
    ["track", "song"].includes(mode) ? RepeatMode.SONG
    : ["queue", "list", "all"].includes(mode) ? RepeatMode.QUEUE
    : ["auto"].includes(mode) ? 3
    : RepeatMode.DISABLED;

  if (repeatMode !== 3) {
    queue.setRepeatMode(repeatMode);
    if (queue.autoplay) {
      queue.toggleAutoplay();
    }
  } else if (!queue.autoplay) {
    queue.toggleAutoplay();
    if (queue.repeatMode !== RepeatMode.DISABLED) {
      queue.setRepeatMode(RepeatMode.DISABLED);
    }
  }

  const currentRepeatMode = client.repeatModeLabel(queue.repeatMode, queue.autoplay);

  queue.lastAction = {
    icon: member.displayAvatarURL(),
    text: `${member.displayName}: Queue Mode: ${currentRepeatMode}`,
    time: message.createdTimestamp
  };

  await message.reply({
    embeds: [client.playerAlertEmbed({ title: `Queue mode set to '${currentRepeatMode}'` })]
  });
}
