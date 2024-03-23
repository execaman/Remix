import Discord from "discord.js";
import type Remix from "../../client.mjs";

export default async (client: Remix, interaction: Discord.Interaction) => {
  if (interaction.user.bot || !interaction.inCachedGuild()) {
    return;
  }

  for (const [type, interact] of client.interactions) {
    if ((interaction as any)[type]?.()) {
      try {
        await interact(client, interaction);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.toLowerCase() !== "unknown interaction"
        ) {
          client.emit(Discord.Events.Error, err);
        }
      }
      return;
    }
  }

  client.emit(
    Discord.Events.Warn,
    `No function defined to handle type ${interaction.type} interactions`
  );
};
