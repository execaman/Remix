import Discord from "discord.js";
import type Remix from "../../../client.mjs";

export const owner = true;

export const data = new Discord.SlashCommandBuilder()
  .setName("eval")
  .setDescription("evaluate a script")
  .addStringOption((script) =>
    script.setName("script").setDescription("script to evaluate").setRequired(true)
  );

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const script = interaction.options.getString("script", true);

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
      await interaction.editReply({
        embeds: [codeEmbed(output)]
      });
      return;
    }

    const menu = new client.util.menu(output);

    output = null;

    const codeNav = () =>
      new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
        new Discord.ButtonBuilder()
          .setCustomId(interaction.user.id.concat("_firstItem"))
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("First")
          .setDisabled(!menu.previous),
        new Discord.ButtonBuilder()
          .setCustomId(interaction.user.id.concat("_previousItem"))
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Previous")
          .setDisabled(!menu.previous),
        new Discord.ButtonBuilder()
          .setCustomId(interaction.user.id.concat("_nextItem"))
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Next")
          .setDisabled(!menu.next),
        new Discord.ButtonBuilder()
          .setCustomId(interaction.user.id.concat("_lastItem"))
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Last")
          .setDisabled(!menu.next)
      );

    const message = await interaction.editReply({
      embeds: [codeEmbed(menu.currentItem!)],
      components: [codeNav()]
    });

    const collector = message.createMessageComponentCollector<Discord.ComponentType.Button>({
      dispose: true,
      idle: client.util.time.ms("03:00")
    });

    collector.once("end", async () => {
      collector.removeAllListeners();
      menu.erase();
      try {
        await interaction.deleteReply();
      } catch {}
    });

    collector.on("collect", async (i) => {
      const action = i.customId.split("_").pop()!;
      await i.update({
        embeds: [codeEmbed((menu as any)[action])],
        components: [codeNav()]
      });
    });
  } catch (err) {
    await interaction.editReply({
      embeds: [client.errorEmbed((await client.util.formatCode(err)).slice(0, 4086))]
    });
  }
}
