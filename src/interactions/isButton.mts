import Discord from "discord.js";
import { RepeatMode } from "distube";
import type Remix from "../client.mjs";
import type { Queue } from "../utility/types.mjs";
import type { IUser } from "../models/user.mjs";

export default async (
  client: Remix,
  interaction: Discord.ButtonInteraction<"cached">
) => {
  const idParts = interaction.customId.split("_");
  const request = idParts.shift() as string;

  const queue = client.player.getQueue(interaction.guildId) as
    | Queue
    | undefined;

  const sessionId = queue ? (idParts.pop() as string) : null;

  const customId = idParts.join("_");

  if (request === "message") {
    if (customId === "help") {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Yellow)
            .setAuthor({
              name: client.user.username,
              iconURL: client.user.displayAvatarURL()
            })
            .setThumbnail(interaction.member.displayAvatarURL())
            .setTitle("Get Started with these 3 easy steps:")
            .setDescription(`- Mention me to summon this message or the player if active\n- You can always hit the 'Search and start playing!' button\n- Get used to the player controls and slash or text commands\n
          `)
        ]
      });
    } else if (customId === "play") {
      await interaction.showModal(client.playerSearchModal());
    }
    return;
  }

  if (!queue || sessionId !== queue.voice.voiceState?.sessionId) {
    return;
  }

  if (
    !interaction.member.voice.channel ||
    queue.voice.channelId !== interaction.member.voice.channelId
  ) {
    await interaction.reply({
      ephemeral: true,
      embeds: [
        client.errorEmbed(
          `You must be in ${!interaction.member.voice.channel ? "a" : "my"} voice channel`
        )
      ]
    });
    return;
  }

  const lastAction = (text: string) => ({
    icon: interaction.member.displayAvatarURL(),
    text: `${interaction.member.displayName}: ${text}`,
    time: interaction.createdTimestamp
  });

  if (request === "player") {
    if (customId === "rewind" && queue.currentTime >= 10) {
      queue.seek(queue.currentTime - 10);
      queue.lastAction = lastAction(`Duration: Rewind`);
    } else if (customId === "play_pause") {
      if (queue.paused) {
        queue.resume();
      } else {
        queue.pause();
      }
      queue.lastAction = lastAction(
        `${queue.paused ? "Pause" : "Resume"} Player`
      );
    } else if (
      customId === "forward" &&
      queue.currentTime - 10 < queue.songs[0].duration
    ) {
      queue.seek(queue.currentTime + 10);
      queue.lastAction = lastAction(`Duration: Forward`);
    } else if (customId === "volume_up" && queue.volume + 10 <= 150) {
      queue.setVolume(queue.volume + 10);
      queue.lastAction = lastAction(`Volume Up`);
    } else if (customId === "song_options") {
      await interaction.reply({
        ephemeral: true,
        components: [client.playerSongOptions(queue)]
      });
    } else if (customId === "previous" && queue.previousSongs.length > 0) {
      queue.lastAction = lastAction(`Play Previous`);
      if (
        queue.textChannel
          ?.permissionsFor(client.user.id)
          ?.has(Discord.PermissionFlagsBits.SendMessages)
      ) {
        const songName = queue.songs[0].name?.slice(0, 40);
        await queue.textChannel.send({
          embeds: [
            new Discord.EmbedBuilder()
              .setColor(Discord.Colors.Yellow)
              .setAuthor({
                name: queue.lastAction.text,
                iconURL: queue.lastAction.icon
              })
              .setDescription(
                Discord.codeBlock(`Stopping '${songName || "Untitled Track"}'`)
              )
          ]
        });
      }
      await queue.previous();
      return;
    } else if (customId === "stop") {
      await queue.stop();
      return;
    } else if (
      customId === "next" &&
      (queue.autoplay || queue.songs.length > 1)
    ) {
      queue.lastAction = lastAction(`Play Next`);
      if (
        queue.textChannel
          ?.permissionsFor(client.user.id)
          ?.has(Discord.PermissionFlagsBits.SendMessages)
      ) {
        const songName = queue.songs[0].name?.slice(0, 40);
        await queue.textChannel.send({
          embeds: [
            new Discord.EmbedBuilder()
              .setColor(Discord.Colors.Yellow)
              .setAuthor({
                name: queue.lastAction.text,
                iconURL: queue.lastAction.icon
              })
              .setDescription(
                Discord.codeBlock(`Stopping '${songName || "Untitled Track"}'`)
              )
          ]
        });
      }
      await queue.skip();
      return;
    } else if (customId === "volume_down" && queue.volume - 10 >= 10) {
      queue.setVolume(queue.volume - 10);
      queue.lastAction = lastAction(`Volume Down`);
    } else if (customId === "queue_options") {
      await interaction.reply({
        ephemeral: true,
        components: [client.playerQueueOptions(queue)]
      });
    }
    if (!interaction.replied && !interaction.deferred) {
      await interaction.update({
        embeds: [client.playerEmbed(queue)],
        components: client.playerComponents(queue)
      });
    }
    return;
  }

  if (request === "song") {
    if (customId === "seek") {
      const seekModal = new Discord.ModalBuilder()
        .setCustomId(`song_seek_${sessionId}`)
        .setTitle("Seek")
        .setComponents(
          new Discord.ActionRowBuilder<Discord.TextInputBuilder>().setComponents(
            new Discord.TextInputBuilder()
              .setCustomId("seek")
              .setStyle(Discord.TextInputStyle.Short)
              .setLabel("Time")
              .setPlaceholder("Enter time (-30, 03:45, +30, etc)")
              .setMinLength(3)
              .setMaxLength(8)
              .setRequired(true)
          )
        );
      await interaction.showModal(seekModal);
    } else if (customId === "volume") {
      const volumeModal = new Discord.ModalBuilder()
        .setCustomId(`song_volume_${sessionId}`)
        .setTitle("Volume")
        .setComponents(
          new Discord.ActionRowBuilder<Discord.TextInputBuilder>().setComponents(
            new Discord.TextInputBuilder()
              .setCustomId("volume")
              .setStyle(Discord.TextInputStyle.Short)
              .setLabel("Level")
              .setPlaceholder("Enter volume level (10 - 150)")
              .setMinLength(2)
              .setMaxLength(3)
              .setRequired(true)
          )
        );
      await interaction.showModal(volumeModal);
    } else if (customId === "lyrics") {
      await interaction.deferReply({ ephemeral: true });
      if (!queue.lyricData) {
        try {
          const song = queue.songs[0];
          queue.lyricData = await client.util.lyrics.fetch(
            song.name!.slice(0, 25).trim()
          );
          queue.lyricId = song.id as string;
        } catch {
          await interaction.editReply({
            embeds: [client.errorEmbed("Failed to find lyrics for this song")]
          });
          return;
        }
      }
      if (client.sessions.has(interaction.user.id)) {
        await client.sessions.get(interaction.user.id)!.destroy();
      }
      const req = new client.util.lyricRequest(interaction, queue.lyricData);
      client.sessions.set(interaction.user.id, req);
      await req.init();
    } else if (customId === "save") {
      await interaction.deferReply({ ephemeral: true });
      const User = client.db.model<IUser>("user");
      let data = await User.findOne({ id: interaction.user.id });
      if (!data) {
        data = new User({ id: interaction.user.id });
      } else if (data.songs.length === 25) {
        await interaction.editReply({
          embeds: [
            client.errorEmbed(
              "Your playlist has reached the max limit of 25 songs"
            )
          ]
        });
        return;
      }
      const song = queue.songs[0];
      const exists = data.songs.some((i) => i.url === song.url);
      if (!exists) {
        data.songs.push(client.util.formatSong(song));
        try {
          await data.save();
        } catch {
          await interaction.editReply({
            embeds: [client.errorEmbed()]
          });
          return;
        }
      }
      if (client.sessions.has(interaction.user.id)) {
        await client.sessions.get(interaction.user.id)!.destroy();
      }
      const session = new client.util.musicRequest(interaction, data);
      client.sessions.set(interaction.user.id, session);
      await session.init(exists);
    }
    if (!interaction.replied && !interaction.deferred) {
      await interaction.update({
        components: [client.playerSongOptions(queue)]
      });
    }
    return;
  }

  if (request === "queue") {
    if (customId === "repeat") {
      if (queue.autoplay) {
        queue.toggleAutoplay();
      } else if (queue.repeatMode === RepeatMode.DISABLED) {
        queue.setRepeatMode(RepeatMode.SONG);
      } else if (queue.repeatMode === RepeatMode.SONG) {
        queue.setRepeatMode(RepeatMode.QUEUE);
      } else {
        queue.setRepeatMode(RepeatMode.DISABLED);
        queue.toggleAutoplay();
      }
      queue.lastAction = lastAction(
        `Queue Mode: ${client.repeatModeLabel(queue.repeatMode, queue.autoplay)}`
      );
    } else if (customId === "shuffle") {
      queue.lastAction = lastAction("Queue: Shuffle");
      await queue.shuffle();
    } else if (customId.startsWith("filters")) {
      if (idParts[1] === "clear") {
        queue.filters.clear();
        queue.lastAction = lastAction("Queue: Clear Filters");
        await interaction.update({
          components: client.playerQueueFilters(queue)
        });
      } else {
        await interaction.reply({
          ephemeral: true,
          components: client.playerQueueFilters(queue)
        });
      }
    } else if (customId === "menu") {
      await interaction.reply(client.playerQueueMenu(queue));
    } else if (customId.startsWith("menu")) {
      let [state, action, page] = idParts.slice(1) as [
        "previous" | "current" | "related",
        "add" | "move" | "remove" | "jump",
        number
      ];
      if (action === "jump") {
        const jumpModal = new Discord.ModalBuilder()
          .setCustomId(`queue_jump_${sessionId}`)
          .setTitle("Jump")
          .setComponents(
            new Discord.ActionRowBuilder<Discord.TextInputBuilder>().setComponents(
              new Discord.TextInputBuilder()
                .setCustomId("position")
                .setStyle(Discord.TextInputStyle.Short)
                .setLabel("Position")
                .setPlaceholder("Position of that song")
                .setRequired(true)
            )
          );
        await interaction.showModal(jumpModal);
        return;
      }
      if (action === "add") {
        await interaction.showModal(client.playerSearchModal());
        return;
      }
      page = Number(page);
      if (page === -1) {
        page = 1;
        state =
          state === "previous" ? "current"
          : state === "current" ? "related"
          : "previous";
      }
      await interaction.update(
        client.playerQueueMenu(
          queue,
          state,
          action as "add" | "move" | "remove",
          page
        )
      );
    }
    if (!interaction.replied && !interaction.deferred) {
      await interaction.update({
        components: [client.playerQueueOptions(queue)]
      });
    }
    return;
  }
};
