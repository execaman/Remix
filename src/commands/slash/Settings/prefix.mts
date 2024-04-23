import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { IGuild } from "../../../models/guild.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("prefix")
  .setDescription("change the prefix for your server")
  .addStringOption((value) =>
    value.setName("value").setDescription("new prefix").setMinLength(1).setMaxLength(5)
  );

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const Guild = client.db.model<IGuild>("guild");

  const guild =
    (await Guild.findOne({ id: interaction.guildId })) || new Guild({ id: interaction.guildId });

  const prefix = interaction.options.getString("value");

  if (typeof prefix === "string" && prefix !== guild.prefix) {
    guild.prefix = prefix;
  }

  if (guild.isModified()) await guild.save();

  await interaction.editReply({
    embeds: [
      new Discord.EmbedBuilder()
        .setColor(Discord.Colors.Yellow)
        .setTitle("Current Prefix")
        .setDescription(Discord.codeBlock(guild.prefix))
    ]
  });
}
