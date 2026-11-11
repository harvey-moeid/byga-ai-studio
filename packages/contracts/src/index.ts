import { z } from 'zod';

export const ProjectNameSchema = z.string().trim().min(1).max(80);
export const ProjectIdSchema = z.string().regex(/^prj_[a-zA-Z0-9_-]{8,64}$/);

export const CreateProjectInputSchema = z.object({
  name: ProjectNameSchema
}).strict();

export const EngineSchema = z.enum(['hyperframes', 'remotion', 'suara']);
export const JobStateSchema = z.enum(['submitted', 'queued', 'running', 'succeeded', 'failed', 'cancelled']);

export const HealthResponseSchema = z.object({
  service: z.literal('byga-ai-studio-api'),
  status: z.literal('ok'),
  version: z.string().min(1),
  checkedAt: z.string().datetime()
}).strict();

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1)
  }).strict()
}).strict();

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type Engine = z.infer<typeof EngineSchema>;
export type JobState = z.infer<typeof JobStateSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
