import "dotenv/config";

type NodeEnv = "development" | "test" | "production";

export interface Env {
  nodeEnv: NodeEnv;
  port: number;
  clientOrigin: string;
  databaseUrl: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  geminiApiKey?: string;
  geminiModel: string;
  brevoApiKey?: string;
  brevoFromEmail?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  linkedinClientId?: string;
  linkedinClientSecret?: string;
}

function readNodeEnv(value: string | undefined): NodeEnv {
  if (value === undefined || value === "") {
    return "development";
  }

  if (value === "development" || value === "test" || value === "production") {
    return value;
  }

  throw new Error(
    `Invalid NODE_ENV "${value}". Use development, test, or production.`,
  );
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? "4000");

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT "${String(value)}". Use a whole number from 1 to 65535.`,
    );
  }

  return port;
}

function readRequired(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

// Read and validate once. If something is wrong, the server refuses to start.
export const env: Env = {
  nodeEnv: readNodeEnv(process.env.NODE_ENV),
  port: readPort(process.env.PORT),
  clientOrigin: readRequired("CLIENT_ORIGIN", process.env.CLIENT_ORIGIN),
  databaseUrl: readRequired("DATABASE_URL", process.env.DATABASE_URL),

  cloudinaryCloudName: readRequired(
    "CLOUDINARY_CLOUD_NAME",
    process.env.CLOUDINARY_CLOUD_NAME,
  ),
  cloudinaryApiKey: readRequired(
    "CLOUDINARY_API_KEY",
    process.env.CLOUDINARY_API_KEY,
  ),
  cloudinaryApiSecret: readRequired(
    "CLOUDINARY_API_SECRET",
    process.env.CLOUDINARY_API_SECRET,
  ),
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || undefined,
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
  brevoApiKey: process.env.BREVO_API_KEY?.trim() || undefined,
  brevoFromEmail: process.env.BREVO_FROM_EMAIL?.trim() || undefined,
  resendApiKey: process.env.RESEND_API_KEY?.trim() || undefined,
  resendFromEmail: process.env.RESEND_FROM_EMAIL?.trim() || undefined,
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || undefined,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || undefined,
  linkedinClientId: process.env.LINKEDIN_CLIENT_ID?.trim() || undefined,
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET?.trim() || undefined,
};
