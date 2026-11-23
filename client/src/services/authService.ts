import axios from "axios";
import type { ApiSuccessResponse } from "../types/api";
import type { AuthUser, Credentials } from "../types/auth";
import { apiClient } from "./apiClient";

interface UserResponseData {
  user: AuthUser;
}

// Returns the logged-in user, or null if nobody is logged in (a normal case).
// Other problems (server down, and so on) are thrown, so the app can tell
// "logged out" apart from "could not check".
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response =
      await apiClient.get<ApiSuccessResponse<UserResponseData>>("/auth/me");
    return response.data.data.user;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function login(credentials: Credentials): Promise<AuthUser> {
  const response = await apiClient.post<ApiSuccessResponse<UserResponseData>>(
    "/auth/login",
    credentials,
  );
  return response.data.data.user;
}

export async function submitAccountAppeal(input: Credentials & { message: string }): Promise<void> {
  await apiClient.post("/auth/account-appeals", input);
}

// Creates the account. The server also starts a session (sets the cookie).
export async function register(credentials: Credentials): Promise<AuthUser> {
  const response = await apiClient.post<ApiSuccessResponse<UserResponseData>>(
    "/auth/register",
    credentials,
  );
  return response.data.data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
