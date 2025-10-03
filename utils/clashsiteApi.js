'use strict';

require('dotenv').config();

const axios = require('axios');
const { parseTag } = require('./arguments/tagHandling');

const DEFAULT_BASE_URL = 'https://clashvip.io/api';
const baseUrl = (process.env.CLASHSITE_API_BASE || DEFAULT_BASE_URL).replace(/\/$/, '');
const timeoutMs = Number(process.env.CLASHSITE_API_TIMEOUT_MS) || 10000;

const client = axios.create({
  baseURL: baseUrl,
  timeout: timeoutMs,
});

const sanitizeTagForApi = (tag) => {
  if (!tag) return '';
  try {
    return parseTag(tag);
  } catch {
    return '';
  }
};

const buildFailure = (error, status) => ({
  ok: false,
  status: typeof status === 'number' ? status : null,
  error,
});

const handleAxiosError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    const message = (data && (data.error || data.message)) || `Request failed with status ${status}`;
    return buildFailure(message, status);
  }

  if (error.request) {
    return buildFailure('No response received from history service.', null);
  }

  return buildFailure(error.message || 'Unexpected error contacting history service.', null);
};

const fetchPlayerHistory = async (tag) => {
  const normalizedTag = sanitizeTagForApi(tag);
  if (!normalizedTag) {
    return buildFailure('Invalid player tag provided.', 400);
  }

  try {
    const response = await client.get(`/players/${encodeURIComponent(normalizedTag)}/history`);
    return { ok: true, data: response.data };
  } catch (error) {
    return handleAxiosError(error);
  }
};

const fetchClanHistory = async (tag) => {
  const normalizedTag = sanitizeTagForApi(tag);
  if (!normalizedTag) {
    return buildFailure('Invalid clan tag provided.', 400);
  }

  try {
    const response = await client.get(`/clans/${encodeURIComponent(normalizedTag)}/history`);
    return { ok: true, data: response.data };
  } catch (error) {
    return handleAxiosError(error);
  }
};

module.exports = {
  fetchPlayerHistory,
  fetchClanHistory,
};

