import Discord from "discord.js";
import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message } from "../../../utility/types.mjs";
import type { IGuild } from "../../../models/guild.mjs";

export const data = new TextCommandBuilder()
  .setName("prefix")
  .setDescription("change the prefix for text commands on this server")
  .setMemberPermissions(Discord.PermissionFlagsBits.ManageGuild);

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const Guild = client.db.model<IGuild>("guild");

  const data = (await Guild.findOne({ id: message.guildId })) || new Guild({ id: message.guildId });

  const prefix = args[0];

  if (typeof prefix === "string") {
    if (prefix.length > 5) {
      await message.reply({
        embeds: [client.errorEmbed("Prefix shouldn't be more than 5 characters in length")]
      });
      return;
    }
    if (data.prefix !== prefix) {
      data.prefix = prefix;
      try {
        await data.save();
      } catch {
        await message.reply({
          embeds: [client.errorEmbed()]
        });
        return;
      }
    }
  }

  await message.reply({
    embeds: [
      new Discord.EmbedBuilder()
        .setColor(Discord.Colors.Yellow)
        .setAuthor({
          name: "Current Prefix",
          iconURL: client.user.displayAvatarURL()
        })
        .setDescription(Discord.codeBlock(data.prefix))
    ]
  });
}
