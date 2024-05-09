import * as OS from "node:os";
import Discord from "discord.js";
import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("stats")
  .setDescription("hardware and other statistics of the bot");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  await message.reply({
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
