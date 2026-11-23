import type { Request, Response } from "express";
import { z } from "zod";
import { fileTypeFromBuffer } from "file-type";
import { AppError } from "../../utils/appError";
import { uploadJobCv } from "../../services/cloudinary";
import type { AuthUser } from "../auth/auth.types";
import * as service from "./marketplace.service";
import { createApplicationSchema, createJobSchema, createProposalSchema, createProjectSchema, listingIdSchema, marketplaceListSchema, updateApplicationSchema, updateJobSchema, updateProjectSchema, updateProposalSchema } from "./marketplace.schema";

function user(req: Request): AuthUser {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Please log in to use the marketplace.");
  if (!req.user.onboardedAt) throw new AppError(403, "ONBOARDING_REQUIRED", "Complete onboarding before using the marketplace.");
  return req.user;
}

function id(req: Request): string {
  const parsed = listingIdSchema.safeParse(req.params);
  if (!parsed.success) throw new AppError(404, "LISTING_NOT_FOUND", "Listing not found.");
  return parsed.data.listingId;
}

export async function listJobs(req: Request, res: Response): Promise<void> {
  const query = marketplaceListSchema.parse(req.query);
  res.status(200).json({ data: await service.listJobs(user(req), query) });
}
export async function getJob(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await service.getJob(user(req), id(req)) });
}
export async function createJob(req: Request, res: Response): Promise<void> {
  const input = createJobSchema.parse(req.body);
  res.status(201).json({ data: await service.createJob(user(req), input) });
}
export async function updateJob(req: Request, res: Response): Promise<void> {
  const input = updateJobSchema.parse(req.body);
  res.status(200).json({ data: await service.updateJob(user(req), id(req), input) });
}
export async function mineApplications(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await service.listMyApplications(user(req)) });
}
export async function applyToJob(req: Request, res: Response): Promise<void> {
  const input = createApplicationSchema.parse(req.body);
  const applicant = user(req);
  const listingId = id(req);
  if (!req.file) throw new AppError(400, "CV_REQUIRED", "Attach your CV to submit an application.");
  const detected = await fileTypeFromBuffer(req.file.buffer);
  const format = detected?.mime === "application/pdf" ? "pdf"
    : detected?.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? "docx" : null;
  if (!format) throw new AppError(400, "INVALID_CV_CONTENT", "The uploaded file is not a valid PDF or DOCX document.");
  const cvPublicId = await uploadJobCv({ buffer: req.file.buffer, userId: applicant.id, format });
  const cvFileName = req.file.originalname.replace(/[\\/\r\n\0]/g, "_").slice(0, 255) || `CV.${format}`;
  res.status(201).json({ data: await service.createApplication(applicant, listingId, input.coverLetter, { cvPublicId, cvFormat: format, cvFileName }) });
}

export async function downloadApplicationCv(req: Request, res: Response): Promise<void> {
  const applicationId = z.uuid().parse(req.params.applicationId);
  const downloadUrl = await service.getApplicationCvDownloadUrl(user(req), applicationId);
  res.redirect(302, downloadUrl);
}
export async function updateApplication(req: Request, res: Response): Promise<void> {
  const applicationId = z.uuid().parse(req.params.applicationId);
  const input = updateApplicationSchema.parse(req.body);
  res.status(200).json({ data: await service.updateApplication(user(req), id(req), applicationId, input) });
}

export async function listProjects(req: Request, res: Response): Promise<void> {
  const query = marketplaceListSchema.parse(req.query);
  res.status(200).json({ data: await service.listProjects(user(req), query) });
}
export async function getProject(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await service.getProject(user(req), id(req)) });
}
export async function createProject(req: Request, res: Response): Promise<void> {
  const input = createProjectSchema.parse(req.body);
  res.status(201).json({ data: await service.createProject(user(req), input) });
}
export async function updateProject(req: Request, res: Response): Promise<void> {
  const input = updateProjectSchema.parse(req.body);
  res.status(200).json({ data: await service.updateProject(user(req), id(req), input) });
}
export async function mineProposals(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await service.listMyProposals(user(req)) });
}
export async function proposeToProject(req: Request, res: Response): Promise<void> {
  const input = createProposalSchema.parse(req.body);
  res.status(201).json({ data: await service.createProposal(user(req), id(req), input) });
}
export async function updateProposal(req: Request, res: Response): Promise<void> {
  const proposalId = z.uuid().parse(req.params.proposalId);
  const input = updateProposalSchema.parse(req.body);
  res.status(200).json({ data: await service.updateProposal(user(req), id(req), proposalId, input.status) });
}
