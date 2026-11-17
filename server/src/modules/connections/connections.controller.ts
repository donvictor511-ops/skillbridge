import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import {
  connectionListQuerySchema,
  connectionParamsSchema,
  connectionUserParamsSchema,
} from "./connections.schema";
import {
  listConnections,
  removeConnection,
  respondToConnectionRequest,
  sendConnectionRequest,
} from "./connections.service";

function getAuthenticatedUser(req: Request): {
  id: string;
  onboardedAt: Date | null;
} {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Please log in to manage connections.",
    );
  }

  if (!req.user.onboardedAt) {
    throw new AppError(
      403,
      "ONBOARDING_REQUIRED",
      "Complete onboarding before managing connections.",
    );
  }

  return req.user;
}

export async function createConnectionRequest(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { userId } = connectionUserParamsSchema.parse(req.params);

  const result = await sendConnectionRequest(user.id, userId);

  res.status(201).json({
    data: result,
  });
}

export async function getConnections(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);
  const query = connectionListQuerySchema.parse(req.query);

  const result = await listConnections(user.id, query);

  res.status(200).json({
    data: result,
  });
}

export async function acceptConnectionRequest(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { connectionId } = connectionParamsSchema.parse(req.params);

  const result = await respondToConnectionRequest(
    user.id,
    connectionId,
    "accepted",
  );

  res.status(200).json({
    data: result,
  });
}

export async function rejectConnectionRequest(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { connectionId } = connectionParamsSchema.parse(req.params);

  const result = await respondToConnectionRequest(
    user.id,
    connectionId,
    "rejected",
  );

  res.status(200).json({
    data: result,
  });
}

export async function deleteConnection(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { connectionId } = connectionParamsSchema.parse(req.params);

  await removeConnection(user.id, connectionId);

  res.status(204).send();
}
