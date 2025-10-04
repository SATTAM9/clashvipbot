const { SlashCommandBuilder } = require('@discordjs/builders');
const { InteractionContextType, PermissionFlagsBits } = require('discord.js');
const { getConfig, updateConfig } = require('../../../config');
const { parseTag, isTagValid } = require('../../../utils/arguments/tagHandling');
const { clearDonationRankingCache } = require('../../../utils/donationRanking');

const MAX_TRACKED_CLANS = Math.max(1, Number(process.env.TOP_DONATION_MAX_CLANS) || 100);

const sanitizeInputTag = (value) => {
  const parsed = parseTag(value);
  if (!isTagValid(parsed)) {
    throw new Error('INVALID_TAG');
  }
  return parsed;
};

const normalizeConfig = (configDoc, guildId) => {
  const base = configDoc?.toObject?.() ?? configDoc ?? {};
  const clone = { ...base };
  delete clone._id;
  delete clone.__v;
  clone.guildID = guildId;
  if (!Array.isArray(clone.donationClans)) {
    clone.donationClans = [];
  }
  return clone;
};

const formatTagList = (tags) => {
  if (!tags.length) return 'No clans have been configured yet.';
  return tags
    .map((tag, index) => `${index + 1}. #${tag}`)
    .join('\n');
};

const replyEphemeral = (interaction, content) => interaction.reply({ content, ephemeral: true });

module.exports = {
  mainServerOnly: false,
  requiresConfigSetup: false,
  data: new SlashCommandBuilder()
    .setName('topclansconfig')
    .setDescription('Manage the tracked donation clans used by /topclans (administrators only).')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a clan to the tracked donation list.')
        .addStringOption((option) =>
          option
            .setName('tag')
            .setDescription('Clan tag, e.g. #ABC123')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a clan from the tracked list.')
        .addStringOption((option) =>
          option
            .setName('tag')
            .setDescription('Clan tag to remove')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Show the currently tracked donation clans.')
        .addBooleanOption((option) =>
          option
            .setName('public')
            .setDescription('Set to true to post the list publicly. Defaults to an ephemeral reply.'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('clear')
        .setDescription('Remove all donation clans from the tracked list.')
        .addBooleanOption((option) =>
          option
            .setName('confirm')
            .setDescription('You must set this to true to confirm the clear.')
            .setRequired(true),
        ),
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      return replyEphemeral(interaction, 'This command can only be used inside a guild.');
    }

    const subcommand = interaction.options.getSubcommand();
    const { guildId } = interaction;

    const configDoc = await getConfig(guildId);
    const config = normalizeConfig(configDoc, guildId);
    const currentTags = Array.isArray(config.donationClans) ? config.donationClans : [];

    if (subcommand === 'list') {
      const isPublic = interaction.options.getBoolean('public') ?? false;
      const content = `Tracked clans (${currentTags.length}):\n${formatTagList(currentTags)}`;
      return interaction.reply({ content, ephemeral: !isPublic });
    }

    if (subcommand === 'add') {
      const rawTag = interaction.options.getString('tag', true);
      let sanitizedTag;
      try {
        sanitizedTag = sanitizeInputTag(rawTag);
      }
      catch (error) {
        return replyEphemeral(interaction, 'The provided clan tag is invalid. Please double-check and try again.');
      }

      if (currentTags.includes(sanitizedTag)) {
        return replyEphemeral(interaction, `Clan #${sanitizedTag} is already tracked.`);
      }

      if (currentTags.length >= MAX_TRACKED_CLANS) {
        return replyEphemeral(
          interaction,
          `Cannot add more clans. The current limit is ${MAX_TRACKED_CLANS}. Increase TOP_DONATION_MAX_CLANS in the environment if you need to track more.`,
        );
      }

      const nextTags = [...currentTags, sanitizedTag];
      const nextConfig = { ...config, donationClans: nextTags };
      await updateConfig(guildId, nextConfig);
      clearDonationRankingCache(guildId);

      return replyEphemeral(interaction, `Clan #${sanitizedTag} added. ${nextTags.length} clan(s) are now tracked.`);
    }

    if (subcommand === 'remove') {
      const rawTag = interaction.options.getString('tag', true);
      let sanitizedTag;
      try {
        sanitizedTag = sanitizeInputTag(rawTag);
      }
      catch (error) {
        return replyEphemeral(interaction, 'The provided clan tag is invalid.');
      }

      if (!currentTags.includes(sanitizedTag)) {
        return replyEphemeral(interaction, `Clan #${sanitizedTag} is not currently tracked.`);
      }

      const nextTags = currentTags.filter((tag) => tag !== sanitizedTag);
      const nextConfig = { ...config, donationClans: nextTags };
      await updateConfig(guildId, nextConfig);
      clearDonationRankingCache(guildId);

      return replyEphemeral(interaction, `Clan #${sanitizedTag} removed. ${nextTags.length} clan(s) remain.`);
    }

    if (subcommand === 'clear') {
      const confirmed = interaction.options.getBoolean('confirm', true);
      if (!confirmed) {
        return replyEphemeral(interaction, 'Clear cancelled. No clans were removed.');
      }

      if (!currentTags.length) {
        return replyEphemeral(interaction, 'The tracked list is already empty.');
      }

      const nextConfig = { ...config, donationClans: [] };
      await updateConfig(guildId, nextConfig);
      clearDonationRankingCache(guildId);

      return replyEphemeral(interaction, 'All tracked donation clans have been cleared for this guild.');
    }

    return replyEphemeral(interaction, 'Unsupported subcommand.');
  },
};