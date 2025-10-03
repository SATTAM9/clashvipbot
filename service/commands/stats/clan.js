const { SlashCommandBuilder } = require('@discordjs/builders');
const { getClanEmbed } = require('../../../utils/embeds/stats');
const { getInvalidTagEmbed } = require('../../../utils/embeds/clanTag');
const { parseTag, isTagValid } = require('../../../utils/arguments/tagHandling');
const { findClan } = require('../../../dao/clash/clans');
const { InteractionContextType, ApplicationIntegrationType, escapeMarkdown } = require('discord.js');
const { prettyNumbers } = require('../../../utils/format');
const emojis = require('../../../emojis.json');

const HIGHLIGHT_LIMIT = 3;
const FIELD_MAX_LENGTH = 1024;

const decorateClanEmbed = (embed, clan) => {
	const extraFields = [];

	const identityValue = buildIdentityValue(clan);
	if (identityValue) extraFields.push({ name: 'Clan identity', value: identityValue, inline: false });

	const capitalValue = buildCapitalValue(clan);
	if (capitalValue) extraFields.push({ name: 'Clan capital', value: capitalValue, inline: false });

	const highlightsValue = buildHighlightsValue(clan.memberList);
	if (highlightsValue) extraFields.push({ name: 'Member highlights', value: highlightsValue, inline: false });

	if (extraFields.length) embed.addFields(extraFields);
};

const buildIdentityValue = (clan) => {
	const lines = [];
	const location = formatClanLocation(clan?.location);
	if (location) lines.push(composeLine(emojis.globe, location));
	const labels = formatClanLabels(clan?.labels);
	if (labels) lines.push(composeLine(emojis.bullet, labels));
	return clampField(lines);
};

const buildCapitalValue = (clan) => {
	const capital = clan?.clanCapital || {};
	const lines = [];
	if (capital.capitalHallLevel) {
		lines.push(composeLine(emojis.buildertrophy, `Capital hall level: ${prettyNumbers(Number(capital.capitalHallLevel) || 0)}`));
	}
	if (capital.points != null) {
		lines.push(composeLine(emojis.buildertrophy, `Capital points: ${prettyNumbers(Number(capital.points) || 0)}`));
	}
	if (clan?.capitalLeague?.name) {
		lines.push(composeLine(emojis.bullet, `Capital league: ${clan.capitalLeague.name}`));
	}
	return clampField(lines);
};

const buildHighlightsValue = (memberList) => {
	const members = Array.isArray(memberList) ? memberList : [];
	if (!members.length) return null;

	const donors = buildTopMemberLines(members, (member) => Number(member?.donations ?? 0));
	const receivers = buildTopMemberLines(members, (member) => Number(member?.donationsReceived ?? member?.received ?? 0));

	const sections = [];
	if (donors.length) sections.push(`${composeLine(emojis.bullet, 'Top donors:')}\n${donors.join('\n')}`);
	if (receivers.length) sections.push(`${composeLine(emojis.bullet, 'Top receivers:')}\n${receivers.join('\n')}`);

	return sections.length ? clampField(sections, true) : null;
};

const buildTopMemberLines = (members, selector) => {
	return members
		.map((member) => {
			const value = Number(selector(member)) || 0;
			return { name: member?.name ?? 'Unknown', value };
		})
		.filter((entry) => entry.value > 0)
		.sort((a, b) => b.value - a.value)
		.slice(0, HIGHLIGHT_LIMIT)
		.map((entry, index) => `${index + 1}. ${escapeMarkdown(entry.name)} (${prettyNumbers(entry.value)})`);
};

const formatClanLocation = (location) => {
	if (!location || !location.name) return null;
	const code = location.countryCode ? String(location.countryCode).toUpperCase() : '';
	return code ? `${location.name} (${code})` : location.name;
};

const formatClanLabels = (labels) => {
	if (!Array.isArray(labels) || !labels.length) return null;
	const names = labels
		.map((label) => label?.name)
		.filter(Boolean)
		.slice(0, 5);
	return names.length ? names.join(', ') : null;
};

const composeLine = (icon, text) => {
	if (!text) return null;
	return icon ? `${icon} ${text}` : text;
};
const clampField = (value, allowParagraphBreaks = false) => {
	if (!value) return null;
	const text = Array.isArray(value) ? value.join(allowParagraphBreaks ? '\n\n' : '\n') : value;
	if (!text) return null;
	return text.length > FIELD_MAX_LENGTH ? `${text.slice(0, FIELD_MAX_LENGTH - 3)}...` : text;
};

module.exports = {
	mainServerOnly: false,
	requiresConfigSetup: true,
	data: new SlashCommandBuilder()
		.setName('clan')
		.setDescription('Get information about a clans in-game stats.')
		.setContexts(InteractionContextType.Guild, InteractionContextType.PrivateChannel, InteractionContextType.BotDM)
		.setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
		.addStringOption((option) =>
			option
				.setName('tag')
				.setDescription('The clan tag you want to look up.')
				.setRequired(true),
		),
	async execute(interaction) {
		console.log(`${new Date().toString()} ${interaction.user.id} used the command: /clan`);
		await interaction.deferReply();

		const tag = parseTag(interaction.options.getString('tag'));

		if (!isTagValid(tag)) {
			sendInvalidTagReply(interaction);
			return;
		}

		const clanResponse = await findClan(tag);

		if (!clanResponse.response) {
			return interaction.editReply(`An error occured: ${clanResponse.error}`);
		}

		if (!clanResponse.response.found) {
			sendInvalidTagReply(interaction);
			return;
		}

		const clanData = clanResponse.response.data;

		const embed = getClanEmbed(clanData);
		decorateClanEmbed(embed, clanData);

		interaction.editReply({
			embeds: [embed],
		});
	},
};

const sendInvalidTagReply = async (interaction) => await interaction.editReply({
	embeds: [ getInvalidTagEmbed()],
});

