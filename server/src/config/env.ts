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
  githubClientId?: string;
  githubClientSecret?: string;
  firebaseAdmin: { projectId: string; clientEmail: string; privateKey: string } | null;
  firebaseWeb: { apiKey: string; authDomain: string; projectId: string; appId: string; messagingSenderId: string } | null;
  firebaseVapidKey?: string;
  firebaseDeviceTokenEncryptionKey: Buffer | null;
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
  githubClientId: process.env.GITHUB_CLIENT_ID?.trim() || undefined,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET?.trim() || undefined,
  firebaseAdmin: process.env.FIREBASE_PROJECT_ID?.trim() && process.env.FIREBASE_CLIENT_EMAIL?.trim() && process.env.FIREBASE_PRIVATE_KEY?.trim()
    ? {
        projectId: process.env.FIREBASE_PROJECT_ID.trim(),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(),
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").trim(),
      }
    : null,
  firebaseWeb: process.env.FIREBASE_WEB_API_KEY?.trim() && process.env.FIREBASE_WEB_AUTH_DOMAIN?.trim() && process.env.FIREBASE_WEB_PROJECT_ID?.trim() && process.env.FIREBASE_WEB_APP_ID?.trim() && process.env.FIREBASE_WEB_MESSAGING_SENDER_ID?.trim()
    ? {
        apiKey: process.env.FIREBASE_WEB_API_KEY.trim(),
        authDomain: process.env.FIREBASE_WEB_AUTH_DOMAIN.trim(),
        projectId: process.env.FIREBASE_WEB_PROJECT_ID.trim(),
        appId: process.env.FIREBASE_WEB_APP_ID.trim(),
        messagingSenderId: process.env.FIREBASE_WEB_MESSAGING_SENDER_ID.trim(),
      }
    : null,
  firebaseVapidKey: process.env.FIREBASE_VAPID_KEY?.trim() || undefined,
  firebaseDeviceTokenEncryptionKey: (() => {
    const value = process.env.FIREBASE_DEVICE_TOKEN_ENCRYPTION_KEY?.trim();
    if (!value) return null;
    const key = Buffer.from(value, "base64");
    return key.length === 32 ? key : null;
  })(),
};
