import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("stop")
  .setDescription("stop the player");

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

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: interaction.member.displayAvatarURL(),
          title: `${interaction.member.displayName}: Stop Player`,
          description: `Stopping Player.. [${queue.songs.length} Track${queue.songs.length > 1 ? "s" : ""} Remaining]`
        })
      ]
    });
  }

  try {
    await queue.stop();
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  await interaction.deleteReply();
}
