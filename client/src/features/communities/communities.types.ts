export interface CommunityPerson {
  id: string;
  profile: { displayName: string | null; avatarUrl: string | null; headline: string | null } | null;
}

export interface CommunitySummary {
  id: string;
  name: string;
  description: string;
  guidelines: string;
  owner: CommunityPerson;
  memberCount: number;
  postCount: number;
  myRole: "owner" | "moderator" | "member" | null;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: CommunityPerson;
}

export interface CommunityDiscussion {
  id: string;
  communityId: string;
  authorId: string;
  content: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  createdAt: string;
  updatedAt: string;
  author: CommunityPerson;
  comments: CommunityComment[];
}

export interface CommunityInvitation { id: string; createdAt: string; community: { id: string; name: string; description: string }; inviter: CommunityPerson; }

export interface CommunityMember {
  userId: string;
  role: "owner" | "moderator" | "member";
  joinedAt: string;
  user: CommunityPerson;
}

export interface CommunityReport {
  id: string;
  postId: string | null;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: string;
  reporter: CommunityPerson;
  post: { id: string; content: string } | null;
}

export interface CommunityDetail extends CommunitySummary {
  members: CommunityMember[];
  posts: CommunityDiscussion[];
  reports: CommunityReport[];
}
