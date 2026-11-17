import { z } from "zod";

const uuidSchema = z.string().uuid();

export const connectionUserParamsSchema = z.object({
  userId: uuidSchema,
});

export const connectionParamsSchema = z.object({
  connectionId: uuidSchema,
});

export const connectionListQuerySchema = z.object({
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
});

export type ConnectionListQuery = z.infer<typeof connectionListQuerySchema>;
