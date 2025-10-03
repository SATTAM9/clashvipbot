const { SlashCommandBuilder } = require('@discordjs/builders');
const {
	EmbedBuilder,
	InteractionContextType,
	ApplicationIntegrationType,
	MessageFlags,
	escapeMarkdown,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ComponentType,
} = require('discord.js');
const { parseTag, isTagValid } = require('../../../utils/arguments/tagHandling');
const { getInvalidTagEmbed } = require('../../../utils/embeds/clanTag');
const { findClan } = require('../../../dao/clash/clans');
const { prettyNumbers } = require('../../../utils/format');
const emojis = require('../../../emojis.json');

const DEFAULT_LEADERBOARD_LIMIT = 10;
const MAX_LEADERBOARD_LIMIT = 25;
const PLAYER_TABLE_CAP = 25;
const NAME_COLUMN_WIDTH = 18;

const SORT_OPTIONS = {
	donations: {
		value: 'donations',
		label: 'Donations',
		description: 'Sorted by donations',
		selector: (player) => player.donations,
		tableLabel: 'DON',
		tableFormatter: (player) => prettyNumbers(player.donations),
	},
	donations_received: {
		value: 'donations_received',
		label: 'Donations Received',
		description: 'Sorted by donations received',
		selector: (player) => player.donationsReceived,
		tableLabel: 'REC',
		tableFormatter: (player) => prettyNumbers(player.donationsReceived),
	},
	difference: {
		value: 'difference',
		label: 'Donation Difference',
		description: 'Sorted by donation difference',
		selector: (player) => player.difference,
		tableLabel: 'NET',
		tableFormatter: (player) => formatDifference(player.difference),
	},
	town_hall_level: {
		value: 'town_hall_level',
		label: 'Town-Hall Level',
		description: 'Sorted by Town-Hall level',
		selector: (player) => player.townHallLevel,
		tableLabel: 'TH',
		tableFormatter: (player) => `TH${player.townHallLevel || 0}`,
	},
};

const ORDER_OPTIONS = {
	descending: {
		value: 'descending',
		label: 'Descending (High to Low)',
		description: 'High to Low',
	},
	ascending: {
		value: 'ascending',
		label: 'Ascending (Low to High)',
		description: 'Low to High',
	},
};

const INTERACTION_TIMEOUT = 5 * 60 * 1000;

const toSafeInteger = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const getSeasonDayCount = () => {
	const now = new Date();
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	return Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
};

const getSeasonLabel = () => new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date());

const formatDifference = (value) => {
	if (!value) return '0';
	const absolute = prettyNumbers(Math.abs(Math.round(value)));
	return value > 0 ? `+${absolute}` : `-${absolute}`;
};

const truncate = (value, maxLength) => {
	if (!value || value.length <= maxLength) return value ?? '';
	if (maxLength <= 3) return value.slice(0, maxLength);
	return `${value.slice(0, maxLength - 3)}...`;
};

const alignCell = (value, width, align = 'left') => {
	const text = String(value ?? '');
	return align === 'right' ? text.padStart(width, ' ') : text.padEnd(width, ' ');
};

const formatTable = (columns, rows) => {
	if (!rows.length) return '```\nNo data available yet.\n```';

	const widths = columns.map((column) => {
		const headerWidth = column.label.length;
		const dataWidth = rows.reduce((max, row) => {
			const cell = String(row[column.key] ?? '');
			return Math.max(max, cell.length);
		}, 0);
		return Math.max(headerWidth, dataWidth);
	});

	const header = columns
		.map((column, index) => alignCell(column.label, widths[index], column.align))
		.join('  ');

	const divider = columns
		.map((column, index) => '-'.repeat(widths[index]))
		.join('  ');

	const lines = rows.map((row) =>
		columns
			.map((column, index) => alignCell(row[column.key] ?? '', widths[index], column.align))
			.join('  '),
	);

	return ['```', header, divider, ...lines, '```'].join('\n');
};

const buildClanTable = (clan, totals) => {
	const columns = [
		{ key: 'rank', label: '#', align: 'right' },
		{ key: 'donated', label: 'DON', align: 'right' },
		{ key: 'received', label: 'REC', align: 'right' },
		{ key: 'name', label: 'CLAN', align: 'left' },
	];

	const rows = [
		{
			rank: 1,
			donated: prettyNumbers(totals.donated),
			received: prettyNumbers(totals.received),
			name: truncate(escapeMarkdown(clan.name ?? 'Unknown'), NAME_COLUMN_WIDTH),
		},
	];

	return formatTable(columns, rows);
};

const buildPlayerTable = (players, limit, sortConfig) => {
	const displayCount = Math.min(limit, PLAYER_TABLE_CAP, players.length);
	if (!displayCount) return '```\nNo player data available yet.\n```';

	const focusLabel = sortConfig.tableLabel ?? 'FOCUS';
	const formatFocus = sortConfig.tableFormatter ?? ((player) => {
		const value = sortConfig.selector(player) ?? 0;
		return prettyNumbers(value);
	});

	const rows = players.slice(0, displayCount).map((player, index) => ({
		rank: index + 1,
		focus: formatFocus(player),
		donated: prettyNumbers(player.donations),
		received: prettyNumbers(player.donationsReceived),
		player: truncate(escapeMarkdown(player.name ?? 'Unknown'), NAME_COLUMN_WIDTH),
	}));

	const columns = [
		{ key: 'rank', label: '#', align: 'right' },
		{ key: 'focus', label: focusLabel, align: 'right' },
		{ key: 'donated', label: 'DON', align: 'right' },
		{ key: 'received', label: 'REC', align: 'right' },
		{ key: 'player', label: 'PLAYER', align: 'left' },
	];

	return formatTable(columns, rows);
};

const buildHighlights = (topDonated, topReceived, topNet) => {
	const highlights = [];

	if (topDonated?.length) {
		highlights.push(`Top donor: ${escapeMarkdown(topDonated[0].name ?? 'Unknown')} (${prettyNumbers(topDonated[0].donations)})`);
	}

	if (topReceived?.length) {
		highlights.push(`Most received: ${escapeMarkdown(topReceived[0].name ?? 'Unknown')} (${prettyNumbers(topReceived[0].donationsReceived)})`);
	}

	if (topNet?.length && topNet[0].difference !== 0) {
		highlights.push(`Best net: ${escapeMarkdown(topNet[0].name ?? 'Unknown')} (${formatDifference(topNet[0].difference)})`);
	}

	return highlights.join('\n');
};

const sortPlayers = (players, sortKey, orderKey) => {
	const sortConfig = SORT_OPTIONS[sortKey] ?? SORT_OPTIONS.donations;
	const orderConfig = ORDER_OPTIONS[orderKey] ?? ORDER_OPTIONS.descending;
	const direction = orderConfig.value === 'ascending' ? 1 : -1;

	const sorted = [...players].sort((a, b) => {
		const aValue = sortConfig.selector(a) ?? 0;
		const bValue = sortConfig.selector(b) ?? 0;
		if (aValue === bValue) {
			const donatedDiff = b.donations - a.donations;
			if (donatedDiff !== 0) return donatedDiff;
			return (a.name || '').localeCompare(b.name || '');
		}
		return (aValue - bValue) * direction;
	});

	return { sorted, sortConfig, orderConfig };
};

const buildDonationEmbed = (clan, limit, sortKey, orderKey) => {
	const members = Array.isArray(clan.memberList) ? clan.memberList : [];
	const players = members.map((member) => {
		const donations = toSafeInteger(member?.donations);
		const donationsReceived = toSafeInteger(member?.donationsReceived ?? member?.received);
		return {
			name: member?.name ?? 'Unknown',
			tag: member?.tag ?? '',
			donations,
			donationsReceived,
			difference: donations - donationsReceived,
			townHallLevel: toSafeInteger(member?.townHallLevel),
		};
	});

	const totals = players.reduce(
		(acc, player) => {
			acc.donated += player.donations;
			acc.received += player.donationsReceived;
			return acc;
		},
		{ donated: 0, received: 0 },
	);

	totals.total = totals.donated + totals.received;
	totals.net = totals.donated - totals.received;

	const seasonDayCount = getSeasonDayCount();
	const seasonLabel = getSeasonLabel();
	const dailyTotal = seasonDayCount ? Math.round(totals.total / seasonDayCount) : totals.total;
	const avgDonated = players.length ? Math.round(totals.donated / players.length) : 0;
	const avgReceived = players.length ? Math.round(totals.received / players.length) : 0;

	const topByDonated = [...players].sort((a, b) => b.donations - a.donations);
	const topByReceived = [...players].sort((a, b) => b.donationsReceived - a.donationsReceived);
	const topByNet = [...players].sort((a, b) => b.difference - a.difference);

	const { sorted: leaderboardPlayers, sortConfig, orderConfig } = sortPlayers(players, sortKey, orderKey);

	const summaryLines = [
		`Season ${seasonLabel} (Day ${seasonDayCount})`,
		`${emojis.personsilhouette ?? 'Members'} ${prettyNumbers(clan.members ?? players.length)}/50`,
		`${emojis.trophy ?? 'Points'} ${prettyNumbers(clan.clanPoints ?? 0)}`,
		`${emojis.zap ?? 'War wins'} ${prettyNumbers(clan.warWins ?? 0)}`,
		`[Open clan in game](https://link.clashofclans.com/en?action=OpenClanProfile&tag=${String(clan.tag ?? '').replace(/^#/, '')})`,
	];

	const totalsLines = [
		`Donated: ${prettyNumbers(totals.donated)}`,
		`Received: ${prettyNumbers(totals.received)}`,
		`Net balance: ${formatDifference(totals.net)}`,
		`Total activity: ${prettyNumbers(totals.total)}`,
		`Daily pace: ${prettyNumbers(dailyTotal)} (season avg)`,
		`Average per member: ${prettyNumbers(avgDonated)} donated / ${prettyNumbers(avgReceived)} received`,
	];

	const embed = new EmbedBuilder()
		.setColor(totals.net >= 0 ? '#3BA55D' : '#ED4245')
		.setTitle('Clash VIP Top Donations')
		.setDescription(summaryLines.join('\n'))
		.setFooter({ text: `Season ${seasonLabel}` });

	if (clan.badgeUrls?.medium) {
		embed.setThumbnail(clan.badgeUrls.medium);
	}

	embed.addFields({
		name: 'Top Clans',
		value: buildClanTable(clan, totals),
		inline: false,
	});

	embed.addFields({
		name: `Donation Leaderboard - ${sortConfig.label} (${orderConfig.description})`,
		value: buildPlayerTable(leaderboardPlayers, limit, sortConfig),
		inline: false,
	});

	embed.addFields({
		name: 'Season Totals',
		value: totalsLines.join('\n'),
		inline: false,
	});

	const highlights = buildHighlights(topByDonated, topByReceived, topByNet);
	if (highlights) {
		embed.addFields({
			name: 'Highlights',
			value: highlights,
			inline: false,
		});
	}

	return embed;
};

const buildSelectorRow = (sortKey, orderKey) => {
	const sortMenu = new StringSelectMenuBuilder()
		.setCustomId('donation-sort')
		.setPlaceholder('Sort by')
		.addOptions(
			Object.values(SORT_OPTIONS).map((option) => ({
				label: option.label,
				description: option.description,
				value: option.value,
				default: option.value === sortKey,
			})),
		);

	const orderMenu = new StringSelectMenuBuilder()
		.setCustomId('donation-order')
		.setPlaceholder('Order by')
		.addOptions(
			Object.values(ORDER_OPTIONS).map((option) => ({
				label: option.label,
				description: option.description,
				value: option.value,
				default: option.value === orderKey,
			})),
		);

	return [new ActionRowBuilder().addComponents(sortMenu), new ActionRowBuilder().addComponents(orderMenu)];
};

const interactivelyRender = async (interaction, clanData, options) => {
	const { limit, sortKey, orderKey } = options;

	const embed = buildDonationEmbed(clanData, limit, sortKey, orderKey);
	const components = buildSelectorRow(sortKey, orderKey);

	const reply = await interaction.editReply({ embeds: [embed], components });

	const collector = reply.createMessageComponentCollector({
		componentType: ComponentType.StringSelect,
		time: INTERACTION_TIMEOUT,
	});

	collector.on('collect', async (selectInteraction) => {
		if (selectInteraction.user.id !== interaction.user.id) {
			return selectInteraction.reply({
				content: 'You cannot control this menu.',
				flags: MessageFlags.Ephemeral,
			});
		}

		let nextSort = sortKey;
		let nextOrder = orderKey;

		if (selectInteraction.customId === 'donation-sort') {
			nextSort = selectInteraction.values[0];
		}

		if (selectInteraction.customId === 'donation-order') {
			nextOrder = selectInteraction.values[0];
		}

		const refreshedEmbed = buildDonationEmbed(clanData, limit, nextSort, nextOrder);
		const refreshedRows = buildSelectorRow(nextSort, nextOrder);

		await selectInteraction.update({ embeds: [refreshedEmbed], components: refreshedRows });

		options.sortKey = nextSort;
		options.orderKey = nextOrder;
	});

	collector.on('end', async () => {
		try {
			await interaction.editReply({ components: [] });
		}
		catch (error) {
			console.error('Failed to disable donation selectors:', error);
		}
	});
};

module.exports = {
	mainServerOnly: false,
	requiresConfigSetup: true,
	data: new SlashCommandBuilder()
		.setName('donation')
		.setDescription('Summarize clan donation activity for the current season.')
		.setContexts(InteractionContextType.Guild, InteractionContextType.PrivateChannel, InteractionContextType.BotDM)
		.setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
		.addStringOption((option) =>
			option
				.setName('tag')
				.setDescription('The clan tag to analyze.')
				.setRequired(true),
		)
		.addIntegerOption((option) =>
			option
				.setName('limit')
				.setDescription('How many members to show in each leaderboard (max 25).')
				.setMinValue(3)
				.setMaxValue(MAX_LEADERBOARD_LIMIT),
		),
	async execute(interaction) {
		console.log(`${new Date().toString()} ${interaction.user.id} used the command: /donation`);
		const limitOption = interaction.options.getInteger('limit');
		const rawTag = interaction.options.getString('tag');
		const tag = parseTag(rawTag);

		if (!isTagValid(tag)) {
			return interaction.reply({
				embeds: [getInvalidTagEmbed()],
				flags: MessageFlags.Ephemeral,
			});
		}

		const limit = Math.min(
			MAX_LEADERBOARD_LIMIT,
			Math.max(3, limitOption ?? DEFAULT_LEADERBOARD_LIMIT),
		);

		await interaction.deferReply();

		let clanResponse;

		try {
			clanResponse = await findClan(tag);
		}
		catch (error) {
			console.error('donation command clan fetch failed:', error);
			return interaction.editReply('Unable to fetch clan data right now. Please try again later.');
		}

		if (!clanResponse) {
			return interaction.editReply('Clan data could not be retrieved. Please try again later.');
		}

		if (!clanResponse.response) {
			return interaction.editReply(`An error occurred: ${clanResponse.error}`);
		}

		if (!clanResponse.response.found) {
			return interaction.editReply({
				embeds: [getInvalidTagEmbed()],
			});
		}

		const clanData = clanResponse.response.data;

		if (!Array.isArray(clanData.memberList) || !clanData.memberList.length) {
			return interaction.editReply('No member data is available for this clan.');
		}

		const options = {
			limit,
			sortKey: SORT_OPTIONS.donations.value,
			orderKey: ORDER_OPTIONS.descending.value,
		};

		return interactivelyRender(interaction, clanData, options);
	},
};

