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

  const queue = client.player.getQueue(interaction.guildId) as Queue | undefined;

  const position = interaction.options.getInteger("position") as number;

  if (!queue || position >= queue.songs.length) {
    await interaction.editReply({
      embeds: [
        client.errorEmbed(!queue ? "The player is inactive at the moment" : "Invalid position")
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

  if (client.canSendMessageIn(queue.textChannel)) {
    await queue.textChannel.send({
      embeds: [
        client.playerAlertEmbed({
          icon: queue.lastAction.icon,
          title: queue.lastAction.text,
          description: Discord.codeBlock(`Skipping ${position} track${position > 1 ? "s" : ""}`)
        })
      ]
    });
  }

  await queue.jump(position);

  await interaction.deleteReply();
}
