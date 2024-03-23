import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";
import { RepeatMode } from "distube";

export const data = new Discord.SlashCommandBuilder()
  .setName("loop")
  .setDescription("player queue loop mode")
  .addStringOption((mode) =>
    mode
      .setName("mode")
      .setDescription("loop mode")
      .setChoices(
        {
          name: "normal",
          value: "normal"
        },
        {
          name: "song",
          value: "song"
        },
        {
          name: "queue",
          value: "queue"
        },
        {
          name: "auto",
          value: "auto"
        }
      )
      .setRequired(true)
  );

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const queue = client.player.getQueue(interaction.guildId) as
    | Queue
    | undefined;

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

  const mode = interaction.options.getString("mode") as
    | "normal"
    | "song"
    | "queue"
    | "auto";

  if (mode !== "auto" && queue.autoplay) {
    queue.toggleAutoplay();
  }

  if (mode === "normal") {
    queue.setRepeatMode(RepeatMode.DISABLED);
  } else if (mode === "song") {
    queue.setRepeatMode(RepeatMode.SONG);
  } else if (mode === "queue") {
    queue.setRepeatMode(RepeatMode.QUEUE);
  } else if (!queue.autoplay) {
    queue.toggleAutoplay();
  }

  queue.lastAction = {
    icon: interaction.member.displayAvatarURL(),
    text: `${interaction.member.displayName}: Queue Mode: ${client.repeatModeLabel(queue.repeatMode, queue.autoplay)}`,
    time: interaction.createdTimestamp
  };

  await interaction.deleteReply();
}
