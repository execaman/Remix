import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("skip")
  .setDescription("skip songs in queue")
  .addIntegerOption((to) =>
    to
      .setName("to")
      .setDescription("number of songs to skip (including the current song)")
      .setMinValue(1)
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

  const skipCount = interaction.options.getInteger("to") || 1;

  if (skipCount >= queue.songs.length) {
    await interaction.editReply({
      embeds: [client.errorEmbed("The queue does not have that many songs")]
    });
    return;
  }

  queue.lastAction = {
    icon: interaction.member.displayAvatarURL(),
    text: `${interaction.member.displayName}: ${skipCount === 1 ? "Play Next" : `Queue: Jump to #${skipCount}`}`,
    time: interaction.createdTimestamp
  };

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description:
            skipCount === 1 ?
              `Stopping '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
            : `Skipping ${skipCount} tracks`
        })
      ]
    });
  }

  try {
    if (skipCount === 1) {
      await queue.skip();
    } else {
      await queue.jump(skipCount);
    }
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  await interaction.deleteReply();
}
