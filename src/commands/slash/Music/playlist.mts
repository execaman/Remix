import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type MusicRequest from "../../../modules/classes/music.mjs";
import type { IUser } from "../../../models/user.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("playlist")
  .setDescription("manage your playlist");

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  let userData: IUser = null!;

  if (client.sessions.has(interaction.user.id)) {
    const session = client.sessions.get(interaction.user.id) as MusicRequest;

    userData = session.data;

    await session.destroy();
  } else {
    const User = client.db.model<IUser>("user");

    userData =
      (await User.findOne({ id: interaction.user.id })) ||
      new User({ id: interaction.user.id });
  }

  const newSession = new client.util.musicRequest(interaction, userData);

  client.sessions.set(interaction.user.id, newSession);

  await newSession.init();
}
