import Discord from "discord.js";
import { URL } from "node:url";
import type Remix from "../client.mjs";
import type { Queue } from "../utility/types.mjs";

export default async (
  client: Remix,
  interaction: Discord.ModalSubmitInteraction<"cached">
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
    await interaction.deferReply({ ephemeral: true });
    const query = interaction.fields.getTextInputValue("query");
    try {
      let url: URL = null!;
      try {
        url = new URL(query);
      } catch {}
      if (url) {
        await client.player.play(interaction.member.voice.channel, url.href, {
          member: interaction.member,
          textChannel:
            queue?.textChannel ||
            interaction.channel ||
            interaction.member.voice.channel
        });
        await interaction.deleteReply();
        return;
      }
      const results = await client.player.search(query, { limit: 10 });
      const options = results.map((song) => {
        const item = client.util.formatSong(song);
        return new Discord.StringSelectMenuOptionBuilder()
          .setEmoji(client.config.emoji.clock)
          .setLabel(item.name)
          .setDescription(item.description)
          .setValue(item.url);
      });
      await interaction.editReply({
        components: [
          new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>().setComponents(
            new Discord.StringSelectMenuBuilder()
              .setCustomId("player_search")
              .setPlaceholder("Select Songs to Play")
              .setOptions(options)
              .setMaxValues(options.length)
          )
        ]
      });
    } catch {
      await interaction.editReply({
        embeds: [client.errorEmbed()]
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

  if (request === "song") {
    if (customId === "seek") {
      await interaction.deferReply({ ephemeral: true });
      const currentTime = queue.currentTime;
      const maxDuration = queue.songs[0].duration;
      const time = interaction.fields.getTextInputValue("seek");
      const type =
        time.startsWith("-") ? "rewind"
        : time.startsWith("+") ? "forward"
        : "seek";
      try {
        const duration = client.util.time.seconds(time);
        if (isNaN(duration)) {
          throw null;
        }
        if (type === "forward" && currentTime + duration < maxDuration) {
          queue.seek(currentTime + duration);
          queue.lastAction = lastAction(`Duration: Forward ${duration}s`);
        } else if (type === "rewind" && currentTime - duration > 0) {
          queue.seek(currentTime - duration);
          queue.lastAction = lastAction(
            `Duration: Rewind ${Math.abs(duration)}s`
          );
        } else if (type === "seek" && duration >= 0 && duration < maxDuration) {
          queue.seek(duration);
          queue.lastAction = lastAction(
            `Duration: ${client.util.time.formatDuration(duration)}`
          );
        } else {
          throw null;
        }
      } catch {
        await interaction.editReply({
          embeds: [client.errorEmbed("Invalid time entered")]
        });
        return;
      }
      await interaction.deleteReply();
    } else if (customId === "volume") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const volume = parseInt(interaction.fields.getTextInputValue("volume"));
        if (isNaN(volume) || volume < 10 || volume > 150) {
          throw null;
        }
        queue.setVolume(volume);
        queue.lastAction = lastAction(`Volume ${volume}%`);
      } catch {
        await interaction.editReply({
          embeds: [client.errorEmbed("Invalid volume entered")]
        });
        return;
      }
      await interaction.deleteReply();
    }
    return;
  }

  if (request === "queue") {
    if (customId === "jump") {
      await interaction.deferReply({ ephemeral: true });
      const position = parseInt(
        interaction.fields.getTextInputValue("position")
      );
      if (isNaN(position) || position >= queue.songs.length) {
        await interaction.editReply({
          embeds: [client.errorEmbed("Invalid position entered")]
        });
        return;
      }
      queue.lastAction = lastAction(`Queue: Jump to #${position}`);
      if (
        queue.textChannel
          ?.permissionsFor(client.user.id)
          ?.has(Discord.PermissionFlagsBits.SendMessages)
      ) {
        await queue.textChannel.send({
          embeds: [
            new Discord.EmbedBuilder()
              .setColor(Discord.Colors.Yellow)
              .setAuthor({
                name: queue.lastAction.text,
                iconURL: queue.lastAction.icon
              })
              .setDescription(Discord.codeBlock(`Skipping ${position} tracks`))
          ]
        });
      }
      await queue.jump(position);
      await interaction.deleteReply();
    }
  }
};
