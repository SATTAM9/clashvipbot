const { EmbedBuilder } = require('discord.js')
const MAX_MEMBERS = 3
const { prettyNumbers } = require('../format');
const emojis = require('../../emojis.json');
const { parseTag } = require('../arguments/tagHandling');
const { buildPlayerNameChangeEntries, buildPlayerClanHistoryEntries, cleanHistoryName } = require('../historyFormatter');

const buildProfileDescriptionLines = (profile, endTimestamp) => [
    `**Player tag:** \`${profile.tag}\``,
    `${emojis.link} **[View profile in-game](https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${parseTag(profile.tag)})**`,
    `${emojis.clock} ${ endTimestamp ? `Menu timeout <t:${endTimestamp}:R>` : `Calculating menu timeout...`}`
];

const VERIFIED_FOOTER = {
    text: 'Verified under this account',
    iconURL: 'https://media.discordapp.net/attachments/582092054264545280/935702845183918160/check-mark_2714-fe0f.png'
};

const getTroopShowcaseEmbed = async (profile, verified, endTimestamp, fileName) => {
    const descriptionLines = buildProfileDescriptionLines(profile, endTimestamp);

    const embed = new EmbedBuilder()
        .setTitle(`${getLeagueEmote(profile.trophies)} ${profile.name} - Army showcase`)
        .setURL(`https://www.clashofstats.com/players/${getURLName(profile)}-${getURLTag(profile)}/summary`)
        .setColor('#33E3FF')
        .setDescription(descriptionLines.join('\n'))
        .setImage(`attachment://${fileName}`)
        .setThumbnail('https://i.imgur.com/wbbK27a.png')
    if (verified) embed.setFooter(VERIFIED_FOOTER)
    return embed
}

const getProfileEmbed = async (profile, verified, endTimestamp, fileName, thumbnailFileName) => {
    
    const descriptionLines = buildProfileDescriptionLines(profile, endTimestamp);

    const embed = new EmbedBuilder()
        .setTitle(`${getLeagueEmote(profile.trophies)} ${profile.name} • Profile overview`)
        .setURL(`https://www.clashofstats.com/players/${getURLName(profile)}-${getURLTag(profile)}/summary`)
        .setColor('#33E3FF')
        .setDescription(descriptionLines.join('\n'))
        .setImage(`attachment://${fileName}`);

    if (thumbnailFileName) {
        embed.setThumbnail(`attachment://${thumbnailFileName}`);
    }

    if (verified) embed.setFooter(VERIFIED_FOOTER)

    return embed
}

const getClanEmbed = (clan) => {
    const embed = new EmbedBuilder()
        .setTitle(`${emojis.versusbattles} ${clan.name} ${clan.tag}`)
        .setURL(`https://www.clashofstats.com/clans/${getURLClanName(clan)}-${getURLClanTag(clan)}/summary`)
        .setThumbnail(clan.badgeUrls.medium)
        .setColor('#33E3FF')
        .addFields(
        {
            name: 'War wins',
            value: `${emojis.zap} ${prettyNumbers(clan.warWins)}`,
            inline: true
        },
        {
            name: 'War losses',
            value: `${emojis.dash} ${clan.warLosses ? prettyNumbers(clan.warLosses) : 'Private'}`,
            inline: true
        },
        {
            name: 'War league',
            value: `${getWarLeagueEmote(clan.warLeague.id)} ${clan.warLeague.name}`,
            inline: true
        }, 

        {
            name: 'Required trophies',
            value: `${emojis.trophy} ${prettyNumbers(clan.requiredTrophies)}`,
            inline: true
        },
        {
            name: 'Clan trophies',
            value: `${emojis.trophy} ${clan.clanPoints ? prettyNumbers(clan.clanPoints) : 0}`,
            inline: true
        }, 
        {
            name: 'Members',
            value: `${emojis.personsilhouette} ${prettyNumbers(clan.members)}/50`,
            inline: true
        },

        {
            name: 'Required builder cups',
            value: `${emojis.buildertrophy} ${prettyNumbers(clan.requiredBuilderBaseTrophies)}`,
            inline: true
        },
        {
            name: 'Clan builder cups',
            value: `${emojis.buildertrophy} ${clan.clanBuilderBasePoints ? prettyNumbers(clan.clanBuilderBasePoints) : 0}`,
            inline: true
        }, 
        {
            name: 'Language',
            value: `${emojis.speech} ${clan.chatLanguage ? prettyNumbers(clan.chatLanguage.name) : 'Not set'}`,
            inline: true
        },

        {
            name: 'Top players',
            value: getTopMemberNames(clan) ?? "No players",
            inline: true
        },
        {
            name: 'Tag',
            value: getTopMemberTags(clan) ?? "-",
            inline: true
        },
        {
            name: 'Trophies',
            value: getTopMemberTrophies(clan) ?? "-",
            inline: true
        });
        
        if (clan.description !== "") embed.setDescription(clan.description)

        const donationSummary = summarizeClanDonations(clan);
        if (donationSummary) {
            const donationLines = [
                `Donated: ${prettyNumbers(donationSummary.donated)}`,
                `Received: ${prettyNumbers(donationSummary.received)}`,
                `Total: ${prettyNumbers(donationSummary.total)}`,
                `Daily (season avg): ${prettyNumbers(donationSummary.daily)}`
            ];

            if (donationSummary.topDonor) {
                donationLines.push(`Top donor: ${donationSummary.topDonor.name} (${prettyNumbers(donationSummary.topDonor.donations)})`);
            }

            embed.addFields({
                name: 'Donations',
                value: donationLines.join('\n'),
                inline: false
            });
        }

        if (Array.isArray(clan.labels) && clan.labels.length > 0) embed.setFooter({text: `${clan.labels[0].name}`, iconURL: `${clan.labels[0].iconUrls.small}` });
        return embed
}


const summarizeClanDonations = (clan) => {
    const members = Array.isArray(clan.memberList) ? clan.memberList : [];
    if (!members.length) return null;

    let donated = 0;
    let received = 0;
    let topDonor = null;

    for (const member of members) {
        const donatedValue = Number(member?.donations ?? 0);
        const receivedValue = Number(member?.received ?? 0);

        donated += donatedValue;
        received += receivedValue;

        if (!topDonor || donatedValue > topDonor.donations) {
            topDonor = {
                name: member?.name ?? 'Unknown',
                donations: donatedValue,
            };
        }
    }

    const total = donated + received;
    const seasonDayCount = getSeasonDayCount();
    const daily = seasonDayCount > 0 ? Math.round(total / seasonDayCount) : total;

    return {
        donated,
        received,
        total,
        daily,
        topDonor,
    };
};

const clampFieldValue = (value) => {
    if (!value) return '-';
    return value.length > 1024 ? `${value.slice(0, 1019)}...` : value;
};

const interpretHistoryResult = (historyResult) => {
    if (!historyResult || typeof historyResult !== 'object') {
        return { payload: null, error: 'History service unavailable.' };
    }

    if (!historyResult.ok) {
        return { payload: null, error: historyResult.error || 'History service unavailable.' };
    }

    const payload = historyResult.data || null;
    if (!payload) {
        return { payload: null, error: 'History service returned no data.' };
    }

    const successFlag = payload.success === 1 || payload.success === true;
    const warning = successFlag ? null : (payload.error || 'History data may be incomplete.');

    return { payload, warning };
};

const buildLimitedList = (entries, limit, formatter) => {
    if (!Array.isArray(entries) || !entries.length) {
        return null;
    }

    const limited = entries.slice(0, limit);
    const lines = limited.map(formatter).filter(Boolean);
    if (!lines.length) return null;

    if (entries.length > limit) {
        lines.push(`• …and ${entries.length - limit} more`);
    }

    return lines.join('\n');
};

const formatNameChangeEntry = (entry) => {
    if (!entry) return '';
    const timestamp = entry.timestamp || 'Timestamp unavailable';
    const from = entry.from ? `“${entry.from}”` : '';
    const to = entry.to ? `“${entry.to}”` : '';

    let summary = 'Name change recorded';
    if (from && to) summary = `${from} → ${to}`;
    else if (to) summary = `Now ${to}`;
    else if (from) summary = `Formerly ${from}`;

    return `• ${timestamp} — ${summary}`;
};

const formatClanHistoryEntry = (entry) => {
    if (!entry) return '';
    const timestamp = entry.timestamp || 'Timestamp unavailable';
    const action = entry.action || 'Clan activity';
    const parts = [entry.clanName, entry.clanTag, entry.clanAffiliation].map((value) => value && value.trim()).filter(Boolean);
    const location = parts.length ? ` (${parts.join(' • ')})` : '';
    return `• ${timestamp} — ${action}${location}`;
};

const buildAliasesField = (names) => {
    if (!Array.isArray(names) || !names.length) return null;
    const aliases = names
        .map((name) => cleanHistoryName(name))
        .filter(Boolean);
    if (!aliases.length) return null;
    const unique = Array.from(new Set(aliases));
    return clampFieldValue(unique.slice(0, 10).join(', '));
};

const buildCurrentClanField = (currentClan) => {
    if (!currentClan || typeof currentClan !== 'object') return null;
    const name = cleanHistoryName(currentClan.name || currentClan.raw || '');
    const normalizedTag = currentClan.tag ? String(currentClan.tag).toUpperCase() : '';
    const tag = normalizedTag.startsWith('#') ? normalizedTag : (normalizedTag ? `#${normalizedTag}` : '');
    const affiliation = cleanHistoryName(currentClan.affiliation || '');

    const parts = [name, tag, affiliation].filter(Boolean);
    if (!parts.length) return null;
    return clampFieldValue(parts.join(' • '));
};

const appendHistoryDataFootnote = (lines) => {
    if (!Array.isArray(lines)) return '';
    return [...lines, '_History data provided by clashvip.io_'].join('\n');
};

const getHistoryEmbed = (profile, verified, endTimestamp, historyResult) => {
    const embed = new EmbedBuilder()
        .setTitle(`📜 ${profile.name} • Player history`)
        .setURL(`https://www.clashofstats.com/players/${getURLName(profile)}-${getURLTag(profile)}/summary`)
        .setColor('#33E3FF')
        .setDescription(appendHistoryDataFootnote(buildProfileDescriptionLines(profile, endTimestamp)));

    if (verified) embed.setFooter(VERIFIED_FOOTER);

    const { payload, warning, error } = interpretHistoryResult(historyResult);

    if (!payload) {
        embed.addFields({
            name: 'History unavailable',
            value: clampFieldValue(error || 'History data is currently unavailable.'),
        });
        return embed;
    }

    const nameChanges = buildPlayerNameChangeEntries(payload.nameChanges, payload.trackedActions);
    const clanHistory = buildPlayerClanHistoryEntries(payload.trackedActions);

    const nameChangeField = buildLimitedList(nameChanges, 5, formatNameChangeEntry) || 'No recorded name changes.';
    const clanHistoryField = buildLimitedList(clanHistory, 5, formatClanHistoryEntry) || 'No recent clan movements captured.';

    embed.addFields(
        { name: 'Name changes', value: clampFieldValue(nameChangeField), inline: false },
        { name: 'Clan history', value: clampFieldValue(clanHistoryField), inline: false }
    );

    const aliases = buildAliasesField(payload.names);
    if (aliases) {
        embed.addFields({ name: 'Known names', value: aliases, inline: false });
    }

    const currentClan = buildCurrentClanField(payload.currentClan);
    if (currentClan) {
        embed.addFields({ name: 'Current clan', value: currentClan, inline: false });
    }

    if (warning) {
        embed.addFields({ name: 'Notes', value: clampFieldValue(warning), inline: false });
    }

    return embed;
};

const getHeroEmbed = (profile, verified, endTimestamp, fileName) => {
    const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${profile.name} • Heroes`)
        .setURL(`https://www.clashofstats.com/players/${getURLName(profile)}-${getURLTag(profile)}/summary`)
        .setColor('#33E3FF')
        .setDescription(buildProfileDescriptionLines(profile, endTimestamp).join('\n'));

    if (fileName) {
        embed.setImage(`attachment://${fileName}`);
    }

    if (verified) embed.setFooter(VERIFIED_FOOTER);

    const heroes = Array.isArray(profile.heroes) ? profile.heroes : [];

    if (!heroes.length) {
        embed.addFields({
            name: 'No hero data',
            value: 'Hero information is not available for this profile.',
            inline: false,
        });
        return embed;
    }

    return embed;
};

const getClanActivityEmbed = (profile, verified, endTimestamp, historyResult) => {
    const embed = new EmbedBuilder()
        .setTitle(`🛡️ ${profile.name} • Clan activity`)
        .setURL(`https://www.clashofstats.com/players/${getURLName(profile)}-${getURLTag(profile)}/summary`)
        .setColor('#33E3FF')
        .setDescription(appendHistoryDataFootnote(buildProfileDescriptionLines(profile, endTimestamp)));

    if (verified) embed.setFooter(VERIFIED_FOOTER);

    const { payload, warning, error } = interpretHistoryResult(historyResult);

    if (!payload) {
        embed.addFields({
            name: 'Activity unavailable',
            value: clampFieldValue(error || 'Clan activity data is currently unavailable.'),
        });
        return embed;
    }

    const clanHistory = buildPlayerClanHistoryEntries(payload.trackedActions);
    const activityField = buildLimitedList(clanHistory, 10, formatClanHistoryEntry) || 'No recent clan activity recorded.';

    embed.addFields({ name: 'Recent activity', value: clampFieldValue(activityField), inline: false });

    const currentClan = buildCurrentClanField(payload.currentClan);
    if (currentClan) {
        embed.addFields({ name: 'Current clan', value: currentClan, inline: false });
    }

    if (warning) {
        embed.addFields({ name: 'Notes', value: clampFieldValue(warning), inline: false });
    }

    return embed;
};

const getSeasonDayCount = () => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const diff = now.getTime() - start.getTime();
    return Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000)) + 1);
};

const getLeagueEmote = (trophycount) => {
    if (trophycount >= 5000) return emojis.legend
    if (trophycount >= 4100) return emojis.titan
    if (trophycount >= 3200) return emojis.champion
    if (trophycount >= 2600) return emojis.master
    if (trophycount >= 2000) return emojis.crystal
    if (trophycount >= 1400) return emojis.goldrank
    if (trophycount >= 800) return emojis.silver
    if (trophycount >= 400) return emojis.bronze
    return emojis.unranked
}

const getTownhallEmote = (thlvl) => {
    switch(thlvl) {
        case 17:
            return emojis.th17
        case 16:
            return emojis.th16
        case 15:
            return emojis.th15
        case 14:
            return emojis.th14
        case 13:
            return emojis.th13
        case 12:
            return emojis.th12
        case 11:
            return emojis.th11
        case 10:
            return emojis.th10
        case 9:
            return emojis.th9
        default:
            return emojis.th8
    }
}

function getWarLeagueEmote(warLeagueId){
    if (warLeagueId > 48000015) return emojis.champion
    if (warLeagueId > 48000012) return emojis.master
    if (warLeagueId > 48000009) return emojis.crystal
    if (warLeagueId > 48000006) return emojis.goldrank
    if (warLeagueId > 48000003) return emojis.silver
    if (warLeagueId > 48000000) return emojis.bronze
    else return emojis.unranked
}

const getURLTag = (profile) => profile.tag.substr(1)
const getURLName = (profile) => encodeURIComponent(profile.name.replace(/\s+/g, '-').toLowerCase())
const getURLClanTag = (clan) => clan.tag.substr(1)
const getURLClanName = (clan) => encodeURIComponent(clan.name.replace(/[\s+]/g, '-').toLowerCase())
const getTopMemberNames = (clan) => fillEmptyString(getTopMembers(clan.memberList).map((member) => member.name).join("\n"))
const getTopMemberTags = (clan) => fillEmptyString(getTopMembers(clan.memberList).map((member) => member.tag).join("\n"))
const getTopMemberTrophies = (clan) => fillEmptyString(getTopMembers(clan.memberList).map((member) => member.trophies).join("\n"))
const getTopMembers = (memberList) => memberList.slice(0, MAX_MEMBERS)

const fillEmptyString = (str) => str == '' ? '-' : str

module.exports = {
    getProfileEmbed,
    getClanEmbed,
    getTroopShowcaseEmbed,
    getHeroEmbed,
    getHistoryEmbed,
    getClanActivityEmbed
} 
