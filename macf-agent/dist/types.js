import { z } from 'zod';
// --- Notify payload (POST /notify body) ---
export const NotifyTypeSchema = z.enum([
    'issue_routed',
    'mention',
    'startup_check',
]);
export const NotifyPayloadSchema = z.object({
    type: NotifyTypeSchema,
    issue_number: z.number().int().positive().optional(),
    title: z.string().optional(),
    source: z.string().optional(),
    message: z.string().optional(),
});
// --- Health response (GET /health body) ---
export const HealthResponseSchema = z.object({
    agent: z.string(),
    status: z.literal('online'),
    type: z.string(),
    uptime_seconds: z.number().int().nonnegative(),
    current_issue: z.number().int().positive().nullable(),
    version: z.string(),
    last_notification: z.string().nullable(),
});
// --- Sign request (POST /sign body) ---
export const SignRequestSchema = z.object({
    csr: z.string(),
    agent_name: z.string(),
    project: z.string().optional(),
    challenge_done: z.boolean().optional(),
});
// --- Sign responses ---
export const SignChallengeResponseSchema = z.object({
    challenge_id: z.string(),
    instruction: z.string(),
});
export const SignCertResponseSchema = z.object({
    cert: z.string(),
});
// --- Notify endpoint response ---
export const NotifyResponseSchema = z.object({
    status: z.literal('received'),
});
// --- Error response ---
export const ErrorResponseSchema = z.object({
    error: z.string(),
});
//# sourceMappingURL=types.js.map