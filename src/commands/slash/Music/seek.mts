import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("seek")
  .setDescription("jump to a specific time in song")
  .addStringOption((time) =>
    time
      .setName("time")
      .setDescription("values like -30, +30, 02:30 are supported")
      .setRequired(true)
  );

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const queue = client.player.getQueue(interaction.guildId) as Queue | undefined;

  if (!queue) {
    await interaction.editReply({
      embeds: [client.errorEmbed("The player is inactive at the moment")]
    });
    return;
  }

  if (
    !interaction.member.voice.channel ||
    queue.voice.channelId !== interaction.member.voice.channelId
  ) {
    await interaction.editReply({
      embeds: [
        client.errorEmbed(
          `You must be in ${!interaction.member.voice.channel ? "a" : "my"} voice channel`
        )
      ]
    });
    return;
  }

  try {
    const currentTime = queue.currentTime;
    const seekTime = interaction.options.getString("time", true);

    const seekType =
      seekTime.startsWith("-") ? "rewind"
      : seekTime.startsWith("+") ? "forward"
      : "absolute";

    const seekDuration = client.util.time.seconds(seekTime);

    if (isNaN(seekDuration)) throw "Invalid time/duration";

    const lastAction = (text: string) => ({
      icon: interaction.member.displayAvatarURL(),
      text: `${interaction.member.displayName}: ${text}`,
      time: interaction.createdTimestamp
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

    await interaction.deleteReply();
  } catch (err) {
    await interaction.editReply({
      embeds: [client.errorEmbed(typeof err === "string" ? err : null)]
    });
  }
}
