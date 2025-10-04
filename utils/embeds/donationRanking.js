const { EmbedBuilder, escapeMarkdown } = require('discord.js');
const { prettyNumbers } = require('../format');

const headerColumns = ['#', 'Clan', 'Tag', 'Don', 'Recv'];
const columnWidths = [3, 16, 9, 11, 11];
const columnAlignments = ['right', 'left', 'left', 'right', 'right'];

const pad = (value, width, align = 'left') => {
  const text = String(value ?? '');
  if (text.length >= width) return text.slice(0, width);
  return align === 'right' ? text.padStart(width, ' ') : text.padEnd(width, ' ');
};

const truncate = (value, maxLength) => {
  if (!value || value.length <= maxLength) return value ?? '';
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3)}...`;
};

const formatHeader = () => headerColumns
  .map((column, index) => pad(column, columnWidths[index], columnAlignments[index]))
  .join(' ');

const formatRow = (clan, index) => {
  const columns = [
    pad(index + 1, columnWidths[0], columnAlignments[0]),
    pad(truncate(escapeMarkdown(clan.name || 'Unknown'), columnWidths[1]), columnWidths[1], columnAlignments[1]),
    pad(clan.tag || '', columnWidths[2], columnAlignments[2]),
    pad(prettyNumbers(clan.totalDonations), columnWidths[3], columnAlignments[3]),
    pad(prettyNumbers(clan.totalDonationsReceived), columnWidths[4], columnAlignments[4]),
  ];
  return columns.join(' ');
};

const formatTable = (stats) => {
  if (!stats.length) return null;
  const headerLine = formatHeader();
  const divider = '-'.repeat(headerLine.length);
  const rows = stats.map(formatRow);
  const content = [headerLine, divider, ...rows].join('\n');
  return `\`\`\`\n${content}\n\`\`\``;
};

const formatTimestamp = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
};

const getDonationRankingEmbed = ({ stats, seasonDayCount, generatedAt, fromCache, errors, limit }) => {
  const embed = new EmbedBuilder().setColor(0xf59e0b).setTitle('Clan Donation Ranking');

  const totalShown = stats.length;
  const descriptionParts = [];

  if (seasonDayCount) {
    descriptionParts.push(`Season day ${seasonDayCount}`);
  }

  descriptionParts.push(`Showing top ${totalShown}${limit ? ` of ${limit}` : ''} clans by donations sent/received.`);

  if (errors && errors.length) {
    descriptionParts.push(`Skipped ${errors.length} clan${errors.length === 1 ? '' : 's'} due to fetch errors.`);
  }

  embed.setDescription(descriptionParts.join(' | '));

  const table = formatTable(stats);
  if (table) {
    embed.addFields({ name: 'Donations (Sent / Received)', value: table });
  } else {
    embed.addFields({ name: 'Donations (Sent / Received)', value: 'No donation data available yet.' });
  }

  embed.setFooter({
    text: `${fromCache ? 'Cached snapshot' : 'Live snapshot'} | Updated ${formatTimestamp(generatedAt)}`,
  });

  return embed;
};

module.exports = {
  getDonationRankingEmbed,
};

