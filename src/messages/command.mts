import Discord from "discord.js";
import type Remix from "../client.mjs";
import type { TextCommand } from "../client.mjs";
import type { IGuild } from "../models/guild.mjs";
import type { Message, Permissions, Subcommand } from "../utility/types.mjs";

export default async (client: Remix, message: Message) => {
  const mention = client.mention;
  let prefix = client.commands.prefix.get(message.guildId);

  if (typeof prefix !== "string") {
    const guild = await client.db
      .model<IGuild>("guild")
      .findOne({ id: message.guildId });

    if (typeof guild?.prefix === "string") {
      client.commands.prefix.set(message.guildId, guild.prefix);
    }

    prefix = guild?.prefix || client.config.prefix;
  }

  if (
    !message.content.startsWith(prefix) &&
    !message.content.startsWith(mention)
  ) {
    return;
  }

  const args = message.content
    .slice(message.content.startsWith(prefix) ? prefix.length : mention.length)
    .trim()
    .split(/\s+/g);

  let command: string | TextCommand | undefined = args.shift();
  if (!command) {
    return;
  }

  command = client.commands.text.get(
    client.commands.aliases.has(command) ?
      (client.commands.aliases.get(command) as string)
    : command
  );

  if (
    !command ||
    (command.data.owner && !client.config.owners.has(message.author.id))
  ) {
    return;
  }

  if ("permissions" in command.data || "subcommands" in command.data) {
    const getPerms = async (id: string) => {
      const channel = message.channel.permissionsFor(id);
      const { permissions } = await message.guild.members.fetch(id);
      return !channel ? permissions : permissions.add(channel);
    };

    const permissions = {
      client: await getPerms(client.user.id),
      member: await getPerms(message.author.id)
    };

    const noPerms = async (note: string, perms: string) => {
      if (!message.repliable) {
        return;
      }
      await message.reply({
        embeds: [
          new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Red)
            .setTitle(`${client.config.emoji.warn} Something went wrong`)
            .setDescription(`${note}\n${Discord.codeBlock(perms)}`)
        ]
      });
    };

    const checkPerms = async (perms: Permissions) => {
      if (perms.client) {
        const missing = permissions.client.missing(perms.client);
        if (missing.length !== 0) {
          await noPerms(
            "I don't have the following permissions:",
            missing.join()
          );
          return false;
        }
      }
      if (perms.member) {
        const missing = permissions.member.missing(perms.member);
        if (missing.length !== 0) {
          await noPerms(
            "You don't have the following permissions:",
            missing.join()
          );
          return false;
        }
      }
      return true;
    };

    if ("permissions" in command.data) {
      const allowed = await checkPerms(command.data.permissions);
      if (!allowed) {
        return;
      }
    }

    if ("subcommands" in command.data && args.length !== 0) {
      const checkSubcommands = async (
        subcommands: Subcommand[],
        argList: string[]
      ): Promise<undefined> => {
        if (argList.length === 0) {
          return;
        }

        const arg = argList.shift() as string;
        const subcommand = subcommands.find(
          (i) => i.name === arg || i.aliases?.includes(arg)
        );
        if (!subcommand) {
          return;
        }

        if ("permissions" in subcommand) {
          const allowed = await checkPerms(subcommand.permissions);
          if (!allowed) {
            throw null;
          }
        }

        if (argList.length !== 0 && "subcommands" in subcommand) {
          return checkSubcommands(subcommand.subcommands, argList);
        }
      };
      try {
        await checkSubcommands(command.data.subcommands, args.slice(0));
      } catch {
        return;
      }
    }
  }

  try {
    await command.execute(client, message, args);
  } catch (err) {
    if (err instanceof Error) {
      client.emit(Discord.Events.Error, err);
    }
  }
};
