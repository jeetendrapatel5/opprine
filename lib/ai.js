const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const REQUEST_TIMEOUT_MS = 25_000; // runs inside after(), well after GitHub already got its response — no need to stay under GitHub's ~10s webhook limit anymore
const MAX_RETRY_ATTEMPTS = 2; // 1 initial try + 1 retry on transient errors
const MAX_COMMIT_MESSAGE_LENGTH = 2000; // guard against huge multi-line commit bodies inflating tokens

const SYSTEM_INSTRUCTION = `You write one-sentence project updates for a non-technical client of a freelance developer.
Rewrite the given git commit message as a short, plain-English update. No code terms, no jargon.
If the message is too vague to say anything meaningful (e.g. "fix", "wip", "update stuff"), set "skip" to true.`;

// Structured output instead of a "reply with exactly: SKIP" sentinel — removes the risk of the
// model wrapping/punctuating the sentinel in a way that breaks a string match.
const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        skip: {
            type: 'boolean',
            description: 'true if the commit message is too vague to produce a meaningful client-facing update',
        },
        update: {
            type: 'string',
            description: 'The one-sentence, plain-English client update. Empty string if skip is true.',
        },
    },
    required: ['skip', 'update'],
};

/**
 * Rewrites a git commit message as a short, plain-English update for a non-technical client.
 * Returns null (never throws) if the commit is too vague, the AI call fails, or the response
 * is blocked/unparsable — callers can treat this as "no update to post" in all cases.
 */
export async function summarizeCommitForClient(commitMessage, projectName) {
    if (!commitMessage?.trim()) return null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('AI summarize skipped: GEMINI_API_KEY is not set');
        return null;
    }

    const truncatedMessage = commitMessage.trim().slice(0, MAX_COMMIT_MESSAGE_LENGTH);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: `Commit message: "${truncatedMessage}"\nProject: "${projectName ?? 'this project'}"`,
                        },
                    ],
                },
            ],
            systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }],
            },
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 200,
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_SCHEMA,
                thinkingConfig: { thinkingLevel: 'low' }, // lightweight task — keep latency and cost down
            },
        };

        const data = await callGeminiWithRetry(requestBody, apiKey, controller.signal);
        if (!data) return null;

        // Blocked before generation even started (e.g. safety filter on the input)
        if (data.promptFeedback?.blockReason) {
            console.error('AI summarize blocked:', data.promptFeedback.blockReason);
            return null;
        }

        const candidate = data.candidates?.[0];
        if (!candidate || candidate.finishReason === 'SAFETY') {
            console.error('AI summarize: no usable candidate', candidate?.finishReason);
            return null;
        }

        const rawText = candidate.content?.parts?.[0]?.text;
        if (!rawText) return null;

        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (parseErr) {
            console.error('AI summarize: failed to parse model output as JSON:', rawText);
            return null;
        }

        if (parsed.skip || !parsed.update?.trim()) return null;
        return parsed.update.trim();
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error(`AI summarize timed out after ${REQUEST_TIMEOUT_MS}ms`);
        } else {
            console.error('AI summarize failed:', err);
        }
        return null; // if the AI call fails, skip silently — never let this break the webhook
    } finally {
        clearTimeout(timeout);
    }
}

async function callGeminiWithRetry(body, apiKey, signal, attempt = 1) {
    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'x-goog-api-key': apiKey, // header auth, not ?key= in the URL — keeps the key out of logs/proxies
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal,
    });

    if (response.ok) return response.json();

    const isRetryable = response.status === 429 || response.status >= 500;
    if (isRetryable && attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        return callGeminiWithRetry(body, apiKey, signal, attempt + 1);
    }

    const errorBody = await response.text().catch(() => '');
    console.error(`AI summarize: Gemini API returned ${response.status}`, errorBody);
    return null;
}