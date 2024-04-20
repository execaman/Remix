import Discord from "discord.js";
import type Remix from "../../client.mjs";
import type { IUser } from "../../models/user.mjs";
import type { SearchResultVideo } from "distube";
import type { SavedSong } from "../../utility/types.mjs";

type Interaction =
  | Discord.ButtonInteraction<"cached">
  | Discord.ChatInputCommandInteraction<"cached">;

type CollectorInteraction = (
  | Discord.ButtonInteraction<"cached">
  | Discord.StringSelectMenuInteraction<"cached">
) & { client: Remix };

type MusicRequestInteraction = Interaction & { client: Remix };

type InteractionMode = "add" | "play" | "remove";

export default class MusicRequest {
  interaction: MusicRequestInteraction = null!;
  data: IUser = null!;

  collector: Discord.InteractionCollector<
    Discord.ButtonInteraction<"cached"> | Discord.StringSelectMenuInteraction<"cached">
  > = null!;

  search?: SearchResultVideo[];

  constructor(interaction: Interaction, data: IUser) {
    this.interaction = interaction as MusicRequestInteraction;
    this.data = data;
  }

  async destroy(internal = false) {
    this.collector.removeAllListeners();

    if (!this.collector.ended) {
      this.collector.stop();
    }

    (this.data as any) = null;
    (this.search as any) = null;

    try {
      if (!internal) {
        await this.interaction.deleteReply();
      } else {
        await this.interaction.editReply({
          embeds: [this.interaction.client.errorEmbed("Interaction timed out")],
          components: []
        });
      }
    } catch {}

    this.interaction.client.sessions.delete(this.interaction.user.id);
    (this.interaction as any) = null;
  }

  async init(songExisted?: boolean) {
    const messageBody: Discord.InteractionEditReplyOptions = {};

    if (typeof songExisted === "boolean") {
      messageBody.embeds = [
        new Discord.EmbedBuilder()
          .setColor(Discord.Colors.Yellow)
          .setTitle(
            songExisted ? "This song exists in your playlist" : "Song saved to your playlist"
          )
      ];

      messageBody.components = [this.userSongOptions()];
    } else {
      messageBody.components = [this.userSelectMenu(), this.userSelectButtons()];
    }

    const message = await this.interaction.editReply(messageBody);

    this.collector = message.createMessageComponentCollector<
      Discord.ComponentType.Button | Discord.ComponentType.StringSelect
    >({
      dispose: true,
      idle: this.interaction.client.util.time.ms("02:00")
    });

    this.collector.once("end", async () => {
      await this.destroy(true);
    });

    this.collector.on("collect", async (i) => {
      await this.handleRequest(i as CollectorInteraction);
    });
  }

  async handleRequest(interaction: CollectorInteraction) {
    const mode = interaction.customId.split("_").pop() as InteractionMode | "song" | "manage";

    if (interaction.isButton()) {
      if (mode === "song") {
        await interaction.deferUpdate();

        const song = this.data.songs.pop() as SavedSong;

        try {
          await this.data.save();
        } catch {
          this.data.songs.push(song);
          await interaction.followUp({
            ephemeral: true,
            embeds: [interaction.client.errorEmbed()]
          });
          return;
        }

        await interaction.editReply({
          embeds: [],
          components: [this.userSelectMenu(), this.userSelectButtons()]
        });

        await interaction.followUp({
          ephemeral: true,
          embeds: [
            new Discord.EmbedBuilder()
              .setColor(Discord.Colors.Yellow)
              .setTitle("Song was removed from your playlist")
          ]
        });
      } else if (mode === "manage") {
        await interaction.update({
          embeds: [],
          components: [this.userSelectMenu(), this.userSelectButtons()]
        });
      } else if (mode === "add") {
        if (this.data.songs.length === 25) {
          await interaction.reply({
            embeds: [
              interaction.client.errorEmbed("Your playlist has reached the max limit of 25 songs")
            ]
          });
          return;
        }

        await interaction.showModal(this.userSearchModal());

        try {
          const modal = await interaction.awaitModalSubmit({
            time: interaction.client.util.time.ms("01:00")
          });

          await modal.deferUpdate();

          const query = modal.fields.getTextInputValue("query");

          try {
            this.search = await interaction.client.player.search(query, {
              limit: 10
            });
          } catch {
            await interaction.followUp({
              ephemeral: true,
              embeds: [interaction.client.errorEmbed()]
            });
            return;
          }

          await modal.editReply({
            components: [this.userSelectMenu("add"), this.userSelectButtons("add")]
          });
        } catch {
          await interaction.followUp({
            ephemeral: true,
            embeds: [interaction.client.errorEmbed("Interaction timed out")]
          });
        }
      } else {
        await interaction.update({
          components: [this.userSelectMenu(mode), this.userSelectButtons(mode)]
        });
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      const indices = interaction.values.map(Number);
      if (mode === "add") {
        await interaction.deferUpdate();

        const songs = indices.map((index) =>
          this.interaction.client.util.formatSong(this.search![index])
        );
        this.data.songs.push(...songs);

        try {
          await this.data.save();
        } catch {
          this.data.songs.splice(-1 * songs.length);
          await interaction.followUp({
            ephemeral: true,
            embeds: [interaction.client.errorEmbed()]
          });
          return;
        }

        await interaction.editReply({
          components: [this.userSelectMenu(), this.userSelectButtons()]
        });
      } else if (mode === "play") {
        await interaction.deferReply({ ephemeral: true });

        const queue = interaction.client.player.getQueue(interaction.guildId);

        if (
          !interaction.member.voice.channel ||
          (queue && queue.voice.channelId !== interaction.member.voice.channelId)
        ) {
          await interaction.editReply({
            embeds: [
              interaction.client.errorEmbed(
                `You must be in ${!interaction.member.voice.channel ? "a" : "my"} voice channel`
              )
            ]
          });
          return;
        }

        const songs = indices.map((index) => this.data.songs[index].url);

        try {
          const source =
            songs.length === 1 ?
              songs[0]
            : await interaction.client.player.createCustomPlaylist(songs, {
                member: interaction.member,
                properties: {
                  name: `${interaction.member.displayName}'s Playlist`.slice(-97)
                },
                parallel: true
              });

          await interaction.client.player.play(interaction.member.voice.channel, source, {
            member: interaction.member,
            textChannel:
              queue ? queue.textChannel! : interaction.channel || interaction.member.voice.channel
          });

          await interaction.deleteReply();
        } catch {
          await interaction.editReply({
            embeds: [interaction.client.errorEmbed()]
          });
        }
      } else if (mode === "remove") {
        await interaction.deferUpdate();

        const songs = this.data.songs;
        const positions = indices.sort((a, b) => b - a);

        for (const position of positions) {
          this.data.songs.splice(position, 1);
        }

        try {
          await this.data.save();
        } catch {
          this.data.songs = songs;
          await interaction.followUp({
            ephemeral: true,
            embeds: [interaction.client.errorEmbed()]
          });
          return;
        }

        await interaction.editReply({
          components: [this.userSelectMenu("remove"), this.userSelectButtons("remove")]
        });
      }
      return;
    }
  }

  createMenuOptions(songs: SearchResultVideo[] | SavedSong[]) {
    return songs.map((song, index) =>
      new Discord.StringSelectMenuOptionBuilder()
        .setEmoji(this.interaction.client.config.emoji.clock)
        .setLabel(song.name.slice(0, 99))
        .setDescription(
          "description" in song ?
            song.description
          : `Duration: ${song.formattedDuration} | Uploader: ${song.uploader.name?.slice(0, 20).trim() || "Unknown"}`
        )
        .setValue(index.toString())
    );
  }

  userSelectMenu(mode: InteractionMode = "play") {
    const options = this.createMenuOptions(mode === "add" ? this.search! : this.data.songs);

    const menu = new Discord.StringSelectMenuBuilder()
      .setCustomId(this.interaction.user.id.concat(`_menu_${mode}`))
      .setPlaceholder(
        `Select Songs to ${
          mode === "add" ? "Add"
          : mode === "play" ? "Play"
          : "Remove"
        }`
      );

    if (options.length === 0) {
      menu.setOptions(
        new Discord.StringSelectMenuOptionBuilder()
          .setEmoji(this.interaction.client.config.emoji.song)
          .setLabel("Nothing to Select")
          .setValue("nothing_to_select")
          .setDefault(true)
      );
      menu.setDisabled(true);
    } else {
      menu.setOptions(options);
      const limit = 25 - this.data.songs.length;
      menu.setMaxValues(mode === "add" && limit < options.length ? limit : options.length);
    }

    return new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>().setComponents(menu);
  }

  userSelectButtons(mode: InteractionMode = "play") {
    return new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_button_add"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Add")
        .setDisabled(this.data.songs.length === 25),

      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_button_play"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Play")
        .setDisabled(mode === "play" || this.data.songs.length === 0),

      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_button_remove"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Remove")
        .setDisabled(mode === "remove" || this.data.songs.length === 0)
    );
  }

  userSearchModal() {
    return new Discord.ModalBuilder()
      .setCustomId(this.interaction.user.id.concat("_search"))
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

  userSongOptions() {
    return new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_song"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Remove"),

      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_manage"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Manage Playlist")
    );
  }
}
