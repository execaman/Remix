import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("seek")
  .setDescription("play from a time in audio playback");

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
    if (!message.repliable) return;
    await message.reply({
      embeds: [
        client.errorEmbed(
          `You must be in ${!message.member?.voice.channel ? "a" : "my"} voice channel`
        )
      ]
    });
    return;
  }

  const currentTime = queue.currentTime;
  const maxDuration = queue.songs[0].duration;

  const time = args.join(" ");

  if (time.length === 0) {
    if (!message.repliable) return;
    await message.reply({
      embeds: [client.errorEmbed("No timestamp provided")]
    });
    return;
  }

  const type =
    time.startsWith("-") ? "rewind"
    : time.startsWith("+") ? "forward"
    : "seek";

  const lastAction = (text: string) => ({
    icon: (message.member || message.author).displayAvatarURL(),
    text: `${(message.member || message.author).displayName}: ${text}`,
    time: message.createdTimestamp
  });

  try {
    const duration = client.util.time.seconds(time);
    if (isNaN(duration)) {
      throw null;
    }

    if (type === "forward" && currentTime + duration < maxDuration) {
      queue.seek(currentTime + duration);

      queue.lastAction = lastAction(`Duration: Forward ${duration}s`);
    } else if (type === "rewind" && currentTime - duration > 0) {
      queue.seek(currentTime - duration);

      queue.lastAction = lastAction(`Duration: Rewind ${Math.abs(duration)}s`);
    } else if (type === "seek" && duration >= 0 && duration < maxDuration) {
      queue.seek(duration);

      queue.lastAction = lastAction(`Duration: ${client.util.time.formatDuration(duration)}`);
    } else {
      throw null;
    }
  } catch {
    await message.reply({
      embeds: [client.errorEmbed("Invalid time entered")]
    });
    return;
  }
}
