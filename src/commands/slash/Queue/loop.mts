import Discord from "discord.js";
import { RepeatMode } from "distube";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("loop")
  .setDescription("change the way queue loads music")
  .addStringOption((mode) =>
    mode
      .setName("mode")
      .setDescription("select a queue mode")
      .setChoices(
        {
          name: "Auto",
          value: "3"
        },
        {
          name: "Normal",
          value: `${RepeatMode.DISABLED}`
        },
        {
          name: "Song",
          value: `${RepeatMode.SONG}`
        },
        {
          name: "Queue",
          value: `${RepeatMode.QUEUE}`
        }
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

  const repeatMode = parseInt(interaction.options.getString("mode", true)) as RepeatMode | 3;

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
    icon: interaction.member.displayAvatarURL(),
    text: `${interaction.member.displayName}: Queue Mode: ${currentRepeatMode}`,
    time: interaction.createdTimestamp
  };

  await interaction.deleteReply();
}
