import axios from "axios";
import type { AxiosInstance } from "axios";

const baseURL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

// The one shared Axios instance. All API calls in the app go through
// service files that import this client, never directly from components.
export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
  // Send the session cookie to the API (and accept a new one).
  withCredentials: true,
});
