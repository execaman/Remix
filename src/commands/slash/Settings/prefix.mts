import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { IGuild } from "../../../models/guild.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("prefix")
  .setDescription("change the prefix for text commands on this server")
  .setDefaultMemberPermissions(Discord.PermissionFlagsBits.ManageGuild)
  .addStringOption((label) =>
    label
      .setName("label")
      .setDescription("prefix should not be longer than 5 characters")
      .setMinLength(1)
      .setMaxLength(5)
      .setRequired(true)
  );

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const Guild = client.db.model<IGuild>("guild");

  const data =
    (await Guild.findOne({ id: interaction.guildId })) || new Guild({ id: interaction.guildId });

  const prefix = interaction.options.getString("label", true);

  if (data.prefix !== prefix) {
    data.prefix = prefix;
    try {
      await data.save();
    } catch {
      await interaction.editReply({
        embeds: [client.errorEmbed()]
      });
      return;
    }
  }

  await interaction.editReply({
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
