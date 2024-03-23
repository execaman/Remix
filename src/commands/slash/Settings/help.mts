import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { SlashCommand } from "../../../client.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("help")
  .setDescription("commands help")
  .addStringOption((category) =>
    category
      .setName("category")
      .setDescription("available categories")
      .setAutocomplete(true)
  )
  .addStringOption((command) =>
    command
      .setName("command")
      .setDescription("available commands")
      .setAutocomplete(true)
  );

export async function autocomplete(
  client: Remix,
  interaction: Discord.AutocompleteInteraction<"cached">
) {
  const option = interaction.options.getFocused(true);
  const options: Discord.ApplicationCommandOptionChoiceData[] = [];

  if (option.name === "category") {
    const record = new Set<string>();
    const query = option.value.toLowerCase();

    client.commands.slash.each((command) => {
      if (
        !record.has(command.category) &&
        command.category.toLowerCase().includes(query)
      ) {
        record.add(command.category);

        options.push({
          name: command.category,
          value: command.category
        });
      }
    });
  } else {
    const category = interaction.options.getString("category");

    if (typeof category === "string") {
      const query = category.toLowerCase();

      client.commands.slash.each((command) => {
        if (command.category.toLowerCase().includes(query)) {
          options.push({
            name: command.data.name,
            value: command.data.name
          });
        }
      });
    } else {
      const query = option.value.toLowerCase();

      client.commands.slash.each((command) => {
        if (command.data.name.includes(query)) {
          options.push({
            name: command.data.name,
            value: command.data.name
          });
        }
      });
    }
  }

  await interaction.respond(options.slice(0, 25));
}

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const options = {
    category: interaction.options.getString("category"),
    command: interaction.options.getString("command")
  };

  if (typeof options.command === "string") {
    const command = client.commands.slash.get(options.command);
    if (!command) {
      await interaction.editReply({
        embeds: [client.errorEmbed("Command not found")]
      });
    } else {
      await interaction.editReply({
        embeds: [
          new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Yellow)
            .setAuthor({
              name: "Command </>",
              iconURL: client.user.displayAvatarURL()
            })
            .setFields(
              {
                name: "Name",
                value: Discord.codeBlock(command.data.name)
              },
              {
                name: "Owner",
                value: Discord.codeBlock(command.owner ? "Yes" : "No")
              },
              {
                name: "Description",
                value: Discord.codeBlock(
                  (command.data as any).description || "No description"
                )
              }
            )
        ]
      });
    }
    return;
  }

  if (typeof options.category === "string") {
    const query = options.category.toLowerCase();

    const commands = client.commands.slash
      .reduce<SlashCommand[]>((total, command) => {
        if (command.category.toLowerCase().includes(query)) {
          total.push(command);
        }
        return total;
      }, [])
      .slice(0, 25);

    await interaction.editReply({
      embeds: [
        new Discord.EmbedBuilder()
          .setColor(Discord.Colors.Yellow)
          .setAuthor({
            name: `Commands with category matching '${options.category}'`,
            iconURL: client.user.displayAvatarURL()
          })
          .setDescription(
            commands
              .map(
                (command) =>
                  `${Discord.bold(command.data.name)} | ${(command.data as any).description.slice(0, 25).trim() || "No description"}`
              )
              .join("\n") || "No results found"
          )
      ]
    });
    return;
  }

  const commands = new Map<string, string[]>();

  client.commands.slash.each((command) => {
    if (!commands.has(command.category)) {
      commands.set(command.category, [command.data.name]);
    } else {
      commands.get(command.category)!.push(command.data.name);
    }
  });

  await interaction.editReply({
    embeds: [
      new Discord.EmbedBuilder()
        .setColor(Discord.Colors.Yellow)
        .setAuthor({
          name: "All Commands",
          iconURL: client.user.displayAvatarURL()
        })
        .setFields(
          [...commands.entries()].map((entry) => ({
            name: entry[0],
            value: Discord.codeBlock(entry[1].join(", "))
          }))
        )
    ]
  });
}
