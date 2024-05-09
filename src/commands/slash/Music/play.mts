import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("play")
  .setDescription("play a song by name or url")
  .addStringOption((song) =>
    song
      .setName("song")
      .setDescription("name or url to your song(s)")
      .setAutocomplete(true)
      .setRequired(true)
  )
  .addBooleanOption((skip) =>
    skip.setName("skip").setDescription("skip the current song and play immediately")
  )
  .addIntegerOption((position) =>
    position.setName("position").setDescription("set position of this song in queue").setMinValue(1)
  );

export async function autocomplete(
  client: Remix,
  interaction: Discord.AutocompleteInteraction<"cached">
) {
  const option = interaction.options.getFocused(true);
  const options: Discord.ApplicationCommandOptionChoiceData[] = [];

  if (option.value.length !== 0) {
    try {
      for (const result of await client.player.search(option.value, {
        limit: 5
      })) {
        options.push({
          name: result.name.slice(0, 99),
          value: result.url
        });
      }
    } catch {}
  }
  await interaction.respond(options);
}

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  const queue = client.player.getQueue(interaction.guildId) as Queue | undefined;

  if (
    !interaction.member.voice.channel ||
    (queue && queue.voice.channelId !== interaction.member.voice.channelId)
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

  try {
    const options = {
      song: interaction.options.getString("song", true),
      skip: interaction.options.getBoolean("skip") || false,
      position: interaction.options.getInteger("position") || 0
    };

    if (queue && options.position >= queue.songs.length) {
      options.position = 0;
    }

    const currentSongName = queue?.songs[0].name?.slice(0, 45).trim() || "Untitled Track";

    await client.player.play(interaction.member.voice.channel, options.song, {
      position: options.position,
      skip: options.skip,
      textChannel: queue?.textChannel || interaction.channel || interaction.member.voice.channel
    });

    if (options.skip && queue && queue.songs.length > 1) {
      queue.lastAction = {
        icon: interaction.member.displayAvatarURL(),
        text: `${interaction.member.displayName}: Skip & Play`,
        time: interaction.createdTimestamp
      };

      if (client.canSendMessageIn(queue.textChannel)) {
        await queue.textChannel.send({
          embeds: [
            client.playerAlertEmbed({
              icon: queue.lastAction.icon,
              title: queue.lastAction.text,
              description: `Stopping '${currentSongName}'`
            })
          ]
        });
      }
    }

    await interaction.deleteReply();
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
  }
}
