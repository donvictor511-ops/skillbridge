import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { requireAuth } from "../../middleware/requireAuth";
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  getComments,
  getPosts,
  likePost,
  unlikePost,
  updateComment,
  updatePost,
} from "./posts.controller";

export const postsRouter = Router();

// Posts responses vary by viewer, so they must not be cached.
postsRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

// The feed supports anonymous visitors and logged-in users.
postsRouter.get("/", optionalAuth, getPosts);

// All remaining Posts endpoints require authentication.
postsRouter.use(requireAuth);

// Create, edit, and delete posts.
postsRouter.post("/", createPost);
postsRouter.patch("/:postId", updatePost);
postsRouter.delete("/:postId", deletePost);

// Like and unlike posts.
postsRouter.post("/:postId/likes", likePost);
postsRouter.delete("/:postId/likes", unlikePost);

// Read and manage comments.
postsRouter.get("/:postId/comments", getComments);
postsRouter.post("/:postId/comments", createComment);
postsRouter.patch("/:postId/comments/:commentId", updateComment);
postsRouter.delete("/:postId/comments/:commentId", deleteComment);
