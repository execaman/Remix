import Discord from "discord.js";
import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("filters")
  .setDescription("view or manage player filters");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (queue) {
    const member = await message.guild.members.fetch(message.author.id);
    if (!member.voice.channel || queue.voice.channelId !== member.voice.channelId) {
      await message.reply({
        embeds: [
          client.errorEmbed(`You must be in ${!member.voice.channel ? "a" : "my"} voice channel`)
        ]
      });
    } else {
      await message.reply({
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

  await message.reply({
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
