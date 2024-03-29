import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("stop")
  .setDescription("stops the player");

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

  await queue.stop();
  await interaction.deleteReply();

  if (
    queue.textChannel
      ?.permissionsFor(client.user.id, false)
      ?.has(Discord.PermissionFlagsBits.SendMessages)
  ) {
    await queue.textChannel.send({
      embeds: [
        new Discord.EmbedBuilder().setColor(Discord.Colors.Yellow).setAuthor({
          name: `| Stop Player`,
          iconURL: interaction.member.displayAvatarURL()
        })
      ]
    });
  }
}
