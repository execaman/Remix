import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("seek")
  .setDescription("jump to a specific time in song");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue) {
    await message.reply({
      embeds: [client.errorEmbed("The player is inactive at the moment")]
    });
    return;
  }

  if (args.length === 0) {
    await message.reply({
      embeds: [client.errorEmbed("No time/duration specified")]
    });
    return;
  }

  try {
    const currentTime = queue.currentTime;
    const seekTime = args[0];

    const seekType =
      seekTime.startsWith("-") ? "rewind"
      : seekTime.startsWith("+") ? "forward"
      : "absolute";

    const seekDuration = client.util.time.seconds(seekTime);

    if (isNaN(seekDuration)) throw "Invalid time/duration";

    const member = await message.guild.members.fetch(message.author.id);

    const lastAction = (text: string) => ({
      icon: member.displayAvatarURL(),
      text: `${member.displayName}: ${text}`,
      time: message.createdTimestamp
    });

    if (seekType === "rewind") {
      if (currentTime - seekDuration < 0) throw "Duration rewinds current time below 0";
      queue.seek(currentTime - seekDuration);

      queue.lastAction = lastAction(`Duration: Rewind ${seekDuration}s`);
    } else if (seekType === "forward") {
      if (currentTime + seekDuration >= queue.songs[0].duration)
        throw "Duration forwards current time beyond track length";

      queue.seek(currentTime + seekDuration);
      queue.lastAction = lastAction(`Duration: Forward ${seekDuration}s`);
    } else {
      if (seekDuration < 0 || seekDuration >= queue.songs[0].duration)
        throw "Timestamp is not within track length";

      queue.seek(seekDuration);
      queue.lastAction = lastAction(`Duration: ${client.util.time.formatDuration(seekDuration)}`);
    }

    if (message.channelId !== queue.textChannel?.id) {
      await message.reply({
        embeds: [
          client.playerAlertEmbed({
            title: `Current time set to ${client.util.time.formatDuration(queue.currentTime)}`
          })
        ]
      });
    }
  } catch (err) {
    await message.reply({
      embeds: [client.errorEmbed(typeof err === "string" ? err : null)]
    });
  }
}
