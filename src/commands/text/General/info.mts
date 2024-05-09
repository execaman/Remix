import Discord from "discord.js";
import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("info")
  .setDescription("general information about the bot");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  await message.reply({
    embeds: [
      new Discord.EmbedBuilder()
        .setColor(Discord.Colors.Yellow)
        .setAuthor({
          name: client.user.username,
          iconURL: client.user.displayAvatarURL()
        })
        .setThumbnail(
          "username" in client.application.owner! ?
            client.application.owner.displayAvatarURL()
          : client.application.owner!.iconURL()
        )
        .setFields([
          {
            name: "Owner",
            value: Discord.codeBlock(
              "username" in client.application.owner! ?
                client.application.owner.displayName
              : client.application.owner!.members.map((i) => i.user.displayName).join(", ")
            )
          },
          {
            name: "Availability",
            value: Discord.codeBlock(client.application.botPublic ? "Public" : "Private"),
            inline: true
          },
          {
            name: "Discord.js",
            value: Discord.codeBlock("v".concat(Discord.version)),
            inline: true
          },
          {
            name: "Node.js",
            value: Discord.codeBlock(process.version),
            inline: true
          },
          {
            name: "Date of Creation (UTC)",
            value: Discord.codeBlock(
              client.application.createdAt.toLocaleString("en", {
                timeZone: "UTC",
                dateStyle: "medium",
                timeStyle: "short"
              })
            ),
            inline: true
          },
          {
            name: "Server Count",
            value: Discord.codeBlock(
              (client.application.approximateGuildCount || client.guilds.cache.size).toLocaleString(
                "en",
                {
                  notation: "compact"
                }
              )
            ),
            inline: true
          },
          {
            name: "User Count",
            value: Discord.codeBlock(
              client.guilds.cache
                .reduce<number>((total, guild) => (total += guild.memberCount), 0)
                .toLocaleString("en", { notation: "compact" })
            ),
            inline: true
          }
        ])
    ]
  });
}
