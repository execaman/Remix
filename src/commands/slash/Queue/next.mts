import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("next")
  .setDescription("play the next song in queue");

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const queue = client.player.getQueue(interaction.guildId) as Queue | undefined;

  if (!queue || queue.songs.length === 1) {
    await interaction.editReply({
      embeds: [
        client.errorEmbed(
          !queue ? "The player is inactive at the moment" : "There are no upcoming songs in queue"
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
    text: `${interaction.member.displayName}: Play Next`,
    time: interaction.createdTimestamp
  };

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description: `Stopping '${queue.songs[0].name?.slice(0, 45).trim() || "Untitled Track"}'`
        })
      ]
    });
  }

  try {
    await queue.skip();
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  await interaction.deleteReply();
}
