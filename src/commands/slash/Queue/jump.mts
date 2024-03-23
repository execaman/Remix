import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("jump")
  .setDescription("jump to a specific song in queue")
  .addIntegerOption((position) =>
    position
      .setName("position")
      .setDescription("position of that song in queue")
      .setMinValue(1)
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

  const position = interaction.options.getInteger("position") as number;

  if (!queue || position >= queue.songs.length) {
    await interaction.editReply({
      embeds: [
        client.errorEmbed(
          !queue ? "The player is inactive at the moment" : "Invalid position"
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
    text: `${interaction.member.displayName}: Queue: Jump to #${position}`,
    time: interaction.createdTimestamp
  };

  if (
    queue.textChannel
      ?.permissionsFor(client.user.id)
      ?.has(Discord.PermissionFlagsBits.SendMessages)
  ) {
    await queue.textChannel.send({
      embeds: [
        new Discord.EmbedBuilder()
          .setColor(Discord.Colors.Yellow)
          .setAuthor({
            name: queue.lastAction.text,
            iconURL: queue.lastAction.icon
          })
          .setDescription(Discord.codeBlock(`Skipping ${position} tracks`))
      ]
    });
  }

  await queue.jump(position);

  await interaction.deleteReply();
}
