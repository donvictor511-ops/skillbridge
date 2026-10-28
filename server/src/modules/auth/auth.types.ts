// The only user fields we ever send to the client.
// Note: no password and no passwordHash.
export interface AuthUser {
  id: string;
  email: string;
  createdAt: Date;
}
