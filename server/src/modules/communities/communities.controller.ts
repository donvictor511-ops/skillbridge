import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/appError";
import { communityIdSchema, communityInviteResponseSchema, communityInviteSchema, communityMemberRoleSchema, communitySearchSchema, createCommunityCommentSchema, createCommunityPostSchema, createCommunitySchema, reportCommunitySchema, resolveCommunityReportSchema, updateCommunitySchema } from "./communities.schema";
import * as service from "./communities.service";

function userId(req: Request): string {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Please log in to continue.");
  if (!req.user.onboardedAt) throw new AppError(403, "ONBOARDING_REQUIRED", "Complete onboarding before joining communities.");
  return req.user.id;
}

function communityId(req: Request): string {
  const parsed = communityIdSchema.safeParse(req.params);
  if (!parsed.success) throw new AppError(404, "COMMUNITY_NOT_FOUND", "Community not found.");
  return parsed.data.communityId;
}

export async function list(req: Request, res: Response): Promise<void> {
  const user = userId(req);
  const query = communitySearchSchema.parse(req.query);
  res.status(200).json({ data: await service.listCommunities(user, query.search, query.mine === "true") });
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = userId(req);
  const input = createCommunitySchema.parse(req.body);
  res.status(201).json({ data: await service.createCommunity(user, input) });
}
export async function invitations(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await service.listMyInvitations(userId(req)) });
}
export async function invite(req: Request, res: Response): Promise<void> {
  res.status(201).json({ data: await service.inviteCommunityMember(userId(req), communityId(req), communityInviteSchema.parse(req.body).userId) });
}
export async function respondInvitation(req: Request, res: Response): Promise<void> {
  const invitationId = z.uuid().parse(req.params.invitationId);
  const { status } = communityInviteResponseSchema.parse(req.body);
  res.status(200).json({ data: await service.respondToInvitation(userId(req), invitationId, status) });
}

export async function detail(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await service.getCommunity(userId(req), communityId(req)) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateCommunitySchema.parse(req.body);
  res.status(200).json({ data: await service.updateCommunity(userId(req), communityId(req), input) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteCommunity(userId(req), communityId(req));
  res.status(204).send();
}

export async function join(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await service.joinCommunity(userId(req), communityId(req)) });
}

export async function leave(req: Request, res: Response): Promise<void> {
  await service.leaveCommunity(userId(req), communityId(req));
  res.status(204).send();
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const memberId = z.uuid().parse(req.params.memberId);
  await service.removeCommunityMember(userId(req), communityId(req), memberId);
  res.status(204).send();
}

export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  const memberId = z.uuid().parse(req.params.memberId);
  const { role } = communityMemberRoleSchema.parse(req.body);
  await service.updateCommunityMemberRole(userId(req), communityId(req), memberId, role);
  res.status(204).send();
}

export async function createPost(req: Request, res: Response): Promise<void> {
  const input = createCommunityPostSchema.parse(req.body);
  res.status(201).json({ data: await service.createCommunityPost(userId(req), communityId(req), input) });
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  const postId = z.uuid().parse(req.params.postId);
  await service.deleteCommunityPost(userId(req), communityId(req), postId);
  res.status(204).send();
}

export async function createComment(req: Request, res: Response): Promise<void> {
  const input = createCommunityCommentSchema.parse(req.body);
  const postId = z.uuid().parse(req.params.postId);
  res.status(201).json({ data: await service.createCommunityComment(userId(req), communityId(req), postId, input.content) });
}

export async function deleteComment(req: Request, res: Response): Promise<void> {
  const postId = z.uuid().parse(req.params.postId);
  const commentId = z.uuid().parse(req.params.commentId);
  await service.deleteCommunityComment(userId(req), communityId(req), postId, commentId);
  res.status(204).send();
}

export async function report(req: Request, res: Response): Promise<void> {
  const input = reportCommunitySchema.parse(req.body);
  res.status(201).json({ data: await service.reportCommunity(userId(req), communityId(req), input) });
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  const reportId = z.uuid().parse(req.params.reportId);
  const input = resolveCommunityReportSchema.parse(req.body);
  await service.resolveCommunityReport(userId(req), communityId(req), reportId, input.status, input.removePost);
  res.status(204).send();
}
