import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("jump")
  .setDescription("jump to a specific song in queue")
  .addIntegerOption((position) =>
    position
      .setName("position")
      .setDescription(
        "position of the song in queue (negative for previous, non-negative for upcoming)"
      )
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

  const position = interaction.options.getInteger("position", true);

  if (
    position === 0 ||
    position >= queue.songs.length ||
    position < -1 * queue.previousSongs.length
  ) {
    await interaction.editReply({
      embeds: [client.errorEmbed("Invalid song position")]
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

  const absolutePosition = position < 0 ? -1 * position : position;

  queue.lastAction = {
    icon: interaction.member.displayAvatarURL(),
    text: `${interaction.member.displayName}: ${
      absolutePosition === 1 ?
        position < 0 ?
          "Play Previous"
        : "Play Next"
      : `Queue: Jump to ${position < 0 ? "previous" : ""}#${absolutePosition}`
    }`,
    time: interaction.createdTimestamp
  };

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description:
            absolutePosition === 1 ?
              `Stopping '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
            : `Skipping ${position} tracks`
        })
      ]
    });
  }

  try {
    await queue.jump(position);
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  await interaction.deleteReply();
}
