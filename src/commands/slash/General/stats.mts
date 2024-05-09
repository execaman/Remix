import * as OS from "node:os";
import Discord from "discord.js";
import type Remix from "../../../client.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("stats")
  .setDescription("hardware and other statistics of the bot")
  .addBooleanOption((ephemeral) =>
    ephemeral
      .setName("ephemeral")
      .setDescription("whether the response should be visible to you only")
  );

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  const ephemeral = interaction.options.getBoolean("ephemeral");

  await interaction.reply({
    ephemeral: typeof ephemeral === "boolean" ? ephemeral : true,
    embeds: [
      new Discord.EmbedBuilder().setColor(Discord.Colors.Yellow).setFields([
        {
          name: "Kernel",
          value: Discord.codeBlock(OS.version()),
          inline: true
        },
        {
          name: "Architecture",
          value: Discord.codeBlock(`${process.arch}, ${OS.machine()}`),
          inline: true
        },
        {
          name: "Parallelism",
          value: Discord.codeBlock(OS.availableParallelism().toString()),
          inline: true
        },
        {
          name: "Total Memory",
          value: Discord.codeBlock(
            ((process.constrainedMemory() || OS.totalmem()) / 1e9).toFixed(2).concat("GB")
          ),
          inline: true
        },
        {
          name: "Used Memory",
          value: Discord.codeBlock((process.memoryUsage.rss() / 1e9).toFixed(2).concat("GB")),
          inline: true
        },
        {
          name: "Free Memory",
          value: Discord.codeBlock(
            (((process.constrainedMemory() || OS.totalmem()) - process.memoryUsage.rss()) / 1e9)
              .toFixed(2)
              .concat("GB")
          ),
          inline: true
        },
        {
          name: "System Uptime",
          value: Discord.codeBlock(client.util.time.formatDuration(OS.uptime())),
          inline: true
        },
        {
          name: "Process Uptime",
          value: Discord.codeBlock(client.util.time.formatDuration(process.uptime())),
          inline: true
        },
        {
          name: "Client Uptime",
          value: Discord.codeBlock(client.util.time.formatDuration(client.uptime / 1e3)),
          inline: true
        }
      ])
    ]
  });
}
