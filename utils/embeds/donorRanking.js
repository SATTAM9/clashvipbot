const { EmbedBuilder, escapeMarkdown } = require('discord.js');
const { prettyNumbers } = require('../format');

const MAX_NAME_LENGTH = 24;
const MAX_ROWS_PER_FIELD = 15;

const columnKeys = ['number', 'donations', 'received', 'name'];
const columnAlignments = ['right', 'right', 'right', 'left'];
const headerLabels = ['#', 'DON', 'REC', 'NAME'];

const truncate = (value, maxLength) => {
  if (!value || value.length <= maxLength) return value ?? '';
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3)}...`;
};

const formatNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString('en-US') : '0';
};

const pad = (value, width, align = 'left') => {
  const text = String(value ?? '');
  if (text.length >= width) return text;
  return align === 'right' ? text.padStart(width, ' ') : text.padEnd(width, ' ');
};

const buildTableChunks = (members) => {
  const rows = members.map((member, index) => ({
    number: String(index + 1),
    donations: formatNumber(member.donations),
    received: formatNumber(member.donationsReceived),
    name: truncate(escapeMarkdown(member.name || 'Unknown'), MAX_NAME_LENGTH),
  }));

  if (!rows.length) return [];

  const widths = headerLabels.map((label, idx) => {
    const key = columnKeys[idx];
    const longest = rows.reduce((max, row) => Math.max(max, row[key].length), 0);
    return Math.max(label.length, longest);
  });

  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + (widths.length - 1);
  const divider = '-'.repeat(totalWidth);

  const formatRow = (row) => columnKeys
    .map((key, idx) => pad(row[key], widths[idx], columnAlignments[idx]))
    .join(' ');

  const headerLine = headerLabels
    .map((label, idx) => pad(label, widths[idx], columnAlignments[idx]))
    .join(' ');

  const formattedRows = rows.map(formatRow);

  const chunks = [];
  for (let i = 0; i < formattedRows.length; i += MAX_ROWS_PER_FIELD) {
    const slice = formattedRows.slice(i, i + MAX_ROWS_PER_FIELD);
    const block = [headerLine, divider, ...slice].join('\n');
    chunks.push(`\`\`\`\n${block}\n\`\`\``);
  }

  return chunks;
};

const summarizeMembers = (members) => {
  if (!members.length) return null;
  const top = members[0];
  const totalDonations = members.reduce((acc, member) => acc + (Number(member.donations) || 0), 0);
  return { top, totalDonations };
};

const getDonorRankingEmbed = ({ clan, members, limit }) => {
  const embed = new EmbedBuilder()
    .setColor(0x06b6d4)
    .setTitle('Clan Donor Ranking');

  const clanName = clan?.name ?? 'Unknown clan';
  const clanTag = clan?.tag ?? '';
  const memberCount = Number(clan?.members ?? 0);

  embed.setDescription([
    `${escapeMarkdown(clanName)}${clanTag ? ` (${clanTag})` : ''}`,
    `${members.length} of ${limit} slots shown | ${memberCount} members total`,
  ].join('\n'));

  const chunks = buildTableChunks(members);

  if (chunks.length) {
    chunks.forEach((chunk, index) => {
      embed.addFields({
        name: index === 0 ? 'Players (Don / Recv)' : 'Players (cont.)',
        value: chunk,
        inline: false,
      });
    });
  } else {
    embed.addFields({
      name: 'Players (Don / Recv)',
      value: 'No donation data recorded for this clan.',
      inline: false,
    });
  }

  const summary = summarizeMembers(members);
  if (summary?.top) {
    const topName = truncate(summary.top.name, 24);
    embed.setFooter({
      text: `Top donor: ${topName} (${prettyNumbers(summary.top.donations)}) | Combined donations: ${prettyNumbers(summary.totalDonations)}`,
    });
  }

  if (clan?.badgeUrls?.small) {
    embed.setThumbnail(clan.badgeUrls.small);
  }

  return embed;
};

module.exports = {
  getDonorRankingEmbed,
};