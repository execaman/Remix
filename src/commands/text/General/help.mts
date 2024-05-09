import Discord from "discord.js";
import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Subcommand } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("help")
  .setDescription("learn more about available commands");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  if (args.length === 0) {
    await message.reply({
      embeds: [client.introEmbed(message)],
      components: [client.introComponents()]
    });
    return;
  }

  const query = args.shift()!;
  const command = client.commands.text.get(client.commands.aliases.get(query) || query);

  if (command && args.length === 0) {
    await message.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setColor(Discord.Colors.Yellow)
          .setAuthor({
            name: "Text Command </>",
            iconURL: client.user.displayAvatarURL()
          })
          .setFields([
            {
              name: "Name",
              value: Discord.codeBlock(command.data.name)
            },
            {
              name: "Usage",
              value: Discord.codeBlock(command.data.usage || "No usage info available")
            },
            {
              name: "Aliases",
              value: Discord.codeBlock(command.data.aliases?.join(", ") || "None")
            },
            {
              name: "Category",
              value: Discord.codeBlock(command.category)
            },
            {
              name: "Description",
              value: Discord.codeBlock(command.data.description || "No description available")
            },
            {
              name: `Subcommands${command.data.subcommands ? ` [${command.data.subcommands.length}]` : ""}`,
              value: Discord.codeBlock(
                command.data.subcommands?.map((i) => i.name).join(", ") || "None"
              )
            }
          ])
      ]
    });
    return;
  }

  if (!command) {
    const commands = client.commands.text.reduce<string[]>((total, command) => {
      if (command.category === query) total.push(command.data.name);
      return total;
    }, []);

    if (commands.length === 0) {
      await message.reply({
        embeds: [client.errorEmbed("No command/category found for given query")]
      });
      return;
    }

    await message.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setColor(Discord.Colors.Yellow)
          .setAuthor({
            name: `${query} Commands [${commands.length}]`,
            iconURL: client.user.displayAvatarURL()
          })
          .setDescription(Discord.codeBlock(commands.join("\n")))
      ]
    });
    return;
  }

  if (!command.data.subcommands) {
    await message.reply({
      embeds: [client.errorEmbed(`Command '${command.data.name}' has no subcommands`)]
    });
    return;
  }

  try {
    const findSubcommand = (subcommands: Subcommand[], argList: string[]): Subcommand => {
      const arg = argList.shift()!;
      const subcommand = subcommands.find((i) => i.aliases?.includes(arg) || i.name === arg);
      if (!subcommand) throw `Command '${command.data.name}' has no subcommand(s) named '${arg}'`;
      if (argList.length === 0) return subcommand;
      if (!subcommand.subcommands) throw `Subcommand '${subcommand.name}' has no subcommands`;
      return findSubcommand(subcommand.subcommands, argList);
    };

    const subcommand = findSubcommand(command.data.subcommands, args.slice(0));

    await message.reply({
      embeds: [
        new Discord.EmbedBuilder()
          .setColor(Discord.Colors.Yellow)
          .setAuthor({
            name: "Subcommand </>",
            iconURL: client.user.displayAvatarURL()
          })
          .setFields([
            {
              name: "Name",
              value: Discord.codeBlock(subcommand.name)
            },
            {
              name: "Usage",
              value: Discord.codeBlock(subcommand.usage || "No usage info available")
            },
            {
              name: "Aliases",
              value: Discord.codeBlock(subcommand.aliases?.join(", ") || "None")
            },
            {
              name: "Description",
              value: Discord.codeBlock(subcommand.description || "No description available")
            },
            {
              name: `Subcommands${subcommand.subcommands ? ` [${subcommand.subcommands.length}]` : ""}`,
              value: Discord.codeBlock(
                subcommand.subcommands?.map((i) => i.name).join(", ") || "None"
              )
            }
          ])
      ]
    });
  } catch (err) {
    await message.reply({
      embeds: [client.errorEmbed(typeof err === "string" ? err : null)]
    });
  }
}
