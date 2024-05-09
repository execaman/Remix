import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("volume")
  .setDescription("change player volume")
  .addIntegerOption((level) =>
    level
      .setName("level")
      .setDescription("volume level (10 - 150)")
      .setMinValue(10)
      .setMaxValue(150)
      .setRequired(true)
  );

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

  const level = interaction.options.getInteger("level", true);

  queue.lastAction = {
    icon: interaction.member.displayAvatarURL(),
    text: `${interaction.member.displayName}: Volume ${level}%`,
    time: interaction.createdTimestamp
  };

  queue.setVolume(level);

  await interaction.deleteReply();
}
