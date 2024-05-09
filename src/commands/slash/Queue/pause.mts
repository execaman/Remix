import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("pause")
  .setDescription("pause the player");

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const queue = client.player.getQueue(interaction.guildId) as Queue | undefined;

  if (!queue || queue.paused) {
    await interaction.editReply({
      embeds: [
        client.errorEmbed(`The player is ${!queue ? "inactive" : "already paused"} at the moment`)
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
    text: `${interaction.member.displayName}: Pause Player`,
    time: interaction.createdTimestamp
  };

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description: `Paused '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
        })
      ]
    });
  }

  try {
    queue.pause();
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  await interaction.deleteReply();
}
