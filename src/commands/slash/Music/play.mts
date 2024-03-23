import Discord from "discord.js";
import type Remix from "../../../client.mjs";
import type { PlayOptions } from "distube";
import type { Queue } from "../../../utility/types.mjs";

export const data = new Discord.SlashCommandBuilder()
  .setName("play")
  .setDescription("play music by name or url")
  .addStringOption((song) =>
    song
      .setName("song")
      .setDescription("name or url to your song(s)")
      .setAutocomplete(true)
      .setRequired(true)
  )
  .addBooleanOption((skip) =>
    skip.setName("skip").setDescription("whether to skip the current song")
  )
  .addIntegerOption((position) =>
    position
      .setName("position")
      .setDescription("sets the position of this song in queue")
      .setMinValue(1)
  );

export async function autocomplete(
  client: Remix,
  interaction: Discord.AutocompleteInteraction<"cached">
) {
  const query = interaction.options.getFocused();
  let options: Discord.ApplicationCommandOptionChoiceData[] = [];
  if (query.length !== 0) {
    try {
      const results = await client.player.search(query, { limit: 5 });
      options = results.reduce<typeof options>((total, current) => {
        if (current.name && current.url) {
          total.push({
            name: current.name,
            value: current.url
          });
        }
        return total;
      }, []);
    } catch {}
  }
  await interaction.respond(options.slice(0, 25));
}

export async function execute(
  client: Remix,
  interaction: Discord.ChatInputCommandInteraction<"cached">
) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.member.voice.channel) {
    await interaction.editReply({
      embeds: [client.errorEmbed("You must be in a voice channel")]
    });
    return;
  }

  const queue = client.player.getQueue(interaction.guildId) as
    | Queue
    | undefined;

  if (queue && queue.voice.channelId !== interaction.member.voice.channelId) {
    await interaction.editReply({
      embeds: [
        client.errorEmbed("You must join my voice channel").setFooter({
          text: "The player is active in a different voice channel",
          iconURL: client.user.displayAvatarURL()
        })
      ]
    });
    return;
  }

  const song = interaction.options.getString("song")!;
  const skip = interaction.options.getBoolean("skip");
  const position = interaction.options.getInteger("position");

  const playOptions: PlayOptions = {
    member: interaction.member
  };

  if (!queue?.textChannel) {
    playOptions.textChannel =
      interaction.channel || interaction.member.voice.channel;
  }

  if (skip) {
    playOptions.skip = true;
    if (queue) {
      queue.lastAction = {
        icon: interaction.member.displayAvatarURL(),
        text: `${interaction.member.displayName}: Skip & Play`,
        time: interaction.createdTimestamp
      };
    }
  } else if (queue && position && position < queue.songs.length) {
    playOptions.position = position;
  }

  try {
    await client.player.play(
      interaction.member.voice.channel,
      song,
      playOptions
    );
    await interaction.deleteReply();
  } catch {
    await interaction.editReply({
      embeds: [client.errorEmbed()]
    });
  }
}
