import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("filters")
  .setDescription("view or manage player filters");

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  const queue = client.player.getQueue(interaction.guildId) as Queue | undefined;

  if (queue) {
    if (
      !interaction.member.voice.channel ||
      queue.voice.channelId !== interaction.member.voice.channelId
    ) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          client.errorEmbed(
            `You must be in ${!interaction.member.voice.channel ? "a" : "my"} voice channel`
          )
        ]
      });
    } else {
      await interaction.reply({
        ephemeral: true,
        components: client.playerQueueFilters(queue)
      });
    }
    return;
  }

  const filters = Object.keys(client.player.filters);
  const filtersPerField = Math.ceil(filters.length / 3);

  const filterFields = filters.reduce<string[][]>(
    (total, filter) => {
      if (total.at(-1)!.length < filtersPerField) total.at(-1)!.push(filter);
      else total.push([filter]);
      return total;
    },
    [[]]
  );

  await interaction.reply({
    ephemeral: true,
    embeds: [
      new Discord.EmbedBuilder()
        .setColor(Discord.Colors.Yellow)
        .setAuthor({
          name: `Available Filters [${filters.length}]`,
          iconURL: client.user.displayAvatarURL()
        })
        .setFields(
          filterFields.map((field) => ({
            name: String.fromCharCode(10240),
            value: Discord.codeBlock(field.join("\n")),
            inline: true
          }))
        )
    ]
  });
}
