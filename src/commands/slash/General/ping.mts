import Discord from "discord.js";
import type Remix from "../../../client.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("ping")
  .setDescription("client latency with discord");

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.reply({
    content: client.ws.ping.toString().concat("ms")
  });
}
