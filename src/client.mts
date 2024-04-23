import Discord from "discord.js";
import mongoose from "mongoose";
import TextCommandBuilder from "./modules/classes/builder.mjs";
import { DisTube, Events, RepeatMode } from "distube";
import { YtDlpPlugin } from "@distube/yt-dlp";
import { SpotifyPlugin } from "@distube/spotify";
import { DeezerPlugin } from "@distube/deezer";
import { SoundCloudPlugin } from "@distube/soundcloud";
import { clearTimeout } from "node:timers";
import { readFile, readdir, stat } from "node:fs/promises";
import * as helper from "./utility/helper.mjs";
import * as config from "./utility/config.mjs";
import type { Message, Queue, Subcommand } from "./utility/types.mjs";
import type LyricRequest from "./modules/classes/lyric.mjs";
import type MusicRequest from "./modules/classes/music.mjs";
import type { Cookie } from "@distube/ytdl-core";

type Interaction = (client: Remix, interaction: Discord.Interaction<"cached">) => Promise<void>;

export interface SlashCommand {
  data: Discord.RESTPostAPIApplicationCommandsJSONBody;
  owner?: boolean;
  category: string;
  execute: Interaction;
  autocomplete?: Interaction;
}

type Module = (client: Remix, message: Message, args?: string[]) => Promise<void>;

export interface TextCommand {
  data: Subcommand;
  category: string;
  execute: Module;
}

export default class Remix extends Discord.Client<true> {
  db = mongoose;
  util = helper;
  config = config;

  commands = {
    slash: new Discord.Collection<string, SlashCommand>(),
    text: new Discord.Collection<string, TextCommand>(),
    aliases: new Map<string, string>(),
    prefix: new Map<string, string>()
  };

  modules = new Discord.Collection<string, Module>();
  interactions = new Discord.Collection<string, Interaction>();

  player: DisTube = null!;
  sessions = new Map<string, LyricRequest | MusicRequest>();

  constructor(options: Discord.ClientOptions) {
    super(options);
  }

  get mention() {
    return this.user.toString();
  }

  canSendMessageIn(
    channel?: Discord.GuildTextBasedChannel
  ): channel is Discord.GuildTextBasedChannel {
    return !!channel
      ?.permissionsFor(this.user.id, false)
      ?.has(Discord.PermissionFlagsBits.SendMessages);
  }

  errorEmbed(description?: string) {
    return new Discord.EmbedBuilder()
      .setColor(Discord.Colors.Red)
      .setTitle(`${this.config.emoji.warn} Something went wrong`)
      .setDescription(Discord.codeBlock(description || "An unexpected error occurred"));
  }

  introEmbed(message: Discord.Message<true>) {
    return new Discord.EmbedBuilder()
      .setColor(Discord.Colors.Yellow)
      .setAuthor({
        name: this.user.username,
        iconURL: this.user.displayAvatarURL()
      })
      .setThumbnail(
        message.member?.displayAvatarURL() ||
          message.author.displayAvatarURL() ||
          message.guild.iconURL()
      )
      .setDescription(
        Discord.codeBlock(
          `${this.config.emoji.wave} Hello there, I'm ${this.user.username}\n A music addict at your service 24/7 `
        )
      );
  }

  introComponents() {
    return new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
      new Discord.ButtonBuilder()
        .setCustomId("message_help")
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Help"),

      new Discord.ButtonBuilder()
        .setCustomId("message_playlist")
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Open Playlist"),

      new Discord.ButtonBuilder()
        .setCustomId("message_play")
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Search and start playing!")
    );
  }

  playerSearchModal() {
    return new Discord.ModalBuilder()
      .setCustomId("player_search")
      .setTitle("Search")
      .setComponents(
        new Discord.ActionRowBuilder<Discord.TextInputBuilder>().setComponents(
          new Discord.TextInputBuilder()
            .setCustomId("query")
            .setStyle(Discord.TextInputStyle.Short)
            .setLabel("Query")
            .setPlaceholder("Enter name or url")
            .setRequired(true)
        )
      );
  }

  repeatModeLabel(repeatMode: RepeatMode, autoplay: boolean) {
    return (
      repeatMode === RepeatMode.SONG ? "Song"
      : repeatMode === RepeatMode.QUEUE ? "Queue"
      : autoplay ? "Auto"
      : "Normal"
    );
  }

  #playerFields(queue: Queue) {
    return [
      {
        name: `${
          queue.paused ? this.config.emoji.pause
          : queue.repeatMode === RepeatMode.SONG ? this.config.emoji.repeatOne
          : queue.repeatMode === RepeatMode.QUEUE ? this.config.emoji.repeatTwo
          : queue.autoplay ? this.config.emoji.autoplay
          : this.config.emoji.record
        } Queue [${queue.songs.length}]`,

        value: Discord.codeBlock(
          queue.paused ? "Paused" : this.repeatModeLabel(queue.repeatMode, queue.autoplay)
        ),
        inline: true
      },

      {
        name: `${this.config.emoji.volume} Volume [${queue.volume}]`,
        value: Discord.codeBlock(
          queue.volume <= 50 ? "Low"
          : queue.volume <= 100 ? "Normal"
          : "High"
        ),
        inline: true
      },

      {
        name: `${this.config.emoji.clock} Duration [${queue.songs[0].formattedDuration}]`,
        value: Discord.codeBlock(this.util.time.formatDuration(queue.currentTime)),
        inline: true
      }
    ];
  }

  playerEmbed(queue: Queue) {
    const song = queue.songs[0];

    return new Discord.EmbedBuilder()
      .setColor(Discord.Colors.Yellow)

      .setAuthor({
        name: `Requested by ${song.member?.displayName || song.user?.displayName || "Anonymous User"}`.slice(
          0,
          99
        ),
        iconURL:
          song.member?.displayAvatarURL() ||
          song.user?.displayAvatarURL() ||
          this.user.displayAvatarURL()
      })

      .setTitle(
        typeof song.name === "string" ?
          song.name.length >= 40 ?
            song.name.slice(0, 40).concat("..")
          : song.name.concat(String.fromCharCode(10240).repeat(40 - song.name.length))
        : "Untitled Song"
      )
      .setURL(song.url)

      .setFields(this.#playerFields(queue))
      .setFooter({
        text: queue.lastAction.text.slice(-99),
        iconURL: queue.lastAction.icon
      })
      .setTimestamp(queue.lastAction.time);
  }

  playerComponents(queue: Queue) {
    const song = queue.songs[0];
    const sessionId = queue.voice.voiceState?.sessionId;

    return [
      new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
        new Discord.ButtonBuilder()
          .setCustomId(`player_rewind_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.reverse)
          .setDisabled(queue.currentTime <= 10),

        new Discord.ButtonBuilder()
          .setCustomId(`player_play_pause_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(queue.paused ? this.config.emoji.play : this.config.emoji.pause),

        new Discord.ButtonBuilder()
          .setCustomId(`player_forward_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.forward)
          .setDisabled(song.duration - queue.currentTime <= 10),

        new Discord.ButtonBuilder()
          .setCustomId(`player_volume_up_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.volumeUp)
          .setDisabled(queue.volume >= 150),

        new Discord.ButtonBuilder()
          .setCustomId(`player_song_options_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.song)
      ),

      new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
        new Discord.ButtonBuilder()
          .setCustomId(`player_previous_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.previous)
          .setDisabled(queue.previousSongs.length === 0),

        new Discord.ButtonBuilder()
          .setCustomId(`player_stop_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.stop),

        new Discord.ButtonBuilder()
          .setCustomId(`player_next_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.next)
          .setDisabled(!queue.autoplay && queue.songs.length <= 1),

        new Discord.ButtonBuilder()
          .setCustomId(`player_volume_down_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.volumeDown)
          .setDisabled(queue.volume <= 10),

        new Discord.ButtonBuilder()
          .setCustomId(`player_queue_options_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.queue)
      )
    ];
  }

  playerSongOptions(queue: Queue) {
    const song = queue.songs[0];
    const sessionId = queue.voice.voiceState?.sessionId;

    return new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
      new Discord.ButtonBuilder()
        .setCustomId(`song_seek_${sessionId}`)
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Seek")
        .setDisabled(song.isLive),

      new Discord.ButtonBuilder()
        .setCustomId(`song_volume_${sessionId}`)
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Volume"),

      new Discord.ButtonBuilder()
        .setCustomId(`song_lyrics_${sessionId}`)
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Lyrics")
        .setDisabled(typeof song.name !== "string"),

      new Discord.ButtonBuilder()
        .setCustomId(`song_save_${sessionId}`)
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Save")
        .setDisabled(typeof song.name !== "string")
    );
  }

  playerQueueOptions(queue: Queue) {
    const sessionId = queue.voice.voiceState?.sessionId;

    return new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
      new Discord.ButtonBuilder()
        .setCustomId(`queue_repeat_${sessionId}`)
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel(this.repeatModeLabel(queue.repeatMode, queue.autoplay)),

      new Discord.ButtonBuilder()
        .setCustomId(`queue_shuffle_${sessionId}`)
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Shuffle"),

      new Discord.ButtonBuilder()
        .setCustomId(`queue_filters_${sessionId}`)
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Filters"),

      new Discord.ButtonBuilder()
        .setCustomId(`queue_menu_${sessionId}`)
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Menu")
    );
  }

  playerQueueFilters(queue: Queue) {
    const sessionId = queue.voice.voiceState?.sessionId;
    const current = queue.filters.names;

    const options = this.util.filters
      .slice(0, 100)
      .reduce<Discord.StringSelectMenuOptionBuilder[][]>((total, filter, index) => {
        const filterName = filter[0].slice(0, 100).trim();
        const filterDescription = filter[2]?.slice(0, 100).trim();

        const option = new Discord.StringSelectMenuOptionBuilder()
          .setEmoji(this.config.emoji.clock)
          .setLabel(filterName)
          .setValue(filterName)
          .setDefault(current.includes(filterName));

        if (typeof filterDescription === "string") {
          option.setDescription(filterDescription);
        }

        if (index % 25 === 0) {
          total.push([option]);
        } else {
          total.at(-1)!.push(option);
        }

        return total;
      }, []);

    const components: (
      | Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>
      | Discord.ActionRowBuilder<Discord.ButtonBuilder>
    )[] = options.map((option, index) =>
      new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>().setComponents(
        new Discord.StringSelectMenuBuilder()
          .setCustomId(`queue_filters_${index}_${sessionId}`)
          .setPlaceholder(`Filters ${index + 1}`)
          .setOptions(option)
          .setMinValues(0)
          .setMaxValues(option.length)
      )
    );

    components.push(
      new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
        new Discord.ButtonBuilder()
          .setCustomId(`queue_filters_clear_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Clear all selected filters")
          .setDisabled(current.length === 0)
      )
    );

    return components;
  }

  playerQueueMenu(
    queue: Queue,
    state: "previous" | "current" | "related" = "current",
    action: "add" | "move" | "remove" = "move",
    position = 1
  ) {
    const sessionId = queue.voice.voiceState?.sessionId;

    const [previous, current, related] = [
      state === "previous",
      state === "current",
      state === "related"
    ];

    const stateText = state[0].toUpperCase().concat(state.slice(1));

    const [add, move, remove] = [action === "add", action === "move", action === "remove"];

    const lastPage =
      previous ? Math.ceil((queue.previousSongs.length || 1) / 25)
      : current ? Math.ceil((queue.songs.length || 1) / 25)
      : 1;

    const page =
      position > lastPage ? lastPage
      : position < 1 ? 1
      : position;

    const size = page * 25;

    const songs =
      previous ? queue.previousSongs.slice(size - 25, size)
      : current ? queue.songs.slice(size - 25, size)
      : queue.songs[0].related.slice(0, 25);

    if (current && page === 1) {
      songs.shift();
    }

    let embedDescription = "";

    const options = songs.map((song, index) => {
      const item = this.util.formatSong(song, Math.floor(Math.random() * 5) + 50);
      const itemIndex = size - 25 + index;

      embedDescription += `${this.config.emoji.song}${String.fromCharCode(10240)}${Discord.hyperlink(item.name.replace(/[\[\]\(\)]/g, ""), song.url)}\n`;

      return new Discord.StringSelectMenuOptionBuilder()
        .setEmoji(this.config.emoji.clock)
        .setLabel(item.name)
        .setDescription(item.description)
        .setValue((current ? itemIndex + 1 : itemIndex).toString());
    });

    const menu = new Discord.StringSelectMenuBuilder()
      .setCustomId(`queue_menu_${state}_${action}_${page}_${sessionId}`)
      .setPlaceholder(
        related ? "Add Related Songs to the Queue"
        : move ? `Move ${stateText} Songs up the Queue`
        : `Remove ${stateText} Songs from the Queue`
      );

    if (options.length === 0) {
      menu.setOptions(
        new Discord.StringSelectMenuOptionBuilder()
          .setEmoji(this.config.emoji.song)
          .setLabel("Nothing to Select")
          .setValue("nothing_to_select")
          .setDefault(true)
      );
      menu.setDisabled(true);
    } else {
      menu.setOptions(options);
      menu.setMaxValues(options.length);
    }

    const [disablePrevious, disableNext] = [page === 1, page === lastPage];

    const components = [
      new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>().setComponents(menu),

      new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
        new Discord.ButtonBuilder()
          .setCustomId(`queue_menu_${state}_${action}_01_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.previous)
          .setDisabled(disablePrevious),

        new Discord.ButtonBuilder()
          .setCustomId(`queue_menu_${state}_${action}_${page - 1}_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.reverse)
          .setDisabled(disablePrevious),

        new Discord.ButtonBuilder()
          .setCustomId(`queue_menu_${state}_${action}_-1_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel(`${stateText} Songs`),

        new Discord.ButtonBuilder()
          .setCustomId(`queue_menu_${state}_${action}_${page + 1}_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.forward)
          .setDisabled(disableNext),

        new Discord.ButtonBuilder()
          .setCustomId(`queue_menu_${state}_${action}_00${lastPage}_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setEmoji(this.config.emoji.next)
          .setDisabled(disableNext)
      ),

      new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
        new Discord.ButtonBuilder()
          .setCustomId(`queue_menu_${state}_jump_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Skip")
          .setDisabled(state !== "current"),

        new Discord.ButtonBuilder()
          .setCustomId(`queue_menu_${state}_add_000${page}_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Add"),

        new Discord.ButtonBuilder()
          .setCustomId(`queue_menu_${state}_move_000${page}_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Move Songs up the Queue")
          .setDisabled(move || related),

        new Discord.ButtonBuilder()
          .setCustomId(`queue_menu_${state}_remove_000${page}_${sessionId}`)
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Remove")
          .setDisabled(remove || related)
      )
    ];

    const messageBody: {
      ephemeral: boolean;
      embeds: Discord.EmbedBuilder[];
      components: typeof components;
    } = {
      ephemeral: true,
      embeds: [],
      components: components
    };

    if (embedDescription.length !== 0) {
      messageBody.embeds.push(
        new Discord.EmbedBuilder().setColor(Discord.Colors.Yellow).setDescription(embedDescription)
      );
    }

    return messageBody;
  }

  playerAlertEmbed({
    icon,
    title,
    description,
    color = Discord.Colors.Yellow
  }: {
    icon: string;
    title: string;
    description: string;
    color?: Discord.ColorResolvable;
  }) {
    return new Discord.EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: title,
        iconURL: icon
      })
      .setDescription(Discord.codeBlock(description));
  }

  async handlePlayer(client: Remix, queueId: string) {
    const queue = client.player.getQueue(queueId) as Queue | undefined;

    if (!queue || !queue.playerMessage) {
      return;
    }

    if (queue.paused) {
      queue.editTimer!.refresh();
      return;
    }

    if (queue.editCount! * 10 >= 3600) {
      try {
        try {
          queue.editCount = 0;
          await queue.playerMessage.delete();
        } catch {}

        queue.playerMessage = await queue.playerMessage.channel.send({
          embeds: [client.playerEmbed(queue)],
          components: client.playerComponents(queue)
        });

        queue.editTimer!.refresh();
      } catch {
        clearTimeout(queue.editTimer);
      }
    } else {
      try {
        const player = {
          embeds: [client.playerEmbed(queue)],
          components: client.playerComponents(queue)
        };

        try {
          queue.playerMessage = await queue.playerMessage.edit(player);
          queue.editCount! += 1;
        } catch {
          queue.editCount = 0;
          queue.playerMessage = await queue.playerMessage.channel.send(player);
        }

        queue.editTimer!.refresh();
      } catch {
        clearTimeout(queue.editTimer);
      }
    }
  }

  async stream() {
    const cookie = await readFile("../cookie.json", "utf-8");

    this.player = new DisTube(this, {
      emitAddListWhenCreatingQueue: false,
      emitAddSongWhenCreatingQueue: false,
      plugins: [
        new YtDlpPlugin(),
        new SpotifyPlugin(config.spotifyOptions),
        new DeezerPlugin(),
        new SoundCloudPlugin(config.soundCloudOptions)
      ],
      youtubeCookie: JSON.parse(cookie) as Cookie[]
    });

    (this.player as any).filters = Object.fromEntries(this.util.filters);

    const loadAssets = async (
      path: string,
      setAsset: (path: string, ...args: any[]) => Promise<void>,
      ...args: any[]
    ) => {
      const items = await readdir(path);

      for (const item of items) {
        const dir = `${path}/${item}`;
        const dirStats = await stat(dir);

        if (dirStats.isDirectory()) {
          await loadAssets(dir, setAsset, ...args);
        } else if (item.endsWith("js") && dirStats.isFile()) {
          await setAsset(dir, ...args);
        }
      }
    };

    const nameFromPath = (path: string) => path.split("/").pop()!.split(".")[0] as string;

    const checkConflict = (
      type: "model" | "slash" | "text" | "alias" | "module" | "interaction",
      name: string,
      path: string
    ) => {
      if (type === "model" && this.db.modelNames().includes(name)) {
        throw new Error("Model name taken", { cause: name });
      }

      if (type === "slash" && this.commands.slash.has(name)) {
        throw new Error("Slash command name taken", { cause: name });
      }

      if (type === "module" && this.modules.has(name)) {
        throw new Error("Module name taken", { cause: name });
      }

      if (type === "interaction" && this.interactions.has(name)) {
        throw new Error("Interaction already registered", { cause: name });
      }

      if (["text", "alias"].includes(type)) {
        if (this.commands.text.has(name)) {
          throw new Error(
            type === "text" ? `Text command name taken` : (
              `Alias identical to name of another command`
            ),
            {
              cause: {
                name: name,
                path: path
              }
            }
          );
        }

        if (this.commands.aliases.has(name)) {
          throw new Error(
            type === "text" ?
              `Text command name identical to alias of another command`
            : `Alias taken`,
            {
              cause: {
                name: name,
                path: path,
                command: this.commands.aliases.get(name)
              }
            }
          );
        }
      }
    };

    const setModel = async (path: string) => {
      const schema = (await import(path)).default as mongoose.Schema;

      if (!(schema instanceof this.db.Schema)) {
        throw new Error("Model does not default export a valid schema", {
          cause: path
        });
      }

      const modelName = nameFromPath(path);
      checkConflict("model", modelName, path);

      this.db.model(modelName, schema);
    };

    await loadAssets("./models", setModel);

    const setEvent = async (path: string, emitter: string) => {
      const event = (await import(path)).default as (
        client: Remix,
        ...args: unknown[]
      ) => Promise<void>;

      if (typeof event !== "function") {
        throw new TypeError("Event does not default export a function", {
          cause: path
        });
      }

      const type = path.match(new RegExp(`(?<=${emitter}/)(on|once)(?=/)`))?.[0];

      if (typeof type !== "string") {
        throw new Error(`Emitter is missing 'on', 'once' folders at root`);
      }

      const eventName = nameFromPath(path);

      if (emitter === "client") {
        (this as any)[type]((Discord.Events as any)[eventName], event.bind(null, this));
      } else if (emitter === "player") {
        (this.player as any)[type]((Events as any)[eventName], event.bind(null, this));
      }
    };

    await loadAssets("./player", setEvent, "player");
    await loadAssets("./client", setEvent, "client");

    const setCommand = async (path: string) => {
      const command = Object.assign<{}, SlashCommand | TextCommand>(
        Object.create(null),
        await import(path)
      );

      if (command.execute?.constructor?.name !== "AsyncFunction") {
        throw new Error("There must be an async 'execute' function in command", { cause: path });
      }

      let category = path.split("/").slice(-2, -1)[0];

      command.category = category || "Miscellaneous";

      if (command.data instanceof Discord.SlashCommandBuilder) {
        command.data = command.data.toJSON();
        checkConflict("slash", command.data.name, path);

        if (
          "autocomplete" in command &&
          command.autocomplete?.constructor?.name !== "AsyncFunction"
        ) {
          throw new Error("Command 'autocomplete' function must be asynchronous", { cause: path });
        }

        this.commands.slash.set(command.data.name, command as SlashCommand);
      } else if (command.data instanceof TextCommandBuilder) {
        command.data = command.data.toJSON();
        checkConflict("text", command.data.name, path);

        if (Array.isArray(command.data.aliases)) {
          for (const alias of command.data.aliases) {
            checkConflict("alias", alias, path);
            this.commands.aliases.set(alias, command.data.name);
          }
        }

        this.commands.text.set(command.data.name, command as TextCommand);
      } else {
        throw new Error("Invalid command data", { cause: path });
      }
    };

    await loadAssets("./commands", setCommand);

    const setIntermediary = async (path: string, type: "module" | "interaction") => {
      const intermediary = (await import(path)).default as Module | Interaction;

      if (intermediary?.constructor?.name !== "AsyncFunction") {
        throw new TypeError("Intermediary does not default export an async function", {
          cause: path
        });
      }

      const intermediaryName = nameFromPath(path);
      checkConflict(type, intermediaryName, path);

      if (type === "module") {
        this.modules.set(intermediaryName, intermediary as Module);
      } else if (type === "interaction") {
        this.interactions.set(intermediaryName, intermediary as Interaction);
      }
    };

    await loadAssets("./messages", setIntermediary, "module");
    await loadAssets("./interactions", setIntermediary, "interaction");

    await this.db.connect(this.config.db);
    await this.login(this.config.token);
  }
}
