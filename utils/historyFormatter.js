'use strict';

const HISTORY_TIMESTAMP_PATTERN = /(\d{4}-\d{2}-\d{2}|\d{2}[./]\d{2}[./]\d{4})(?:\s+|T)?(\d{2}:\d{2}(?::\d{2})?)?/;

const formatHistoryTimestamp = (value) => {
  if (value === null || value === undefined) return '';

  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const looksIsoLike = /\d{4}-\d{2}-\d{2}/.test(normalized) || /\d{2}[./]\d{2}[./]\d{4}/.test(normalized);
  if (looksIsoLike) return normalized;

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString();
  }

  const fallback = normalized.match(HISTORY_TIMESTAMP_PATTERN);
  if (fallback) {
    const [, datePart, timePart] = fallback;
    return [datePart, timePart || ''].filter(Boolean).join(' ').trim();
  }

  return normalized;
};

const cleanHistoryName = (value) => {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim().replace(/^"|"$/g, '');
};

const parseNamesFromHistoryText = (text) => {
  if (!text) return { from: '', to: '' };

  const matchFromTo = text.match(/changed(?: their)? name from\s+"?([^"']+?)"?\s+to\s+"?([^"']+?)"?/i);
  if (matchFromTo) {
    return { from: cleanHistoryName(matchFromTo[1]), to: cleanHistoryName(matchFromTo[2]) };
  }

  const matchToFrom = text.match(/changed(?: their)? name to\s+"?([^"']+?)"?\s+from\s+"?([^"']+?)"?/i);
  if (matchToFrom) {
    return { from: cleanHistoryName(matchToFrom[2]), to: cleanHistoryName(matchToFrom[1]) };
  }

  const matchToOnly = text.match(/changed(?: their)? name to\s+"?([^"']+?)"?/i);
  if (matchToOnly) {
    return { from: '', to: cleanHistoryName(matchToOnly[1]) };
  }

  const matchFromOnly = text.match(/changed(?: their)? name from\s+"?([^"']+?)"?/i);
  if (matchFromOnly) {
    return { from: cleanHistoryName(matchFromOnly[1]), to: '' };
  }

  return { from: '', to: '' };
};

const sanitizeClanHistoryActionText = (action) => {
  if (!action) return '';

  const normalized = String(action).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const lower = normalized.toLowerCase();
  const mentionsDonationReset =
    lower.includes('donations/receives') ||
    lower.includes('donations / receives') ||
    lower.includes('reset donations') ||
    lower.includes('donations reset') ||
    lower.includes('reset receives');

  if (!mentionsDonationReset) return normalized;

  let sanitized = normalized
    .replace(/(?:reset\s+)?donations\s*\/\s*receives[:\s-]*.*$/i, '')
    .replace(/\b(?:donations?|receives?|received)\s*[:=]\s*\d+(?:\/\d+)?/gi, '')
    .replace(/\bdonations\s*\/\s*receives\b/gi, '');

  sanitized = sanitized
    .replace(/\s{2,}/g, ' ')
    .replace(/[,;:]\s*$/, '')
    .replace(/[-\u2013\u2014]\s*$/, '')
    .trim();

  return sanitized;
};

const buildPlayerNameChangeEntries = (rawNameChanges, trackedActions) => {
  const entries = [];
  const seen = new Set();

  const pushEntry = (timestamp, from, to, sourceKey) => {
    const formattedTimestamp = formatHistoryTimestamp(timestamp);
    const label = formattedTimestamp || 'Timestamp unavailable';
    const fromLabel = cleanHistoryName(from);
    const toLabel = cleanHistoryName(to);

    if (!label && !fromLabel && !toLabel) return;

    const dedupeKey = [label, fromLabel, toLabel, sourceKey || ''].join('|');
    if (seen.has(dedupeKey)) return;

    entries.push({ timestamp: label, from: fromLabel, to: toLabel });
    seen.add(dedupeKey);
  };

  if (Array.isArray(rawNameChanges)) {
    rawNameChanges.forEach((change, index) => {
      if (change === null || change === undefined) return;

      if (typeof change === 'string') {
        pushEntry(change, '', '', `raw:${index}`);
        return;
      }

      if (typeof change !== 'object') return;

      const timestampSource =
        change.timestamp || change.time || change.date || change.when || change.raw || change.value || '';

      let fromName = change.from || change.previous || change.old || '';
      let toName = change.to || change.current || change.new || '';

      if (!fromName && !toName) {
        const parsed = parseNamesFromHistoryText(change.action || change.description || change.detail || '');
        fromName = parsed.from;
        toName = parsed.to;
      }

      pushEntry(timestampSource, fromName, toName, `raw:${index}`);
    });
  }

  if (!entries.length && Array.isArray(trackedActions)) {
    trackedActions.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;

      const actionText = typeof item.action === 'string' ? item.action : '';
      if (!actionText || !actionText.toLowerCase().includes('changed name')) return;

      const parsed = parseNamesFromHistoryText(actionText);
      const timestampSource = item.timestamp || item.time || '';
      pushEntry(timestampSource, parsed.from, parsed.to, `tracked:${index}`);
    });
  }

  return entries;
};

const buildPlayerClanHistoryEntries = (trackedActions) => {
  if (!Array.isArray(trackedActions)) return [];

  const entries = [];
  const seen = new Set();

  const toSortableValue = (value) => {
    if (!value) return Number.NEGATIVE_INFINITY;

    const normalized = String(value).trim();
    if (!normalized) return Number.NEGATIVE_INFINITY;

    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();

    const isoLike = normalized.replace(/\s+/g, ' ').replace(' ', 'T');
    const fallback = Date.parse(isoLike);
    return Number.isNaN(fallback) ? Number.NEGATIVE_INFINITY : fallback;
  };

  trackedActions.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;

    const rawAction = typeof item.action === 'string' ? item.action : '';
    const actionText = rawAction.replace(/\s+/g, ' ').trim();
    const sanitizedAction = sanitizeClanHistoryActionText(actionText);
    const lowerAction = actionText.toLowerCase();

    const clanInfo = item.clan || {};
    const clanName = cleanHistoryName(clanInfo.name || clanInfo.raw || '');
    const normalizedTag = String(clanInfo.tag || '').replace(/^#/, '').toUpperCase();
    const clanTag = normalizedTag ? `#${normalizedTag}` : '';
    const clanAffiliation = cleanHistoryName(clanInfo.affiliation || '');

    const hasClanKeyword = lowerAction.includes('clan');
    if (!hasClanKeyword && !clanName && !clanTag) return;
    if (!sanitizedAction && !clanName && !clanTag && !clanAffiliation) return;

    const rawTimestamp = item.timestamp || item.time || '';
    const formattedTimestamp = formatHistoryTimestamp(rawTimestamp);
    const dedupeKey = [formattedTimestamp, sanitizedAction, clanName, clanTag, clanAffiliation].join('|');

    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    entries.push({
      key: `${formattedTimestamp || 'timestamp-unavailable'}-${index}`,
      timestamp: formattedTimestamp || 'Timestamp unavailable',
      action: sanitizedAction,
      clanName,
      clanTag,
      clanAffiliation,
      sortValue: toSortableValue(rawTimestamp || formattedTimestamp),
    });
  });

  entries.sort((a, b) => {
    const diff = b.sortValue - a.sortValue;
    if (diff !== 0) return diff;
    return b.timestamp.localeCompare(a.timestamp);
  });

  return entries.map((entry) => {
    const clone = { ...entry };
    delete clone.sortValue;
    return clone;
  });
};

module.exports = {
  formatHistoryTimestamp,
  cleanHistoryName,
  parseNamesFromHistoryText,
  sanitizeClanHistoryActionText,
  buildPlayerNameChangeEntries,
  buildPlayerClanHistoryEntries,
};

