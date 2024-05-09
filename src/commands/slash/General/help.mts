import Discord from "discord.js";
import type Remix from "../../../client.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("help")
  .setDescription("learn more about available commands")
  .addStringOption((category) =>
    category.setName("category").setDescription("available categories").setAutocomplete(true)
  )
  .addStringOption((command) =>
    command.setName("command").setDescription("available commands").setAutocomplete(true)
  )
  .addBooleanOption((ephemeral) =>
    ephemeral
      .setName("ephemeral")
      .setDescription("whether the response should be visible to you only")
  );

export async function autocomplete(
  client: Remix,
  interaction: Discord.AutocompleteInteraction<"cached">
) {
  const option = interaction.options.getFocused(true);
  let options: Discord.ApplicationCommandOptionChoiceData[] = [];

  const query = option.value.toLowerCase();

  if (option.name === "category") {
    const categories = client.commands.slash.reduce<string[]>((total, command) => {
      if (!total.includes(command.category) && command.category.toLowerCase().includes(query)) {
        total.push(command.category);
      }
      return total;
    }, []);

    options = categories.map((category) => ({
      name: category,
      value: category
    }));
  } else if (option.name === "command") {
    const category = interaction.options.getString("category") || "";

    client.commands.slash.forEach((command) => {
      if (
        command.category.toLowerCase().includes(category) &&
        command.data.name.toLowerCase().includes(query)
      ) {
        options.push({
          name: command.data.name,
          value: command.data.name
        });
      }
    });
  }

  await interaction.respond(options);
}

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  const options = {
    category: interaction.options.getString("category"),
    command: interaction.options.getString("command"),
    ephemeral: interaction.options.getBoolean("ephemeral")
  };

  await interaction.deferReply({
    ephemeral: typeof options.ephemeral === "boolean" ? options.ephemeral : true
  });

  if (typeof options.command === "string") {
    const command = client.commands.slash.get(options.command);

    if (command) {
      await interaction.editReply({
        embeds: [
          new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Yellow)
            .setAuthor({
              name: "Slash Command </>",
              iconURL: client.user.displayAvatarURL()
            })
            .setFields([
              {
                name: "Name",
                value: Discord.codeBlock(command.data.name)
              },
              {
                name: "Type",
                value: Discord.codeBlock(
                  command.data.type ?
                    Discord.ApplicationCommandType[command.data.type]
                  : Discord.ApplicationCommandType[Discord.ApplicationCommandType.ChatInput]
                ),
                inline: true
              },
              {
                name: "Autocomplete",
                value: Discord.codeBlock(command.autocomplete ? "Yes" : "No"),
                inline: true
              },
              {
                name: "Category",
                value: Discord.codeBlock(command.category)
              },
              {
                name: "Description",
                value: Discord.codeBlock(command.data.description)
              }
            ])
        ]
      });
      return;
    }

    const query = options.command.toLowerCase();

    const commands = client.commands.slash.reduce<string[]>((total, command) => {
      if (command.data.name.toLowerCase().includes(query)) {
        total.push(
          `${Discord.bold(command.data.name)} | ${command.data.description.slice(0, 25).trim().concat("..")}`
        );
      }
      return total;
    }, []);

    if (commands.length === 0) {
      await interaction.editReply({
        embeds: [client.errorEmbed("No commands found for given name")]
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        new Discord.EmbedBuilder()
          .setColor(Discord.Colors.Yellow)
          .setAuthor({
            name: "Slash Command </>",
            iconURL: client.user.displayAvatarURL()
          })
          .setDescription("No commands found for given name")
          .setFields({
            name: "Did you mean:",
            value: commands.join("\n")
          })
      ]
    });
    return;
  }

  if (typeof options.category === "string") {
    const query = options.category.toLowerCase();

    const commands = client.commands.slash.reduce<string[]>((total, command) => {
      if (command.category.toLowerCase().includes(query)) {
        total.push(
          `${Discord.bold(command.data.name)} | ${command.data.description.slice(0, 25).trim().concat("..")}`
        );
      }
      return total;
    }, []);

    if (commands.length === 0) {
      await interaction.editReply({
        embeds: [client.errorEmbed("No commands found for given category")]
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        new Discord.EmbedBuilder()
          .setColor(Discord.Colors.Yellow)
          .setAuthor({
            name: `Commands matched by category: '${options.category}'`,
            iconURL: client.user.displayAvatarURL()
          })
          .setDescription(commands.join("\n"))
      ]
    });
    return;
  }

  await interaction.editReply({
    embeds: [client.introEmbed(interaction)],
    components: [client.introComponents()]
  });
}
