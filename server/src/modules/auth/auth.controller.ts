import type { Request, Response } from "express";
import { registerSchema } from "./auth.schema";
import { registerUser } from "./auth.service";

export async function register(req: Request, res: Response): Promise<void> {
  // If the body is invalid, parse() throws a ZodError, and the error handler
  // turns it into a 400 response. The controller stays short and simple.
  const input = registerSchema.parse(req.body);

  const user = await registerUser(input);

  res.status(201).json({ data: { user } });
}
