import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("previous")
  .setDescription("play the previous song");

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const queue = client.player.getQueue(interaction.guildId) as
    | Queue
    | undefined;

  if (!queue || queue.previousSongs.length === 0) {
    await interaction.editReply({
      embeds: [
        client.errorEmbed(
          !queue ?
            "The player is inactive at the moment"
          : "There are no previous songs in Queue"
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
    text: `${interaction.member.displayName}: Play Previous`,
    time: interaction.createdTimestamp
  };

  if (
    queue.textChannel
      ?.permissionsFor(client.user.id)
      ?.has(Discord.PermissionFlagsBits.SendMessages)
  ) {
    const songName = queue.songs[0].name?.slice(0, 40);
    await queue.textChannel.send({
      embeds: [
        new Discord.EmbedBuilder()
          .setColor(Discord.Colors.Yellow)
          .setAuthor({
            name: queue.lastAction.text,
            iconURL: queue.lastAction.icon
          })
          .setDescription(
            Discord.codeBlock(`Stopping '${songName || "Untitled Track"}'`)
          )
      ]
    });
  }

  await queue.previous();
  await interaction.deleteReply();
}
