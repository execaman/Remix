import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("resume")
  .setDescription("resume the player");

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const queue = client.player.getQueue(interaction.guildId) as
    | Queue
    | undefined;

  if (!queue || queue.playing) {
    await interaction.editReply({
      embeds: [
        client.errorEmbed(
          !queue ?
            "The player is inactive at the moment"
          : "The player is not paused"
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

  queue.resume();

  queue.lastAction = {
    icon: interaction.member.displayAvatarURL(),
    text: `${interaction.member.displayName}: Resume Player`,
    time: interaction.createdTimestamp
  };

  await interaction.deleteReply();
}
