import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("shuffle")
  .setDescription("re-position upcoming songs in queue at random");

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const queue = client.player.getQueue(interaction.guildId) as Queue | undefined;

  if (!queue || queue.songs.length < 3) {
    await interaction.editReply({
      embeds: [
        client.errorEmbed(
          !queue ?
            "The player is inactive at the moment"
          : "There should be at least 3 songs for a shuffle"
        )
      ]
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

  queue.lastAction = {
    icon: interaction.member.displayAvatarURL(),
    text: `${interaction.member.displayName}: Queue: Shuffle`,
    time: interaction.createdTimestamp
  };

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description: `Shuffling ${queue.songs.length} songs`
        })
      ]
    });
  }

  try {
    await queue.shuffle();
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
  }

  await interaction.deleteReply();
}
