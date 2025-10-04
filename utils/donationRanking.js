const fs = require('fs/promises');
const path = require('path');
const NodeCache = require('node-cache');
const Bottleneck = require('bottleneck');
const { parseTag, isTagValid } = require('./arguments/tagHandling');
const { findClan } = require('../dao/clash/clans');
const { getConfig } = require('../config');

const DEFAULT_CACHE_TTL = Math.max(60, Number(process.env.TOP_DONATION_CACHE_TTL) || 300);
const MAX_TRACKED_CLANS = Math.max(1, Number(process.env.TOP_DONATION_MAX_CLANS) || 100);
const MAX_PER_SECOND = Math.max(1, Number(process.env.TOP_DONATION_MAX_PER_SECOND) || 6);
const MAX_PER_MINUTE = Math.max(MAX_PER_SECOND, Number(process.env.TOP_DONATION_MAX_PER_MINUTE) || 200);
const MAX_CONCURRENT = Math.max(1, Number(process.env.TOP_DONATION_MAX_CONCURRENT) || 2);
const MIN_TIME_MS = Math.max(0, Number(process.env.TOP_DONATION_MIN_TIME_MS) || 0);

const CACHE_KEY_PREFIX = 'donation-ranking';
const dataPath = path.join(__dirname, '..', 'data', 'donationClans.json');

const rankingCache = new NodeCache({
  stdTTL: DEFAULT_CACHE_TTL,
  checkperiod: Math.max(30, Math.min(DEFAULT_CACHE_TTL, 300)),
  useClones: false,
});

const perSecondLimiter = new Bottleneck({
  reservoir: MAX_PER_SECOND,
  reservoirRefreshAmount: MAX_PER_SECOND,
  reservoirRefreshInterval: 1000,
  maxConcurrent: MAX_CONCURRENT,
  minTime: MIN_TIME_MS,
});

const perMinuteLimiter = new Bottleneck({
  reservoir: MAX_PER_MINUTE,
  reservoirRefreshAmount: MAX_PER_MINUTE,
  reservoirRefreshInterval: 60_000,
});

const limiter = perSecondLimiter.chain(perMinuteLimiter);

let staticTagList = null;

const getCacheKey = (guildId) => `${CACHE_KEY_PREFIX}:${guildId || 'global'}`;

const loadStaticTags = async () => {
  if (staticTagList) return staticTagList;
  try {
    const raw = await fs.readFile(dataPath, 'utf8');
    const parsed = JSON.parse(raw);
    staticTagList = Array.isArray(parsed) ? parsed : [];
  }
  catch (error) {
    console.warn('[donationRanking] Failed to load donationClans.json:', error.message);
    staticTagList = [];
  }
  return staticTagList;
};

const parseEnvTags = (raw) => {
  if (!raw) return [];
  return String(raw)
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);
};

const sanitizeClanTags = (tags) => {
  const unique = new Set();
  for (const entry of tags) {
    if (!entry) continue;
    let normalized;
    try {
      normalized = parseTag(String(entry));
    }
    catch (error) {
      continue;
    }
    if (!normalized || !isTagValid(normalized)) continue;
    unique.add(normalized);
    if (unique.size >= MAX_TRACKED_CLANS) break;
  }
  return Array.from(unique);
};

const loadGuildConfiguredTags = async (guildId) => {
  if (!guildId) return [];
  try {
    const config = await getConfig(guildId);
    const raw = config?.donationClans;
    return Array.isArray(raw) ? raw : [];
  }
  catch (error) {
    console.warn(`[donationRanking] Failed to load guild configuration for ${guildId}:`, error.message);
    return [];
  }
};

const getConfiguredClanTags = async (guildId) => {
  const staticTags = await loadStaticTags();
  const envTags = parseEnvTags(process.env.TOP_DONATION_EXTRA_CLANS);
  const guildTags = await loadGuildConfiguredTags(guildId);
  return sanitizeClanTags([...staticTags, ...envTags, ...guildTags]);
};

const getSeasonDayCount = () => {
  const now = new Date();
  const seasonStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const diff = now.getTime() - seasonStart.getTime();
  const dayCount = Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, dayCount);
};

const summarizeClanDonations = (clan, fallbackTag, seasonDayCount) => {
  const members = Array.isArray(clan?.memberList) ? clan.memberList : [];
  const totals = members.reduce(
    (acc, member) => {
      const donated = Number(member?.donations ?? 0);
      const received = Number(member?.donationsReceived ?? member?.received ?? 0);
      acc.totalDonations += Number.isFinite(donated) ? donated : 0;
      acc.totalReceived += Number.isFinite(received) ? received : 0;
      return acc;
    },
    { totalDonations: 0, totalReceived: 0 },
  );

  const totalSeason = totals.totalDonations + totals.totalReceived;
  const averageDaily = seasonDayCount > 0 ? Math.round(totalSeason / seasonDayCount) : totalSeason;

  const badgeUrls = clan?.badgeUrls || {};
  const badgeUrl = badgeUrls.large || badgeUrls.medium || badgeUrls.small || null;

  return {
    name: clan?.name || 'Unknown clan',
    tag: clan?.tag || `#${fallbackTag}`,
    clanLevel: Number(clan?.clanLevel) || null,
    members: Number(clan?.members) || members.length || null,
    badgeUrl,
    totalDonations: totals.totalDonations,
    totalDonationsReceived: totals.totalReceived,
    totalSeasonDonations: totalSeason,
    averageDailyDonations: averageDaily,
  };
};

const computeRankingSnapshot = async (guildId) => {
  const tags = await getConfiguredClanTags(guildId);
  const seasonDayCount = getSeasonDayCount();

  if (!tags.length) {
    return {
      seasonDayCount,
      generatedAt: new Date().toISOString(),
      stats: [],
      errors: [{ message: 'No clan tags configured for donation ranking.' }],
    };
  }

  const results = await Promise.all(
    tags.map(async (tag) => {
      try {
        const response = await limiter.schedule(() => findClan(tag));
        if (!response?.response) {
          return { ok: false, tag: `#${tag}`, message: response?.error || 'Unknown error retrieving clan.' };
        }
        if (!response.response.found) {
          return { ok: false, tag: `#${tag}`, message: 'Clan not found.' };
        }
        const clan = response.response.data;
        const summary = summarizeClanDonations(clan, tag, seasonDayCount);
        return { ok: true, data: summary };
      }
      catch (error) {
        return { ok: false, tag: `#${tag}`, message: error?.message || 'Request failed.' };
      }
    }),
  );

  const stats = results
    .filter((result) => result.ok)
    .map((result) => result.data)
    .sort((a, b) => b.totalSeasonDonations - a.totalSeasonDonations);

  const errors = results
    .filter((result) => !result.ok)
    .map(({ tag, message }) => ({ tag, message }));

  return {
    seasonDayCount,
    generatedAt: new Date().toISOString(),
    stats,
    errors,
  };
};

const getTopDonationClans = async (limit = 10, options = {}) => {
  const resolvedLimit = Math.max(1, Math.min(Number(limit) || 10, MAX_TRACKED_CLANS));
  const forceRefresh = Boolean(options.forceRefresh);
  const guildId = options.guildId ? String(options.guildId) : null;
  const cacheKey = getCacheKey(guildId);

  let snapshot = forceRefresh ? null : rankingCache.get(cacheKey);
  let fromCache = Boolean(snapshot);

  if (!snapshot) {
    snapshot = await computeRankingSnapshot(guildId);
    rankingCache.set(cacheKey, snapshot);
    fromCache = false;
  }

  return {
    seasonDayCount: snapshot.seasonDayCount,
    generatedAt: snapshot.generatedAt,
    stats: snapshot.stats.slice(0, resolvedLimit),
    errors: snapshot.errors,
    fromCache,
  };
};

const clearDonationRankingCache = (guildId) => {
  if (guildId) {
    rankingCache.del(getCacheKey(guildId));
  } else {
    rankingCache.flushAll();
  }
};

module.exports = {
  getTopDonationClans,
  clearDonationRankingCache,
};