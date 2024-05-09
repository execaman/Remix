import Discord from "discord.js";
import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("eval")
  .setOwner(true)
  .setAliases("ev")
  .setDescription("evaluate a script");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const script = args.join(" ");

  if (script.length === 0) {
    await message.reply({
      embeds: [client.errorEmbed("No script given to evaluate")]
    });
    return;
  }

  try {
    const result = eval(script);
    let output: string | string[] | null = await client.util.formatCode(result);

    if (output.length > 4086) {
      output = output.match(/.{0,4086}/gs)!;
    }

    const codeEmbed = (code: string) =>
      new Discord.EmbedBuilder()
        .setColor(Discord.Colors.DarkButNotBlack)
        .setDescription(Discord.codeBlock("js", code));

    if (typeof output === "string") {
      await message.reply({
        embeds: [codeEmbed(output)],
        components: [
          new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
            new Discord.ButtonBuilder()
              .setCustomId(message.author.id.concat("_delete"))
              .setStyle(Discord.ButtonStyle.Danger)
              .setLabel("Delete")
          )
        ]
      });
      return;
    }

    const menu = new client.util.menu(output);

    output = null;

    const codeNav = () =>
      new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
        new Discord.ButtonBuilder()
          .setCustomId(message.author.id.concat("_firstItem"))
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("First")
          .setDisabled(!menu.previous),
        new Discord.ButtonBuilder()
          .setCustomId(message.author.id.concat("_previousItem"))
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Previous")
          .setDisabled(!menu.previous),
        new Discord.ButtonBuilder()
          .setCustomId(message.author.id.concat("_delete"))
          .setStyle(Discord.ButtonStyle.Danger)
          .setLabel("Delete"),
        new Discord.ButtonBuilder()
          .setCustomId(message.author.id.concat("_nextItem"))
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Next")
          .setDisabled(!menu.next),
        new Discord.ButtonBuilder()
          .setCustomId(message.author.id.concat("_lastItem"))
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Last")
          .setDisabled(!menu.next)
      );

    const msg = await message.reply({
      embeds: [codeEmbed(menu.currentItem!)],
      components: [codeNav()]
    });

    const collector = msg.createMessageComponentCollector<Discord.ComponentType.Button>({
      dispose: true,
      filter: (i) => i.customId.includes(i.user.id),
      idle: client.util.time.ms("03:00")
    });

    collector.once("end", async () => {
      collector.removeAllListeners();
      menu.erase();
      try {
        await msg.delete();
      } catch {}
    });

    collector.on("collect", async (i) => {
      const action = i.customId.split("_").pop()!;
      if (action === "delete") {
        await i.message.delete();
        return;
      }
      await i.update({
        embeds: [codeEmbed((menu as any)[action])],
        components: [codeNav()]
      });
    });
  } catch (err) {
    await message.reply({
      embeds: [client.errorEmbed(err.message || null)]
    });
  }
}
