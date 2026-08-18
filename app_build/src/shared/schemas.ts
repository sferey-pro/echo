import { z } from "zod";

export const pathParamsOverridesSchema = z.record(z.string(), z.string());

export const mockVariantDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  isMocked: z.boolean(),
  payload: z.string(),
  selectedExample: z.string().nullable(),
  statusCode: z.number(),
  latencyMs: z.number(),
  pathParamsOverrides: pathParamsOverridesSchema,
});

export type MockVariantDef = z.infer<typeof mockVariantDefSchema>;

export const scenarioActionSchema = z.object({
  requestId: z.string(),
  isMocked: z.boolean(),
  statusCode: z.number(),
  latencyMs: z.number(),
  payload: z.string(),
  selectedExample: z.string().nullable(),
  pathParamsOverrides: pathParamsOverridesSchema,
});

export type ScenarioAction = z.infer<typeof scenarioActionSchema>;

export const scenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  actions: z.array(scenarioActionSchema),
});

export type Scenario = z.infer<typeof scenarioSchema>;

export const createScenarioSchema = z.object({
  name: z.string(),
  actions: z.array(scenarioActionSchema).optional(),
});

export type CreateScenarioPayload = z.infer<typeof createScenarioSchema>;

export const createVariantSchema = z.object({
  requestId: z.string(),
  name: z.string(),
});

export type CreateVariantPayload = z.infer<typeof createVariantSchema>;

export const updateVariantSchema = mockVariantDefSchema
  .partial()
  .omit({ id: true });
