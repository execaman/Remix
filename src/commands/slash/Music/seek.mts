import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("seek")
  .setDescription("play from a time in audio playback")
  .addStringOption((duration) =>
    duration.setName("duration").setDescription("like -30, 03:45, +30").setRequired(true)
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

  const currentTime = queue.currentTime;
  const maxDuration = queue.songs[0].duration;

  const time = interaction.options.getString("duration") as string;

  const type =
    time.startsWith("-") ? "rewind"
    : time.startsWith("+") ? "forward"
    : "seek";

  const lastAction = (text: string) => ({
    icon: interaction.member.displayAvatarURL(),
    text: `${interaction.member.displayName}: ${text}`,
    time: interaction.createdTimestamp
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
    await interaction.editReply({
      embeds: [client.errorEmbed("Invalid time entered")]
    });
    return;
  }

  await interaction.deleteReply();
}
