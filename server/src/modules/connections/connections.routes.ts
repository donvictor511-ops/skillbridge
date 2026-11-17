import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import {
  acceptConnectionRequest,
  createConnectionRequest,
  deleteConnection,
  getConnections,
  rejectConnectionRequest,
} from "./connections.controller";

export const connectionsRouter = Router();

// Connection information is private and must never be cached.
connectionsRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

// Every Connections endpoint requires authentication.
connectionsRouter.use(requireAuth);

// List incoming, outgoing, accepted, and rejected connections.
connectionsRouter.get("/", getConnections);

// Send a connection request.
connectionsRouter.post("/:userId", createConnectionRequest);

// Accept or reject an incoming request.
connectionsRouter.patch("/:connectionId/accept", acceptConnectionRequest);
connectionsRouter.patch("/:connectionId/reject", rejectConnectionRequest);

// Cancel a request or remove an existing connection.
connectionsRouter.delete("/:connectionId", deleteConnection);
