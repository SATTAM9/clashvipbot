const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  InteractionContextType,
  ApplicationIntegrationType,
} = require('discord.js');
const { getTopDonationClans } = require('../../../utils/donationRanking');
const { getDonationRankingEmbed } = require('../../../utils/embeds/donationRanking');

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
    .setName('topclans')
    .setDescription('Show top clans by donation totals for the current season.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
      InteractionContextType.BotDM,
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.UserInstall,
      ApplicationIntegrationType.GuildInstall,
    )
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('How many clans to show (3-25).')
        .setMinValue(MIN_LIMIT)
        .setMaxValue(MAX_LIMIT),
    )
    .addBooleanOption((option) =>
      option
        .setName('refresh')
        .setDescription('Force refresh the cached donation snapshot.'),
    ),
  async execute(interaction) {
    console.log(`${new Date().toString()} ${interaction.user.id} used the command: /topclans`);

    const limitOption = interaction.options.getInteger('limit');
    const refreshOption = interaction.options.getBoolean('refresh');
    const limit = clampLimit(limitOption ?? DEFAULT_LIMIT);
    const forceRefresh = Boolean(refreshOption);

    await interaction.deferReply();

    let ranking;
    try {
      ranking = await getTopDonationClans(limit, { forceRefresh, guildId: interaction.guildId });
    }
    catch (error) {
      console.error('topclans command failed to fetch data:', error);
      return interaction.editReply('Unable to fetch clan donation rankings right now. Please try again later.');
    }

    const embed = getDonationRankingEmbed({
      stats: ranking.stats,
      seasonDayCount: ranking.seasonDayCount,
      generatedAt: ranking.generatedAt,
      fromCache: ranking.fromCache,
      errors: ranking.errors,
      limit,
    });

    const response = { embeds: [embed] };

    if (!ranking.stats.length && (!ranking.errors || !ranking.errors.length)) {
      response.content = 'No donation data could be gathered for the configured clans.';
    }

    return interaction.editReply(response);
  },
};