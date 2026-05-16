const express = require('express');
const ChallengeOwnership = require('../models/ChallengeOwnership');
const { verifyToken, hasRole } = require('../middleware/auth');

const router = express.Router();

const ONECOMPILER_API_BASE = 'https://api.onecompiler.com';
const ONECOMPILER_PUBLIC_BASE = 'https://onecompiler.com';
const ONECOMPILER_TIMEOUT_MS = Number.parseInt(process.env.ONECOMPILER_TIMEOUT_MS || '25000', 10);

const languageExtensionMap = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'cs',
  go: 'go',
  ruby: 'rb',
  php: 'php'
};

const getOneCompilerApiKey = () => {
  const candidates = [
    process.env.ONECOMPILER_API_KEY,
    process.env.ONE_COMPILER_API_KEY,
    process.env.ONECOMPILER_ACCESS_TOKEN,
    process.env.ONECOMPILER_KEY
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
};

const getErrorMessageFromUpstream = (payload, fallback) => {
  if (!payload) return fallback;

  if (typeof payload === 'string') {
    return payload;
  }

  return (
    payload.error ||
    payload.message ||
    payload.reason ||
    payload.errorMessage ||
    payload?.data?.error ||
    fallback
  );
};

const toChallengeList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.value)) {
    return payload.value;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const parseBooleanInput = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return fallback;
};

const normalizeChallengeSummary = (row) => {
  const tags = Array.isArray(row?.tags)
    ? row.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
    : [];

  return {
    id: String(row?._id || row?.id || row?.challengeId || '').trim(),
    title: String(row?.title || row?.name || 'Untitled Challenge').trim(),
    slug: String(row?.link || row?.slug || '').trim() || null,
    tags,
    raw: row
  };
};

const normalizeChallengeListFilters = (challengeIds = []) => ({
  type: 'listAllChallengeIds',
  filters: {
    challengeIds,
    userIds: []
  }
});

const listChallengesByIds = async ({ apiKey, challengeIds = [], searchText = '', limit = 50 }) => {
  if (!challengeIds.length) {
    return { total: 0, challenges: [] };
  }

  const reportPayload = normalizeChallengeListFilters(challengeIds);
  const upstream = await callOneCompiler({
    url: `${ONECOMPILER_API_BASE}/v1/reports?access_token=${encodeURIComponent(apiKey)}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportPayload)
  });

  if (!upstream.ok) {
    return { error: upstream, challenges: [] };
  }

  const allChallenges = toChallengeList(upstream.payload)
    .map(normalizeChallengeSummary)
    .filter((item) => item.id);

  const allowedIds = new Set(challengeIds.map((id) => String(id)));
  const scopedChallenges = allChallenges.filter((item) => allowedIds.has(item.id));

  const normalizedSearch = String(searchText || '').trim().toLowerCase();
  const filteredChallenges = normalizedSearch
    ? scopedChallenges.filter((item) => (
      item.title.toLowerCase().includes(normalizedSearch)
      || item.id.toLowerCase().includes(normalizedSearch)
      || item.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch))
    ))
    : scopedChallenges;

  return {
    total: scopedChallenges.length,
    challenges: filteredChallenges.slice(0, limit)
  };
};

const readJsonOrText = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const toObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
);

const firstNonEmptyString = (values = []) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const isProblemEffectivelyBlank = (problem) => {
  const row = toObject(problem);
  const rowProperties = toObject(row.properties);
  const rowCodeOptions = toObject(toObject(rowProperties.options).code);
  const validations = Array.isArray(rowCodeOptions.validations)
    ? rowCodeOptions.validations.filter((entry) => Boolean(entry))
    : [];

  const hasId = Boolean(firstNonEmptyString([row._id, row.id]));
  const hasTitle = Boolean(firstNonEmptyString([row.title]));
  const hasMarkdown = Boolean(firstNonEmptyString([row.markdown]));
  const hasValidations = validations.length > 0;

  return !hasId && !hasTitle && !hasMarkdown && !hasValidations;
};

const extractChallengeId = (payload) => firstNonEmptyString([
  payload?.challengeId,
  payload?.challenge_id,
  payload?.id,
  payload?._id,
  payload?.doc?.challengeId,
  payload?.doc?.id,
  payload?.doc?._id,
  payload?.data?.challengeId,
  payload?.data?.id,
  payload?.data?._id,
  payload?.challenge?.challengeId,
  payload?.challenge?.id,
  payload?.challenge?._id
]);

const extractChallengePayload = (payload) => {
  if (payload && typeof payload === 'object') {
    if (payload.challenge && Array.isArray(payload.problems)) {
      return { challenge: payload.challenge, problems: payload.problems };
    }
    if (payload.data?.challenge && Array.isArray(payload.data?.problems)) {
      return { challenge: payload.data.challenge, problems: payload.data.problems };
    }
    if (payload.doc?.challenge && Array.isArray(payload.doc?.problems)) {
      return { challenge: payload.doc.challenge, problems: payload.doc.problems };
    }
  }

  return null;
};

const callOneCompiler = async ({ url, method = 'GET', headers = {}, body }) => {
  const controller = new AbortController();
  const timeoutMs = Number.isFinite(ONECOMPILER_TIMEOUT_MS) ? ONECOMPILER_TIMEOUT_MS : 25000;
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal
    });

    const payload = await readJsonOrText(response);

    return {
      ok: response.ok,
      status: response.status,
      payload
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const normalizeRunFiles = (language, files, code, fileName) => {
  if (Array.isArray(files) && files.length > 0) {
    return files
      .map((file) => ({
        name: String(file?.name || '').trim(),
        content: String(file?.content || '')
      }))
      .filter((file) => file.name && file.content.length > 0);
  }

  if (!code || typeof code !== 'string') {
    return [];
  }

  const normalizedLanguage = String(language || '').toLowerCase();
  const extension = languageExtensionMap[normalizedLanguage] || 'txt';
  const fallbackName = normalizedLanguage === 'java' ? 'Main.java' : `main.${extension}`;
  const requestedName = String(fileName || fallbackName).trim() || fallbackName;
  const resolvedName = (
    normalizedLanguage === 'java' && requestedName.toLowerCase() === 'main.java'
  ) ? 'Main.java' : requestedName;

  return [{
    name: resolvedName,
    content: code
  }];
};

const sendUpstreamFailure = (res, status, payload, fallbackMessage) => {
  return res.status(status).json({
    error: getErrorMessageFromUpstream(payload, fallbackMessage),
    upstream: payload
  });
};

const buildDeleteChallengeAttempts = ({ apiKey, challengeId }) => {
  const encodedApiKey = encodeURIComponent(apiKey);
  const encodedChallengeId = encodeURIComponent(challengeId);

  return [
    {
      name: 'delete-by-id',
      method: 'DELETE',
      url: `${ONECOMPILER_API_BASE}/v1/challenges/${encodedChallengeId}?access_token=${encodedApiKey}`
    },
    {
      name: 'post-delete-by-id',
      method: 'POST',
      url: `${ONECOMPILER_API_BASE}/v1/challenges/delete?access_token=${encodedApiKey}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId })
    },
    {
      name: 'post-delete-by-ids',
      method: 'POST',
      url: `${ONECOMPILER_API_BASE}/v1/challenges/delete?access_token=${encodedApiKey}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeIds: [challengeId] })
    },
    {
      name: 'post-delete-suffix',
      method: 'POST',
      url: `${ONECOMPILER_API_BASE}/v1/challenges/${encodedChallengeId}/delete?access_token=${encodedApiKey}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }
  ];
};

const attemptDeleteChallenge = async ({ apiKey, challengeId }) => {
  const attempts = buildDeleteChallengeAttempts({ apiKey, challengeId });
  const failures = [];

  for (const attempt of attempts) {
    const upstream = await callOneCompiler(attempt);

    if (upstream.ok) {
      return {
        ok: true,
        successfulAttempt: attempt.name,
        upstream
      };
    }

    failures.push({
      name: attempt.name,
      status: upstream.status,
      payload: upstream.payload
    });

    if (upstream.status === 401 || upstream.status === 403) {
      break;
    }
  }

  return {
    ok: false,
    failures
  };
};

router.get('/languages', async (req, res) => {
  try {
    const upstream = await callOneCompiler({
      url: `${ONECOMPILER_PUBLIC_BASE}/api/v1/languages`
    });

    if (!upstream.ok) {
      return sendUpstreamFailure(res, upstream.status, upstream.payload, 'Failed to fetch language list');
    }

    return res.json(upstream.payload);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Language lookup timed out' });
    }

    return res.status(500).json({ error: 'Failed to fetch language list' });
  }
});

router.post('/challenges', verifyToken, hasRole('teacher', 'admin'), async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();

    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Challenge payload must be a JSON object' });
    }

    const hasWrappedPayload = (
      req.body.challenge
      && typeof req.body.challenge === 'object'
      && !Array.isArray(req.body.challenge)
    );

    let normalizedPayload = req.body;

    if (!hasWrappedPayload) {
      const { problems, ...challengeFields } = req.body;
      normalizedPayload = {
        challenge: challengeFields,
        problems: Array.isArray(problems) ? problems : []
      };
    }

    const challenge = normalizedPayload.challenge;
    const problems = normalizedPayload.problems;

    const normalizedProblems = Array.isArray(problems)
      ? problems.filter((problem) => !isProblemEffectivelyBlank(problem))
      : [];

    const normalizedTitle = String(challenge?.title || '').trim();
    const normalizedMarkdown = String(challenge?.markdown || '').trim();

    if (!normalizedTitle || !normalizedMarkdown) {
      return res.status(400).json({
        error: 'Invalid challenge data. Missing title/ markdown.',
        hint: 'Send { challenge: { title, markdown, ... }, problems: [...] }'
      });
    }

    if (normalizedProblems.length === 0) {
      return res.status(400).json({
        error: 'Invalid challenge data. No problems found.',
        hint: 'Send at least one problem in payload.problems'
      });
    }

    const invalidCreateProblemIndex = normalizedProblems.findIndex((problem) => {
      const row = toObject(problem);
      const rowProperties = toObject(row.properties);

      return (
        !firstNonEmptyString([row.title])
        || !firstNonEmptyString([row.markdown])
        || !firstNonEmptyString([rowProperties.problemType])
      );
    });

    if (invalidCreateProblemIndex >= 0) {
      return res.status(400).json({
        error: `Invalid problem data for create at problem index ${invalidCreateProblemIndex + 1}. Missing title/markdown/problemType.`,
        hint: 'Fill required fields for each question, or remove incomplete rows before saving.'
      });
    }

    normalizedPayload = {
      ...normalizedPayload,
      challenge: {
        ...challenge,
        title: normalizedTitle,
        markdown: normalizedMarkdown
      },
      problems: normalizedProblems
    };

    const upstream = await callOneCompiler({
      url: `${ONECOMPILER_API_BASE}/v1/challenges/create?access_token=${encodeURIComponent(apiKey)}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload)
    });

    if (!upstream.ok) {
      return sendUpstreamFailure(res, upstream.status, upstream.payload, 'Challenge creation failed');
    }

    const createdChallengeId = extractChallengeId(upstream.payload);
    if (createdChallengeId) {
      await ChallengeOwnership.findOneAndUpdate(
        { challenge_id: createdChallengeId },
        {
          challenge_id: createdChallengeId,
          owner_id: req.user.id,
          original_author_id: req.user.id,
          is_public: false,
          is_active: true
        },
        { upsert: true, new: true }
      );
    }

    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Challenge creation timed out' });
    }

    return res.status(500).json({ error: 'Failed to create challenge' });
  }
});

router.put('/challenges/:challengeId', verifyToken, hasRole('teacher', 'admin'), async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();

    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    const challengeId = String(req.params.challengeId || '').trim();

    if (!challengeId) {
      return res.status(400).json({ error: 'challengeId is required' });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Challenge payload must be a JSON object' });
    }

    const ownership = await ChallengeOwnership.findOne({ challenge_id: challengeId, is_active: true }).lean();
    if (!ownership) {
      return res.status(404).json({ error: 'Challenge ownership not found' });
    }

    const isOwner = ownership.owner_id?.toString() === req.user.id;
    if (req.user.role === 'teacher' && !isOwner) {
      return res.status(403).json({ error: 'You do not have access to update this challenge' });
    }

    const challenge = req.body.challenge;
    const problems = req.body.problems;

    if (!challenge || typeof challenge !== 'object' || Array.isArray(challenge)) {
      return res.status(400).json({ error: 'Payload must include challenge object' });
    }

    if (!Array.isArray(problems)) {
      return res.status(400).json({ error: 'Payload must include problems array' });
    }

    if (problems.length === 0) {
      return res.status(400).json({ error: 'Payload must include at least one problem for update' });
    }

    const existingChallengeUpstream = await callOneCompiler({
      url: `${ONECOMPILER_API_BASE}/v1/challenges/${encodeURIComponent(challengeId)}?access_token=${encodeURIComponent(apiKey)}`
    });

    if (!existingChallengeUpstream.ok) {
      return sendUpstreamFailure(
        res,
        existingChallengeUpstream.status,
        existingChallengeUpstream.payload,
        'Failed to load existing challenge before update'
      );
    }

    const existingChallengePayload = toObject(existingChallengeUpstream.payload?.challenge);
    const existingProblems = Array.isArray(existingChallengeUpstream.payload?.problems)
      ? existingChallengeUpstream.payload.problems
      : [];
    const existingProblemsById = new Map(
      existingProblems
        .map((problem) => [firstNonEmptyString([problem?._id, problem?.id]), problem])
        .filter(([problemId]) => Boolean(problemId))
    );

    const incomingChallenge = toObject(challenge);

    const normalizedChallengeId = firstNonEmptyString([
      incomingChallenge._id,
      incomingChallenge.id,
      challengeId
    ]);
    const normalizedChallengeTitle = firstNonEmptyString([
      incomingChallenge.title,
      existingChallengePayload.title
    ]);
    const normalizedChallengeMarkdown = firstNonEmptyString([
      incomingChallenge.markdown,
      existingChallengePayload.markdown
    ]);
    const normalizedChallengeUserId = firstNonEmptyString([
      incomingChallenge?.user?._id,
      existingChallengePayload?.user?._id
    ]);

    const firstExistingProblemUserId = firstNonEmptyString(
      existingProblems.map((problem) => problem?.user?._id)
    );
    const firstIncomingProblemUserId = firstNonEmptyString(
      problems.map((problem) => problem?.user?._id)
    );
    const globalProblemUserId = firstNonEmptyString([
      normalizedChallengeUserId,
      firstExistingProblemUserId,
      firstIncomingProblemUserId
    ]);

    const unmappedProblemIndexes = [];

    const normalizedProblems = problems.map((problem, index) => {
      const incomingProblem = toObject(problem);
      const incomingProblemId = firstNonEmptyString([incomingProblem._id, incomingProblem.id]);
      const fallbackExistingProblem = incomingProblemId
        ? existingProblemsById.get(incomingProblemId)
        : existingProblems[index];
      const existingProblem = toObject(fallbackExistingProblem);

      const existingProperties = toObject(existingProblem.properties);
      const incomingProperties = toObject(incomingProblem.properties);

      const existingOptions = toObject(existingProperties.options);
      const incomingOptions = toObject(incomingProperties.options);
      const existingCodeOptions = toObject(existingOptions.code);
      const incomingCodeOptions = toObject(incomingOptions.code);

      const mergedOptions = {
        ...existingOptions,
        ...incomingOptions,
        ...(Object.keys(existingCodeOptions).length > 0 || Object.keys(incomingCodeOptions).length > 0
          ? {
            code: {
              ...existingCodeOptions,
              ...incomingCodeOptions
            }
          }
          : {})
      };

      const mergedProperties = {
        ...existingProperties,
        ...incomingProperties,
        problemType: firstNonEmptyString([
          incomingProperties.problemType,
          existingProperties.problemType,
          'code'
        ])
      };

      if (Object.keys(mergedOptions).length > 0) {
        mergedProperties.options = mergedOptions;
      }

      const resolvedProblemId = firstNonEmptyString([
        incomingProblemId,
        existingProblem._id,
        existingProblem.id
      ]);
      const incomingProblemLooksBlank = isProblemEffectivelyBlank(incomingProblem);

      if (!resolvedProblemId && incomingProblemLooksBlank) {
        return null;
      }

      if (!resolvedProblemId) {
        unmappedProblemIndexes.push(index + 1);
      }

      const normalizedProblemUserId = firstNonEmptyString([
        incomingProblem?.user?._id,
        existingProblem?.user?._id,
        globalProblemUserId
      ]);

      const normalizedProblem = {
        ...existingProblem,
        ...incomingProblem,
        _id: resolvedProblemId,
        title: firstNonEmptyString([incomingProblem.title, existingProblem.title]) || `Problem ${index + 1}`,
        markdown: firstNonEmptyString([incomingProblem.markdown, existingProblem.markdown]) || ' ',
        properties: mergedProperties,
        user: {
          ...toObject(existingProblem.user),
          ...toObject(incomingProblem.user),
          ...(normalizedProblemUserId ? { _id: normalizedProblemUserId } : {})
        }
      };

      if (!normalizedProblem._id) {
        delete normalizedProblem._id;
      }

      return normalizedProblem;
    }).filter(Boolean);

    if (!normalizedChallengeId || !normalizedChallengeTitle || !normalizedChallengeMarkdown) {
      return res.status(400).json({
        error: 'Invalid challenge data for update. Missing challenge _id/title/markdown.',
        hint: 'Load challenge in edit mode and avoid deleting challenge metadata fields.'
      });
    }

    const normalizedProblemIds = normalizedProblems
      .map((problem) => firstNonEmptyString([problem?._id, problem?.id]))
      .filter(Boolean);

    const normalizedChallengeOwnerId = firstNonEmptyString([
      normalizedChallengeUserId,
      globalProblemUserId
    ]);

    const mergedChallengeProperties = {
      ...toObject(existingChallengePayload.properties),
      ...toObject(incomingChallenge.properties)
    };

    if (normalizedProblemIds.length > 0) {
      mergedChallengeProperties.problemIds = normalizedProblemIds;
    } else {
      delete mergedChallengeProperties.problemIds;
    }

    const normalizedPayload = {
      ...req.body,
      challenge: {
        ...existingChallengePayload,
        ...incomingChallenge,
        _id: normalizedChallengeId,
        title: normalizedChallengeTitle,
        markdown: normalizedChallengeMarkdown,
        properties: mergedChallengeProperties,
        user: {
          ...toObject(existingChallengePayload.user),
          ...toObject(incomingChallenge.user),
          ...(normalizedChallengeOwnerId ? { _id: normalizedChallengeOwnerId } : {})
        }
      },
      problems: normalizedProblems
    };

    if (!normalizedPayload.challenge._id) {
      return res.status(400).json({ error: 'challenge._id is required for update' });
    }

    if (unmappedProblemIndexes.length > 0) {
      const recreateChallengeProperties = {
        ...toObject(normalizedPayload.challenge.properties)
      };
      delete recreateChallengeProperties.problemIds;

      const recreatePayload = {
        challenge: {
          title: normalizedChallengeTitle,
          markdown: normalizedChallengeMarkdown,
          tags: Array.isArray(normalizedPayload.challenge.tags) ? normalizedPayload.challenge.tags : [],
          visibility: firstNonEmptyString([normalizedPayload.challenge.visibility, 'unlisted']),
          properties: recreateChallengeProperties
        },
        problems: normalizedProblems.map((problem, index) => ({
          title: firstNonEmptyString([problem?.title]) || `Problem ${index + 1}`,
          markdown: firstNonEmptyString([problem?.markdown]) || ' ',
          visibility: firstNonEmptyString([problem?.visibility, 'public']),
          properties: {
            ...toObject(problem?.properties),
            problemType: firstNonEmptyString([problem?.properties?.problemType, 'code'])
          }
        }))
      };

      const recreateUpstream = await callOneCompiler({
        url: `${ONECOMPILER_API_BASE}/v1/challenges/create?access_token=${encodeURIComponent(apiKey)}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recreatePayload)
      });

      if (!recreateUpstream.ok) {
        return sendUpstreamFailure(res, recreateUpstream.status, recreateUpstream.payload, 'Challenge recreation failed');
      }

      const recreatedChallengeId = firstNonEmptyString([
        recreateUpstream.payload?.challengeId,
        recreateUpstream.payload?.challenge_id,
        recreateUpstream.payload?.id,
        recreateUpstream.payload?._id,
        recreateUpstream.payload?.doc?._id,
        recreateUpstream.payload?.data?._id
      ]);

      if (!recreatedChallengeId) {
        return res.status(recreateUpstream.status).json({
          ...toObject(recreateUpstream.payload),
          _meta: {
            recreated: true,
            recreatedFromChallengeId: challengeId,
            reason: 'update-does-not-support-new-problems',
            unmappedProblemIndexes
          }
        });
      }

      const recreatedDetailUpstream = await callOneCompiler({
        url: `${ONECOMPILER_API_BASE}/v1/challenges/${encodeURIComponent(recreatedChallengeId)}?access_token=${encodeURIComponent(apiKey)}`
      });

      if (recreatedDetailUpstream.ok) {
        return res.status(200).json({
          ...toObject(recreatedDetailUpstream.payload),
          _meta: {
            recreated: true,
            recreatedFromChallengeId: challengeId,
            recreatedChallengeId,
            reason: 'update-does-not-support-new-problems',
            unmappedProblemIndexes
          }
        });
      }

      return res.status(200).json({
        ...toObject(recreateUpstream.payload),
        _meta: {
          recreated: true,
          recreatedFromChallengeId: challengeId,
          recreatedChallengeId,
          reason: 'update-does-not-support-new-problems',
          unmappedProblemIndexes
        }
      });
    }

    if (normalizedProblems.length === 0) {
      return res.status(400).json({
        error: 'No valid problems found for update.',
        hint: 'Keep at least one existing problem when saving edits.'
      });
    }

    const invalidProblemIndex = normalizedProblems.findIndex((problem) => {
      const normalizedProblemType = firstNonEmptyString([problem?.properties?.problemType]);
      const normalizedProblemUserId = firstNonEmptyString([problem?.user?._id]);

      return (
        !firstNonEmptyString([problem?._id])
        || !normalizedProblemType
        || !normalizedProblemUserId
      );
    });

    if (invalidProblemIndex >= 0) {
      return res.status(400).json({
        error: `Invalid problem data for update at problem index ${invalidProblemIndex + 1}. Missing _id/problemType/user._id.`,
        hint: 'Load challenge in edit mode and retain existing problem metadata while updating.'
      });
    }

    const upstream = await callOneCompiler({
      url: `${ONECOMPILER_API_BASE}/v1/challenges/update?access_token=${encodeURIComponent(apiKey)}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload)
    });

    if (!upstream.ok) {
      return sendUpstreamFailure(res, upstream.status, upstream.payload, 'Challenge update failed');
    }

    const recreatedChallengeId = upstream.payload?._meta?.recreatedChallengeId || upstream.payload?._meta?.recreated_challenge_id;
    if (recreatedChallengeId) {
      await ChallengeOwnership.findOneAndUpdate(
        { challenge_id: recreatedChallengeId },
        {
          challenge_id: recreatedChallengeId,
          owner_id: ownership.owner_id,
          original_author_id: ownership.original_author_id || ownership.owner_id,
          is_public: ownership.is_public,
          is_active: true
        },
        { upsert: true, new: true }
      );

      await ChallengeOwnership.findOneAndUpdate(
        { challenge_id: challengeId },
        { is_active: false },
        { new: true }
      );
    }

    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Challenge update timed out' });
    }

    return res.status(500).json({ error: 'Failed to update challenge' });
  }
});

router.get('/challenges/central', verifyToken, hasRole('teacher', 'admin'), async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const safeLimit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 200))
      : 50;

    const searchText = String(req.query.q || '').trim();

    const ownershipRows = await ChallengeOwnership.find({ is_public: true, is_active: true })
      .populate('original_author_id', 'full_name')
      .lean();

    const challengeIds = ownershipRows.map((row) => row.challenge_id).filter(Boolean);
    const result = await listChallengesByIds({ apiKey, challengeIds, searchText, limit: safeLimit });

    if (result.error) {
      return sendUpstreamFailure(res, result.error.status, result.error.payload, 'Failed to load challenges');
    }

    const ownershipMap = new Map(ownershipRows.map((row) => [row.challenge_id, row]));
    const challenges = result.challenges.map((item) => {
      const meta = ownershipMap.get(item.id) || {};
      const author = meta.original_author_id || null;
      return {
        ...item,
        author_id: author?._id?.toString() || author?.id || null,
        author_name: author?.full_name || null,
        is_public: Boolean(meta.is_public)
      };
    });

    return res.json({
      status: 'success',
      total: result.total,
      count: challenges.length,
      challenges
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Challenge listing timed out' });
    }

    return res.status(500).json({ error: 'Failed to load challenges' });
  }
});

router.get('/challenges/my', verifyToken, hasRole('teacher', 'admin'), async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const safeLimit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 200))
      : 50;

    const searchText = String(req.query.q || '').trim();

    const ownershipRows = await ChallengeOwnership.find({ owner_id: req.user.id, is_active: true })
      .populate('original_author_id', 'full_name')
      .lean();

    const challengeIds = ownershipRows.map((row) => row.challenge_id).filter(Boolean);
    const result = await listChallengesByIds({ apiKey, challengeIds, searchText, limit: safeLimit });

    if (result.error) {
      return sendUpstreamFailure(res, result.error.status, result.error.payload, 'Failed to load challenges');
    }

    const ownershipMap = new Map(ownershipRows.map((row) => [row.challenge_id, row]));
    const challenges = result.challenges.map((item) => {
      const meta = ownershipMap.get(item.id) || {};
      const author = meta.original_author_id || null;
      return {
        ...item,
        author_id: author?._id?.toString() || author?.id || null,
        author_name: author?.full_name || null,
        is_public: Boolean(meta.is_public)
      };
    });

    return res.json({
      status: 'success',
      total: result.total,
      count: challenges.length,
      challenges
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Challenge listing timed out' });
    }

    return res.status(500).json({ error: 'Failed to load challenges' });
  }
});

router.put('/challenges/:challengeId/visibility', verifyToken, hasRole('teacher', 'admin'), async (req, res) => {
  try {
    const challengeId = String(req.params.challengeId || '').trim();
    if (!challengeId) return res.status(400).json({ error: 'challengeId is required' });

    const ownership = await ChallengeOwnership.findOne({ challenge_id: challengeId, is_active: true });
    if (!ownership) return res.status(404).json({ error: 'Challenge ownership not found' });

    const isOwner = ownership.owner_id?.toString() === req.user.id;
    if (req.user.role === 'teacher' && !isOwner) {
      return res.status(403).json({ error: 'You do not have access to update this challenge' });
    }

    ownership.is_public = parseBooleanInput(req.body?.is_public, false);
    await ownership.save();

    res.json({
      message: 'Challenge visibility updated',
      challenge_id: challengeId,
      is_public: ownership.is_public
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update challenge visibility' });
  }
});

router.post('/challenges/:challengeId/clone', verifyToken, hasRole('teacher', 'admin'), async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    const challengeId = String(req.params.challengeId || '').trim();
    if (!challengeId) return res.status(400).json({ error: 'challengeId is required' });

    const ownership = await ChallengeOwnership.findOne({ challenge_id: challengeId, is_active: true }).lean();
    if (!ownership) return res.status(404).json({ error: 'Challenge ownership not found' });

    const isOwner = ownership.owner_id?.toString() === req.user.id;
    if (!ownership.is_public && !isOwner) {
      return res.status(403).json({ error: 'Challenge is not available for cloning' });
    }

    const sourceChallengeUpstream = await callOneCompiler({
      url: `${ONECOMPILER_API_BASE}/v1/challenges/${encodeURIComponent(challengeId)}?access_token=${encodeURIComponent(apiKey)}`
    });

    if (!sourceChallengeUpstream.ok) {
      return sendUpstreamFailure(res, sourceChallengeUpstream.status, sourceChallengeUpstream.payload, 'Failed to fetch challenge');
    }

    const payload = extractChallengePayload(sourceChallengeUpstream.payload);
    if (!payload) {
      return res.status(500).json({ error: 'Challenge payload could not be cloned' });
    }

    const existingCloneCount = await ChallengeOwnership.countDocuments({
      owner_id: req.user.id,
      source_challenge_id: challengeId,
      is_active: true
    });

    const cloneIndex = existingCloneCount + 1;
    const cloneTitle = `${String(payload.challenge?.title || 'Untitled Challenge').trim()} (clone-${cloneIndex})`;

    const baseChallenge = toObject(payload.challenge);
    const baseProperties = toObject(baseChallenge.properties);
    const clonedProperties = { ...baseProperties };
    delete clonedProperties.problemIds;

    const cloneSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const clonePayload = {
      challenge: {
        title: cloneTitle,
        markdown: firstNonEmptyString([baseChallenge.markdown, ' ']),
        tags: Array.isArray(baseChallenge.tags) ? baseChallenge.tags : [],
        visibility: firstNonEmptyString([baseChallenge.visibility, 'unlisted']),
        ...(Object.keys(clonedProperties).length > 0 ? { properties: clonedProperties } : {})
      },
      problems: payload.problems.map((problem, index) => {
        const row = toObject(problem);
        const rowProperties = toObject(row.properties);
        return {
          title: firstNonEmptyString([row.title]) || `Problem ${index + 1}`,
          markdown: firstNonEmptyString([row.markdown]) || ' ',
          visibility: firstNonEmptyString([row.visibility, 'public']),
          properties: {
            ...rowProperties,
            problemType: firstNonEmptyString([rowProperties.problemType, 'code']),
            clone_seed: cloneSeed
          }
        };
      })
    };

    const createUpstream = await callOneCompiler({
      url: `${ONECOMPILER_API_BASE}/v1/challenges/create?access_token=${encodeURIComponent(apiKey)}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clonePayload)
    });

    if (!createUpstream.ok) {
      return sendUpstreamFailure(res, createUpstream.status, createUpstream.payload, 'Failed to clone challenge');
    }

    const newChallengeId = extractChallengeId(createUpstream.payload);
    if (!newChallengeId) {
      return res.status(500).json({ error: 'Challenge clone succeeded but no challengeId returned' });
    }

    await ChallengeOwnership.findOneAndUpdate(
      { challenge_id: newChallengeId },
      {
        challenge_id: newChallengeId,
        owner_id: req.user.id,
        original_author_id: req.user.id,
        source_challenge_id: challengeId,
        is_public: false,
        is_active: true
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      message: 'Challenge cloned successfully',
      challengeId: newChallengeId
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Challenge clone timed out' });
    }

    return res.status(500).json({ error: 'Failed to clone challenge' });
  }
});

router.get('/challenges', async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();

    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const safeLimit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 200))
      : 50;

    const searchText = String(req.query.q || '').trim().toLowerCase();

    const reportPayload = {
      type: 'listAllChallengeIds',
      filters: {
        challengeIds: [],
        userIds: []
      }
    };

    const upstream = await callOneCompiler({
      url: `${ONECOMPILER_API_BASE}/v1/reports?access_token=${encodeURIComponent(apiKey)}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportPayload)
    });

    if (!upstream.ok) {
      return sendUpstreamFailure(res, upstream.status, upstream.payload, 'Failed to load challenges');
    }

    const allChallenges = toChallengeList(upstream.payload)
      .map(normalizeChallengeSummary)
      .filter((item) => item.id);

    const filteredChallenges = searchText
      ? allChallenges.filter((item) => (
        item.title.toLowerCase().includes(searchText)
        || item.id.toLowerCase().includes(searchText)
        || item.tags.some((tag) => tag.toLowerCase().includes(searchText))
      ))
      : allChallenges;

    return res.json({
      status: 'success',
      total: allChallenges.length,
      count: Math.min(filteredChallenges.length, safeLimit),
      challenges: filteredChallenges.slice(0, safeLimit)
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Challenge listing timed out' });
    }

    return res.status(500).json({ error: 'Failed to load challenges' });
  }
});

router.get('/challenges/:challengeId', async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();

    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    const challengeId = String(req.params.challengeId || '').trim();

    if (!challengeId) {
      return res.status(400).json({ error: 'challengeId is required' });
    }

    const upstream = await callOneCompiler({
      url: `${ONECOMPILER_API_BASE}/v1/challenges/${encodeURIComponent(challengeId)}?access_token=${encodeURIComponent(apiKey)}`
    });

    if (!upstream.ok) {
      return sendUpstreamFailure(res, upstream.status, upstream.payload, 'Failed to fetch challenge');
    }

    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Challenge lookup timed out' });
    }

    return res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

router.delete('/challenges/:challengeId', verifyToken, hasRole('teacher', 'admin'), async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();

    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    const challengeId = String(req.params.challengeId || '').trim();

    if (!challengeId) {
      return res.status(400).json({ error: 'challengeId is required' });
    }

    const ownership = await ChallengeOwnership.findOne({ challenge_id: challengeId, is_active: true }).lean();
    if (!ownership) {
      return res.status(404).json({ error: 'Challenge ownership not found' });
    }

    const isOwner = ownership.owner_id?.toString() === req.user.id;
    if (req.user.role === 'teacher' && !isOwner) {
      return res.status(403).json({ error: 'You do not have access to delete this challenge' });
    }

    const deleteResult = await attemptDeleteChallenge({ apiKey, challengeId });

    if (!deleteResult.ok) {
      const failures = deleteResult.failures || [];
      const deleteEndpointUnavailable = failures.length > 0
        && failures.every((entry) => [404, 405].includes(entry.status));

      if (deleteEndpointUnavailable) {
        return res.status(502).json({
          error: 'Delete challenge is not available from upstream API for this account',
          attempts: failures.map((entry) => ({ name: entry.name, status: entry.status }))
        });
      }

      const preferredFailure = failures.find((entry) => ![404, 405].includes(entry.status)) || failures[0];
      return res.status(preferredFailure?.status || 500).json({
        error: getErrorMessageFromUpstream(preferredFailure?.payload, 'Failed to delete challenge'),
        upstream: preferredFailure?.payload,
        attempts: failures.map((entry) => ({ name: entry.name, status: entry.status }))
      });
    }

    await ChallengeOwnership.findOneAndUpdate({ challenge_id: challengeId }, { is_active: false }, { new: true });

    return res.json({
      status: 'success',
      message: 'Challenge deleted successfully',
      challengeId,
      deletionMethod: deleteResult.successfulAttempt,
      upstream: deleteResult.upstream?.payload || null
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Challenge delete timed out' });
    }

    return res.status(500).json({ error: 'Failed to delete challenge' });
  }
});

router.get('/challenges/:challengeId/stats', async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();

    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    const challengeId = String(req.params.challengeId || '').trim();

    if (!challengeId) {
      return res.status(400).json({ error: 'challengeId is required' });
    }

    const upstream = await callOneCompiler({
      url: `${ONECOMPILER_API_BASE}/v1/challenges/stats?access_token=${encodeURIComponent(apiKey)}&challengeIds=${encodeURIComponent(challengeId)}`
    });

    if (!upstream.ok) {
      return sendUpstreamFailure(res, upstream.status, upstream.payload, 'Failed to fetch challenge stats');
    }

    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Challenge stats lookup timed out' });
    }

    return res.status(500).json({ error: 'Failed to fetch challenge stats' });
  }
});

router.get('/challenges/:challengeId/stats/summary', async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();

    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    const challengeId = String(req.params.challengeId || '').trim();

    if (!challengeId) {
      return res.status(400).json({ error: 'challengeId is required' });
    }

    const upstream = await callOneCompiler({
      url: `${ONECOMPILER_API_BASE}/v1/challenges/stats/summary?access_token=${encodeURIComponent(apiKey)}&challengeIds=${encodeURIComponent(challengeId)}`
    });

    if (!upstream.ok) {
      return sendUpstreamFailure(res, upstream.status, upstream.payload, 'Failed to fetch challenge stats summary');
    }

    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Challenge stats summary lookup timed out' });
    }

    return res.status(500).json({ error: 'Failed to fetch challenge stats summary' });
  }
});

router.post('/run', async (req, res) => {
  try {
    const apiKey = getOneCompilerApiKey();

    if (!apiKey) {
      return res.status(500).json({ error: 'ONECOMPILER_API_KEY is not configured on server' });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Run payload must be a JSON object' });
    }

    const language = String(req.body.language || '').trim();
    if (!language) {
      return res.status(400).json({ error: 'language is required' });
    }

    const normalizedFiles = normalizeRunFiles(language, req.body.files, req.body.code, req.body.fileName);

    if (normalizedFiles.length === 0) {
      return res.status(400).json({ error: 'Provide files[] or code to execute' });
    }

    const runPayload = {
      ...req.body,
      language,
      files: normalizedFiles
    };

    delete runPayload.code;
    delete runPayload.fileName;

    const upstream = await callOneCompiler({
      url: `${ONECOMPILER_API_BASE}/v1/run`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(runPayload)
    });

    if (!upstream.ok) {
      return sendUpstreamFailure(res, upstream.status, upstream.payload, 'Code execution failed');
    }

    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Code execution timed out' });
    }

    return res.status(500).json({ error: 'Failed to run code' });
  }
});

module.exports = router;
