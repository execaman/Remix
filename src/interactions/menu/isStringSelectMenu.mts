import Discord from "discord.js";
import type Remix from "../../client.mjs";
import type { Song } from "distube";
import type { Queue } from "../../utility/types.mjs";

export default async (
  client: Remix,
  interaction: Discord.StringSelectMenuInteraction<"cached">
) => {
  if (!interaction.member.voice.channel) {
    await interaction.reply({
      ephemeral: true,
      embeds: [client.errorEmbed("You must be in a voice channel")]
    });
    return;
  }

  const queue = client.player.getQueue(interaction.guildId) as
    | Queue
    | undefined;

  if (queue && queue.voice.channelId !== interaction.member.voice.channelId) {
    await interaction.reply({
      ephemeral: true,
      embeds: [
        client.errorEmbed("You must join my voice channel").setFooter({
          text: "The player is active in a different voice channel",
          iconURL: client.user.displayAvatarURL()
        })
      ]
    });
    return;
  }

  if (interaction.customId === "player_search") {
    await interaction.deferUpdate();
    const songs = interaction.values;
    try {
      const source =
        songs.length === 1 ?
          songs[0]
        : await client.player.createCustomPlaylist(songs, {
            member: interaction.member,
            properties: { name: `Playlist from Search` },
            parallel: true
          });
      await client.player.play(interaction.member.voice.channel, source, {
        member: interaction.member,
        textChannel:
          queue ?
            queue.textChannel!
          : interaction.channel || interaction.member.voice.channel
      });
      await interaction.deleteReply();
    } catch {
      await interaction.editReply({
        embeds: [client.errorEmbed()],
        components: []
      });
    }
    return;
  }

  if (!queue) {
    return;
  }

  const idParts = interaction.customId.split("_");
  const sessionId = idParts.pop() as string;

  if (sessionId !== queue.voice.voiceState?.sessionId) {
    return;
  }

  const request = idParts.shift() as string;
  const customId = idParts.join("_");

  const lastAction = (text: string) => ({
    icon: interaction.member.displayAvatarURL(),
    text: `${interaction.member.displayName}: ${text}`,
    time: interaction.createdTimestamp
  });

  if (request === "queue") {
    if (customId.startsWith("filters")) {
      const current = interaction.values;
      const options = interaction.component.options.map(
        (option) => option.value
      );

      if (current.length === 0) {
        queue.filters.remove(options);
      } else {
        const filters = queue.filters.names.filter((filter) =>
          options.includes(filter)
        );

        const remove = filters.filter((filter) => !current.includes(filter));
        if (remove.length > 0) {
          queue.filters.remove(remove);
        }

        const add = current.filter((filter) => !filters.includes(filter));
        if (add.length > 0) {
          queue.filters.add(add);
        }
      }

      queue.lastAction = lastAction("Queue: Update Filters");

      await interaction.update({
        components: client.playerQueueFilters(queue)
      });
      return;
    } else if (customId.startsWith("menu")) {
      await interaction.deferUpdate();
      const indices = interaction.values.map(Number);
      let [state, action, page] = idParts.slice(1) as [
        "previous" | "current" | "related",
        "add" | "move" | "remove",
        number
      ];
      page = Number(page);
      const items = interaction.message.embeds[0].description!.match(
        /(?<=\()(.+)(?=\))/g
      ) as string[];
      const verifyItem = (index: number) => {
        const offset = state === "current" ? 1 : 0;
        const url = items[index - (page - 1) * 25 - offset];
        return (
          state === "previous" ? queue.previousSongs[index]?.url === url
          : state === "current" ? queue.songs[index]?.url === url
          : queue.songs[0].related[index]?.url === url
        );
      };
      if (state === "related") {
        const relatedSongs = queue.songs[0].related;
        const songs: string[] = [];
        for (const index of indices) {
          if (verifyItem(index)) {
            songs.push(relatedSongs[index].url);
          } else {
            songs.push(items[index]);
          }
        }
        try {
          const source =
            songs.length === 1 ?
              songs[0]
            : await client.player.createCustomPlaylist(songs, {
                member: interaction.member,
                properties: { name: "Songs Related to the Current One" },
                parallel: true
              });
          await client.player.play(interaction.member.voice.channel, source, {
            member: interaction.member,
            textChannel:
              queue.textChannel ||
              interaction.channel ||
              interaction.member.voice.channel
          });
        } catch {
          await interaction.followUp({
            ephemeral: true,
            embeds: [client.errorEmbed()]
          });
          return;
        }
      } else if (action === "move") {
        const songs: Song[] = [];
        const positions = indices.sort((a, b) => b - a);
        for (const position of positions) {
          if (!verifyItem(position)) {
            continue;
          }
          if (state === "previous") {
            songs.push(queue.previousSongs.splice(position, 1)[0]);
          } else {
            songs.push(queue.songs.splice(position, 1)[0]);
          }
        }
        if (songs.length === 0) {
          await interaction.followUp({
            ephemeral: true,
            embeds: [client.errorEmbed("The Queue was interrupted")]
          });
          return;
        }
        songs.reverse();
        if (state === "previous") {
          queue.songs.push(...songs);
        } else {
          queue.songs.splice(1, 0, ...songs);
        }
        queue.lastAction = lastAction(
          `Queue: Move ${state === "previous" ? "Previous" : "Current"} Songs`
        );
      } else if (action === "remove") {
        const getLength = () =>
          state === "previous" ?
            queue.previousSongs.length
          : queue.songs.length;
        const previousLength = getLength();
        const positions = indices.sort((a, b) => b - a);
        for (const position of positions) {
          if (!verifyItem(position)) {
            continue;
          }
          if (state === "previous") {
            queue.previousSongs.splice(position, 1);
          } else {
            queue.songs.splice(position, 1);
          }
        }
        if (previousLength !== getLength()) {
          queue.lastAction = lastAction(
            `Queue: Remove ${state === "previous" ? "Previous" : "Current"} Songs`
          );
        }
      }
      await interaction.editReply(
        client.playerQueueMenu(queue, state, action, page)
      );
      return;
    }
    return;
  }
};
