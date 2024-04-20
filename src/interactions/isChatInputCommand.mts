import Discord from "discord.js";
import type Remix from "../client.mjs";

export default async (
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) => {
  const command = client.commands.slash.get(interaction.commandName);

  if (!command || (command.owner && !client.config.owners.has(interaction.user.id))) {
    return;
  }

  await command.execute(client, interaction);
};
