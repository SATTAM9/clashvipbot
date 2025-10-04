const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  InteractionContextType,
  ApplicationIntegrationType,
  MessageFlags,
} = require('discord.js');
const { parseTag, isTagValid } = require('../../../utils/arguments/tagHandling');
const { getInvalidTagEmbed } = require('../../../utils/embeds/clanTag');
const { findClan } = require('../../../dao/clash/clans');
const { getDonorRankingEmbed } = require('../../../utils/embeds/donorRanking');

const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 3;
const MAX_LIMIT = 25;

const clampLimit = (value) => {
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.floor(value)));
};

module.exports = {
  mainServerOnly: false,
  requiresConfigSetup: true,
  data: new SlashCommandBuilder()
    .setName('topdonors')
    .setDescription('Show the top donating members in a clan for the current season.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
      InteractionContextType.BotDM,
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.UserInstall,
      ApplicationIntegrationType.GuildInstall,
    )
    .addStringOption((option) =>
      option
        .setName('tag')
        .setDescription('Clan tag to inspect (e.g. #ABC123).')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('How many members to show (3-25).')
        .setMinValue(MIN_LIMIT)
        .setMaxValue(MAX_LIMIT),
    ),
  async execute(interaction) {
    console.log(`${new Date().toString()} ${interaction.user.id} used the command: /topdonors`);

    const rawTag = interaction.options.getString('tag', true);
    const limitOption = interaction.options.getInteger('limit');
    const sanitizedTag = parseTag(rawTag);

    if (!isTagValid(sanitizedTag)) {
      return interaction.reply({ embeds: [getInvalidTagEmbed()], flags: MessageFlags.Ephemeral });
    }

    const limit = clampLimit(limitOption ?? DEFAULT_LIMIT);

    await interaction.deferReply();

    let clanResponse;

    try {
      clanResponse = await findClan(sanitizedTag);
    }
    catch (error) {
      console.error('topdonors command clan fetch failed:', error);
      return interaction.editReply('Unable to fetch clan data right now. Please try again later.');
    }

    if (!clanResponse || !clanResponse.response) {
      return interaction.editReply(`An error occurred: ${clanResponse?.error ?? 'Unknown error'}`);
    }

    if (!clanResponse.response.found) {
      return interaction.editReply({ embeds: [getInvalidTagEmbed()] });
    }

    const clanData = clanResponse.response.data;
    const members = Array.isArray(clanData.memberList) ? clanData.memberList : [];

    if (!members.length) {
      return interaction.editReply('No member data is available for this clan.');
    }

    const sortedMembers = [...members]
      .map((member) => ({
        name: member?.name ?? 'Unknown',
        tag: member?.tag ?? '',
        donations: Number(member?.donations ?? 0),
        donationsReceived: Number(member?.donationsReceived ?? member?.received ?? 0),
        role: member?.role ?? 'member',
        expLevel: Number(member?.expLevel ?? 0),
        leagueId: member?.league?.id ?? null,
        leagueName: member?.league?.name ?? null,
      }))
      .sort((a, b) => {
        const donationDiff = b.donations - a.donations;
        if (donationDiff !== 0) return donationDiff;
        return b.donationsReceived - a.donationsReceived;
      })
      .slice(0, limit);

    const embed = getDonorRankingEmbed({
      clan: clanData,
      members: sortedMembers,
      limit,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};