// The user as the API sends it. JSON turns dates into text.
export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

// What the login and register forms send to the API.
export interface Credentials {
  email: string;
  password: string;
}
