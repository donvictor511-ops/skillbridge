import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import { createJobCvDownloadUrl } from "../../services/cloudinary";
import type { AuthUser } from "../auth/auth.types";

const personSelect = {
  id: true,
  profile: { select: { displayName: true, avatarUrl: true, headline: true, location: true } },
} satisfies Prisma.UserSelect;

function fail(status: number, code: string, message: string): AppError {
  return new AppError(status, code, message);
}

function requireCapability(user: AuthUser, capability: "client" | "professional") {
  if (!user.capabilities.includes(capability)) {
    throw fail(403, "ACCOUNT_TYPE_REQUIRED", `A ${capability} account is required for this action.`);
  }
}

function serializeAmount(value: Prisma.Decimal | null): number | null {
  return value?.toNumber() ?? null;
}

function serializeApplication(row: {
  id: string; coverLetter: string; status: string; createdAt: Date; updatedAt: Date;
  cvFileName?: string | null; cvPublicId?: string | null; cvFormat?: string | null;
  applicant?: { id: string; profile: { displayName: string; avatarUrl: string | null; headline: string | null; location: string | null } | null };
  interview?: { id: string; scheduledAt: Date; durationMinutes: number; mode: string; status: string; notes: string | null } | null;
}) {
  const { cvPublicId: _privateCvId, cvFormat: _privateCvFormat, ...safeRow } = row;
  return { ...safeRow, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), interview: row.interview ? { ...row.interview, scheduledAt: row.interview.scheduledAt.toISOString() } : null };
}

export async function listJobs(user: AuthUser, query: { search?: string; category?: string; employmentType?: string; remote?: "true" | "false"; status: "open" | "closed" | "all"; mine?: "true" | "false" }) {
  const search = query.search?.trim();
  const rows = await prisma.jobListing.findMany({
    where: {
      ...(query.status === "all" ? {} : { status: query.status }),
      ...(query.category ? { category: query.category } : {}),
      ...(query.employmentType ? { employmentType: query.employmentType } : {}),
      ...(query.remote ? { isRemote: query.remote === "true" } : {}),
      ...(query.mine === "true" ? { ownerId: user.id } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 60,
    include: {
      owner: { select: personSelect }, _count: { select: { applications: true } },
      applications: { where: { applicantId: user.id }, select: { status: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id, title: row.title, description: row.description, category: row.category,
    employmentType: row.employmentType, location: row.location, isRemote: row.isRemote,
    budgetMin: serializeAmount(row.budgetMin), budgetMax: serializeAmount(row.budgetMax),
    currency: row.currency, status: row.status, createdAt: row.createdAt.toISOString(),
    ownerId: row.ownerId, owner: row.owner, applicationCount: row._count.applications,
    myApplicationStatus: row.applications[0]?.status ?? null,
  }));
}

export async function getJob(user: AuthUser, listingId: string) {
  const existing = await prisma.jobListing.findUnique({ where: { id: listingId }, select: { ownerId: true } });
  if (!existing) throw fail(404, "JOB_NOT_FOUND", "Job listing not found.");
  const row = await prisma.jobListing.findUnique({
    where: { id: listingId },
    include: {
      owner: { select: personSelect },
      applications: {
        where: user.id === existing.ownerId ? {} : { applicantId: user.id },
        orderBy: { createdAt: "desc" }, include: { applicant: { select: personSelect }, interview: true },
      },
    },
  });
  if (!row) throw fail(404, "JOB_NOT_FOUND", "Job listing not found.");
  return {
    ...row,
    budgetMin: serializeAmount(row.budgetMin), budgetMax: serializeAmount(row.budgetMax),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    applications: row.applications.map(serializeApplication),
    myApplication: (() => {
      const application = row.applications.find((item) => item.applicantId === user.id);
      return application ? serializeApplication(application) : null;
    })(),
  };
}

export async function createJob(user: AuthUser, input: Omit<Prisma.JobListingUncheckedCreateInput, "ownerId">) {
  requireCapability(user, "client");
  const row = await prisma.jobListing.create({ data: { ...input, ownerId: user.id }, select: { id: true } });
  return getJob(user, row.id);
}

export async function updateJob(user: AuthUser, listingId: string, input: Prisma.JobListingUpdateInput) {
  const existing = await prisma.jobListing.findUnique({ where: { id: listingId }, select: { ownerId: true } });
  if (!existing) throw fail(404, "JOB_NOT_FOUND", "Job listing not found.");
  if (existing.ownerId !== user.id) throw fail(403, "LISTING_OWNER_REQUIRED", "Only the listing owner can manage this job.");
  await prisma.jobListing.update({ where: { id: listingId }, data: input });
  return getJob(user, listingId);
}

export async function createApplication(user: AuthUser, listingId: string, coverLetter: string, cv: { cvPublicId: string; cvFormat: string; cvFileName: string }) {
  requireCapability(user, "professional");
  const listing = await prisma.jobListing.findUnique({ where: { id: listingId }, select: { id: true, ownerId: true, title: true, status: true } });
  if (!listing || listing.status !== "open") throw fail(404, "JOB_NOT_AVAILABLE", "This job is no longer accepting applications.");
  if (listing.ownerId === user.id) throw fail(400, "OWN_LISTING", "You cannot apply to your own job.");
  try {
    const application = await prisma.jobApplication.create({
      data: { jobId: listingId, applicantId: user.id, coverLetter, ...cv }, select: { id: true, status: true, createdAt: true },
    });
    await prisma.notification.create({
      data: { recipientId: listing.ownerId, actorId: user.id, type: "job_application", message: `applied to your job: ${listing.title}`, resourceId: listingId },
    });
    return { ...application, createdAt: application.createdAt.toISOString() };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw fail(409, "APPLICATION_EXISTS", "You have already applied to this job.");
    }
    throw error;
  }
}

export async function getApplicationCvDownloadUrl(user: AuthUser, applicationId: string) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { applicantId: true, cvPublicId: true, cvFormat: true, job: { select: { ownerId: true } } },
  });
  if (!application) throw fail(404, "APPLICATION_NOT_FOUND", "Application not found.");
  if (application.applicantId !== user.id && application.job.ownerId !== user.id) {
    throw fail(403, "APPLICATION_ACCESS_DENIED", "Only the applicant and job owner can view this CV.");
  }
  if (!application.cvPublicId || !application.cvFormat) throw fail(404, "CV_NOT_FOUND", "This application does not have a CV attached.");
  return createJobCvDownloadUrl(application.cvPublicId, application.cvFormat);
}

export async function updateApplication(user: AuthUser, listingId: string, applicationId: string, input: { status: "reviewing" | "accepted" | "rejected" | "withdrawn"; interview?: { scheduledAt: string; durationMinutes: number; mode: "audio" | "video"; notes?: string } }) {
  const { status } = input;
  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, jobId: listingId }, include: { job: { select: { ownerId: true, title: true } } },
  });
  if (!application) throw fail(404, "APPLICATION_NOT_FOUND", "Application not found.");
  let recipientId: string;
  if (application.applicantId === user.id) {
    if (status !== "withdrawn" || !["submitted", "reviewing"].includes(application.status)) throw fail(403, "APPLICATION_STATUS_DENIED", "You can only withdraw an application that is still under review.");
    recipientId = application.job.ownerId;
  } else {
    if (application.job.ownerId !== user.id) throw fail(403, "LISTING_OWNER_REQUIRED", "Only the job owner can manage applications.");
    if (!["reviewing", "accepted", "rejected"].includes(status) || !["submitted", "reviewing"].includes(application.status)) throw fail(409, "APPLICATION_STATUS_CONFLICT", "This application can no longer be updated.");
    recipientId = application.applicantId;
  }
  if (status === "accepted" && !input.interview) throw fail(400, "INTERVIEW_REQUIRED", "Schedule an interview when accepting this application.");
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.jobApplication.update({ where: { id: applicationId }, data: { status }, select: { id: true, status: true, updatedAt: true } });
    if (status === "accepted" && input.interview) {
      const interview = await tx.interview.create({ data: { applicationId, scheduledById: user.id, scheduledAt: new Date(input.interview.scheduledAt), durationMinutes: input.interview.durationMinutes, mode: input.interview.mode, notes: input.interview.notes || null } });
      await tx.notification.create({ data: { recipientId, actorId: user.id, type: "interview_scheduled", message: `scheduled an interview for ${application.job.title}`, resourceId: interview.id } });
    } else {
      await tx.notification.create({ data: { recipientId, actorId: user.id, type: "job_application_update", message: `updated an application for ${application.job.title}: ${status}`, resourceId: listingId } });
    }
    return result;
  });
  return { ...updated, updatedAt: updated.updatedAt.toISOString() };
}

export async function listMyApplications(user: AuthUser) {
  requireCapability(user, "professional");
  const rows = await prisma.jobApplication.findMany({
    where: { applicantId: user.id }, orderBy: { updatedAt: "desc" }, take: 100,
    include: { interview: true, job: { include: { owner: { select: personSelect } } } },
  });
  return rows.map(({ job, ...application }) => ({
    ...serializeApplication(application),
    job: { id: job.id, title: job.title, category: job.category, status: job.status, owner: job.owner },
  }));
}

export async function listProjects(user: AuthUser, query: { search?: string; category?: string; status: "open" | "closed" | "all"; mine?: "true" | "false" }) {
  const search = query.search?.trim();
  const rows = await prisma.projectListing.findMany({
    where: {
      ...(query.status === "all" ? {} : query.status === "closed" ? { status: { in: ["completed", "cancelled"] } } : { status: { in: ["open", "in_progress"] } }),
      ...(query.category ? { category: query.category } : {}), ...(query.mine === "true" ? { ownerId: user.id } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }, { skills: { hasSome: [search] } }] } : {}),
    }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 60,
    include: { owner: { select: personSelect }, _count: { select: { proposals: true } }, proposals: { where: { authorId: user.id }, select: { status: true } } },
  });
  return rows.map((row) => ({
    id: row.id, title: row.title, description: row.description, category: row.category, skills: row.skills,
    budget: serializeAmount(row.budget), currency: row.currency, deliveryTime: row.deliveryTime,
    status: row.status, createdAt: row.createdAt.toISOString(), ownerId: row.ownerId, owner: row.owner,
    proposalCount: row._count.proposals, myProposalStatus: row.proposals[0]?.status ?? null,
  }));
}

export async function getProject(user: AuthUser, listingId: string) {
  const existing = await prisma.projectListing.findUnique({ where: { id: listingId }, select: { ownerId: true } });
  if (!existing) throw fail(404, "PROJECT_NOT_FOUND", "Project listing not found.");
  const row = await prisma.projectListing.findUnique({
    where: { id: listingId }, include: {
      owner: { select: personSelect },
      proposals: { where: user.id === existing.ownerId ? {} : { authorId: user.id }, orderBy: { createdAt: "desc" }, include: { author: { select: personSelect } } },
    },
  });
  if (!row) throw fail(404, "PROJECT_NOT_FOUND", "Project listing not found.");
  return {
    ...row, budget: serializeAmount(row.budget), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    proposals: row.proposals.map((proposal) => ({ ...proposal, proposedBudget: serializeAmount(proposal.proposedBudget), createdAt: proposal.createdAt.toISOString(), updatedAt: proposal.updatedAt.toISOString() })),
    myProposal: row.proposals.find((proposal) => proposal.authorId === user.id) ?? null,
  };
}

export async function createProject(user: AuthUser, input: Omit<Prisma.ProjectListingUncheckedCreateInput, "ownerId">) {
  requireCapability(user, "client");
  const row = await prisma.projectListing.create({ data: { ...input, ownerId: user.id }, select: { id: true } });
  return getProject(user, row.id);
}

export async function updateProject(user: AuthUser, listingId: string, input: Prisma.ProjectListingUpdateInput) {
  const existing = await prisma.projectListing.findUnique({ where: { id: listingId }, select: { ownerId: true } });
  if (!existing) throw fail(404, "PROJECT_NOT_FOUND", "Project listing not found.");
  if (existing.ownerId !== user.id) throw fail(403, "LISTING_OWNER_REQUIRED", "Only the listing owner can manage this project.");
  await prisma.projectListing.update({ where: { id: listingId }, data: input });
  return getProject(user, listingId);
}

export async function createProposal(user: AuthUser, listingId: string, input: { coverLetter: string; proposedBudget?: number | null; deliveryTime?: string | null }) {
  requireCapability(user, "professional");
  const project = await prisma.projectListing.findUnique({ where: { id: listingId }, select: { id: true, ownerId: true, title: true, status: true } });
  if (!project || project.status !== "open") throw fail(404, "PROJECT_NOT_AVAILABLE", "This project is no longer accepting proposals.");
  if (project.ownerId === user.id) throw fail(400, "OWN_LISTING", "You cannot propose to your own project.");
  try {
    const proposal = await prisma.projectProposal.create({
      data: { projectId: listingId, authorId: user.id, ...input }, select: { id: true, status: true, createdAt: true },
    });
    await prisma.notification.create({
      data: { recipientId: project.ownerId, actorId: user.id, type: "project_proposal", message: `sent a proposal for your project: ${project.title}`, resourceId: listingId },
    });
    return { ...proposal, createdAt: proposal.createdAt.toISOString() };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw fail(409, "PROPOSAL_EXISTS", "You have already sent a proposal for this project.");
    }
    throw error;
  }
}

export async function updateProposal(user: AuthUser, listingId: string, proposalId: string, status: "shortlisted" | "accepted" | "rejected" | "withdrawn") {
  const proposal = await prisma.projectProposal.findFirst({
    where: { id: proposalId, projectId: listingId }, include: { project: { select: { ownerId: true, title: true, status: true } } },
  });
  if (!proposal) throw fail(404, "PROPOSAL_NOT_FOUND", "Proposal not found.");
  let recipientId: string;
  if (proposal.authorId === user.id) {
    if (status !== "withdrawn" || !["submitted", "shortlisted"].includes(proposal.status)) throw fail(403, "PROPOSAL_STATUS_DENIED", "You can only withdraw a proposal that has not been accepted or rejected.");
    recipientId = proposal.project.ownerId;
  } else {
    if (proposal.project.ownerId !== user.id) throw fail(403, "LISTING_OWNER_REQUIRED", "Only the project owner can manage proposals.");
    if (status === "accepted" && proposal.project.status !== "open") throw fail(409, "PROJECT_ALREADY_ASSIGNED", "This project is no longer accepting a new professional.");
    if (!["shortlisted", "accepted", "rejected"].includes(status) || !["submitted", "shortlisted"].includes(proposal.status)) throw fail(409, "PROPOSAL_STATUS_CONFLICT", "This proposal can no longer be updated.");
    recipientId = proposal.authorId;
  }
  const updated = await prisma.projectProposal.update({ where: { id: proposalId }, data: { status }, select: { id: true, status: true, updatedAt: true } });
  if (status === "accepted") {
    await prisma.projectListing.update({ where: { id: listingId }, data: { status: "in_progress" } });
  }
  await prisma.notification.create({
    data: { recipientId, actorId: user.id, type: "project_proposal_update", message: `updated a proposal for ${proposal.project.title}: ${status}`, resourceId: listingId },
  });
  return { ...updated, updatedAt: updated.updatedAt.toISOString() };
}

export async function listMyProposals(user: AuthUser) {
  requireCapability(user, "professional");
  const rows = await prisma.projectProposal.findMany({
    where: { authorId: user.id }, orderBy: { updatedAt: "desc" }, take: 100,
    include: { project: { include: { owner: { select: personSelect } } } },
  });
  return rows.map(({ project, ...proposal }) => ({
    ...proposal, proposedBudget: serializeAmount(proposal.proposedBudget), createdAt: proposal.createdAt.toISOString(), updatedAt: proposal.updatedAt.toISOString(),
    project: { id: project.id, title: project.title, category: project.category, status: project.status, owner: project.owner },
  }));
}
