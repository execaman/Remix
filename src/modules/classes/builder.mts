import type {
  Permission,
  Permissions,
  Subcommand
} from "../../utility/types.mjs";

export default class TextCommandBuilder implements Subcommand {
  name: string = null!;
  usage?: string;
  owner?: boolean;
  aliases?: string[];
  description?: string;
  permissions?: Permissions;
  subcommands?: Subcommand[];

  constructor() {}

  setName(name: string) {
    if (typeof name !== "string" || name.length === 0) {
      throw new TypeError("Expected a non-empty string");
    }
    this.name = name;
    return this;
  }

  setUsage(usage: string) {
    if (typeof usage !== "string" || usage.length === 0) {
      throw new TypeError("Expected a non-empty string");
    }
    this.usage = usage;
    return this;
  }

  setOwner(owner: boolean) {
    if (typeof owner !== "boolean") {
      throw new TypeError("Expected a boolean value");
    }
    this.owner = owner;
    return this;
  }

  setAliases(...aliases: string[]) {
    if (aliases.length === 0) {
      throw new Error("No alias provided");
    }
    if (
      aliases.some((alias) => typeof alias !== "string" || alias.length === 0)
    ) {
      throw new TypeError("Expected a non-empty string");
    }
    this.aliases = aliases;
    return this;
  }

  setDescription(description: string) {
    if (typeof description !== "string" || description.length === 0) {
      throw new TypeError("Expected a non-empty string");
    }
    this.description = description;
    return this;
  }

  setClientPermissions(...permissions: Permission[]) {
    if (permissions.length === 0) {
      throw new Error("No permission provided");
    }
    if (permissions.some((permission) => typeof permission !== "bigint")) {
      throw new TypeError("Expected a bigint value");
    }
    if (this.permissions) {
      this.permissions.client = permissions;
    } else {
      this.permissions = { client: permissions };
    }
    return this;
  }

  setMemberPermissions(...permissions: Permission[]) {
    if (permissions.length === 0) {
      throw new Error("No permission provided");
    }
    if (permissions.some((permission) => typeof permission !== "bigint")) {
      throw new TypeError("Expected a bigint value");
    }
    if (this.permissions) {
      this.permissions.member = permissions;
    } else {
      this.permissions = { member: permissions };
    }
    return this;
  }

  addSubcommand(
    input:
      | TextCommandBuilder
      | ((builder: TextCommandBuilder) => TextCommandBuilder)
  ) {
    let subcommand: Subcommand;

    if (input instanceof TextCommandBuilder) {
      subcommand = input.toJSON();
    } else if (typeof input === "function") {
      const output = input(new TextCommandBuilder());

      if (!(output instanceof TextCommandBuilder)) {
        throw new Error("Input function does not return a builder");
      }

      subcommand = output.toJSON();
    } else {
      throw new Error("Expected builder instance or input function");
    }

    if (Array.isArray(this.subcommands)) {
      this.subcommands.push(subcommand);
    } else {
      this.subcommands = [subcommand];
    }

    return this;
  }

  toJSON() {
    if (typeof this.name !== "string") {
      throw new Error("Command must have a name");
    }

    const command: Subcommand = { name: this.name };
    Reflect.setPrototypeOf(command, null);

    if (typeof this.usage === "string") {
      command.usage = this.usage;
    }
    if (typeof this.owner === "boolean") {
      command.owner = this.owner;
    }
    if (Array.isArray(this.aliases)) {
      command.aliases = this.aliases;
    }

    if (typeof this.description === "string") {
      command.description = this.description;
    }
    if (typeof this.permissions === "object") {
      command.permissions = this.permissions;
    }
    if (Array.isArray(this.subcommands)) {
      command.subcommands = this.subcommands;
    }

    return command;
  }
}
