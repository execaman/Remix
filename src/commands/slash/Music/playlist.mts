import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { IUser } from "../../../models/user.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("playlist")
  .setDescription("manage your playlist");

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const User = client.db.model<IUser>("user");

  const data =
    (await User.findOne({ id: interaction.user.id })) || new User({ id: interaction.user.id });

  try {
    if (client.sessions.has(interaction.user.id)) {
      await client.sessions.get(interaction.user.id)!.destroy();
    }

    const session = new client.util.musicRequest(interaction, data);
    client.sessions.set(interaction.user.id, session);

    await session.init();
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
  }
}
