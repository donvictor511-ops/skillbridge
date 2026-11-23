import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { requireAuth, requireWriteAccess } from "../../middleware/requireAuth";
import {
  createComment,
  createPost,
  createRepost,
  deleteComment,
  deletePost,
  getComments,
  getPosts,
  likePost,
  unlikePost,
  sharePostWithConnection,
  removeRepost,
  updateComment,
  updatePost,
  reportPost,
  getProfilePosts,
  reactToPost,
} from "./posts.controller";
import { uploadSinglePostMedia } from "../../middleware/uploadPostMedia";
import { uploadPostMediaController } from "./posts.media.controller";

export const postsRouter = Router();

// Posts responses vary by viewer, so they must not be cached.
postsRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

// The feed supports anonymous visitors and logged-in users.
postsRouter.get("/", optionalAuth, getPosts);
postsRouter.get("/by-author/:userId", optionalAuth, getProfilePosts);

// All remaining Posts endpoints require authentication.
postsRouter.use(requireAuth);
// Upload images and short videos for posts and comments.
postsRouter.post("/media", requireWriteAccess, uploadSinglePostMedia, uploadPostMediaController);

// Create, edit, and delete posts.
postsRouter.post("/", requireWriteAccess, createPost);
postsRouter.patch("/:postId", requireWriteAccess, updatePost);
postsRouter.delete("/:postId", requireWriteAccess, deletePost);
postsRouter.post("/:postId/reports", reportPost);

// Like and unlike posts.
postsRouter.post("/:postId/likes", requireWriteAccess, likePost);
postsRouter.delete("/:postId/likes", requireWriteAccess, unlikePost);
postsRouter.patch("/:postId/reactions", requireWriteAccess, reactToPost);
postsRouter.post("/:postId/shares", requireWriteAccess, sharePostWithConnection);
postsRouter.post("/:postId/reposts", requireWriteAccess, createRepost);
postsRouter.delete("/:postId/reposts", requireWriteAccess, removeRepost);

// Read and manage comments.
postsRouter.get("/:postId/comments", getComments);
postsRouter.post("/:postId/comments", requireWriteAccess, createComment);
postsRouter.post("/:postId/comments/:commentId/reports", reportPost);
postsRouter.patch("/:postId/comments/:commentId", requireWriteAccess, updateComment);
postsRouter.delete("/:postId/comments/:commentId", requireWriteAccess, deleteComment);
