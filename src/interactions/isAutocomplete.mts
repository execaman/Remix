import Discord from "discord.js";
import type Remix from "../client.mjs";

export default async (client: Remix, interaction: Discord.AutocompleteInteraction<"cached">) => {
  const command = client.commands.slash.get(interaction.commandName);

  if (
    !command ||
    typeof command.autocomplete !== "function" ||
    (command.owner && !client.config.owners.has(interaction.user.id))
  ) {
    return;
  }

  await command.autocomplete(client, interaction);
};
