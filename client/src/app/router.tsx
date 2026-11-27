import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { paths } from "./paths";
import { GuestRoute } from "../features/auth/GuestRoute";
import { OnboardedRoute } from "../features/auth/OnboardedRoute";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import PublicLayout from "../layouts/PublicLayout";
import HomePage from "../pages/HomePage";
import DashboardPage from "../pages/DashboardPage";
import DesignPreviewPage from "../pages/DesignPreviewPage";
import EditProfilePage from "../pages/EditProfilePage";
import LoginPage from "../pages/LoginPage";
import MyProfilePage from "../pages/MyProfilePage";
import OnboardingPage from "../pages/OnboardingPage";
import PreviewProfilePage from "../pages/PreviewProfilePage";
import ProfilePage from "../pages/ProfilePage";
import RegisterPage from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import AccessDeniedPage from "../pages/AccessDeniedPage";
import NotFoundPage from "../pages/NotFoundPage";
import RouteErrorPage from "../pages/RouteErrorPage";
import DiscoverPage from "../pages/DiscoverPage";
import ConnectionsPage from "../pages/ConnectionsPage";
import { PostsFeedPage } from "../features/posts/PostsFeedPage";
import { SavedPostsPage } from "../features/posts/SavedPostsPage";
import { NotificationSettingsPage } from "../features/notifications/NotificationSettingsPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { MessagesPage } from "../features/messages/MessagesPage";
import { CommunitiesPage } from "../features/communities/CommunitiesPage";
import { JobsPage, MyJobApplicationsPage } from "../features/marketplace/JobsPage";
import { MyProjectProposalsPage, ProjectsPage } from "../features/marketplace/ProjectsPage";
import { AiCareerPage } from "../features/ai/AiCareerPage";
import { AdminDashboardPage } from "../features/admin/AdminDashboardPage";
import { CommunityGuidelinesPage } from "../pages/CommunityGuidelinesPage";
import { SearchPage } from "../features/search/SearchPage";

// Developer tools: only available while running `npm run dev`.
const developmentOnlyRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: paths.designPreview, element: <DesignPreviewPage /> }]
  : [];

// Created once, outside the React tree.
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { path: paths.home, element: <HomePage /> },
          { path: paths.guidelines, element: <CommunityGuidelinesPage /> },
          { path: paths.forgotPassword, element: <ForgotPasswordPage /> },
          { path: paths.resetPassword, element: <ResetPasswordPage /> },
          ...developmentOnlyRoutes,
          { path: paths.accessDenied, element: <AccessDeniedPage /> },
          { path: paths.profilePattern, element: <ProfilePage /> },
          {
            element: <GuestRoute />,
            children: [
              { path: paths.login, element: <LoginPage /> },
              { path: paths.register, element: <RegisterPage /> },
            ],
          },
          {
            element: <ProtectedRoute />,
            children: [
              { path: paths.onboarding, element: <OnboardingPage /> },
              {
                element: <OnboardedRoute />,
                children: [
                  { path: paths.posts, element: <PostsFeedPage /> },
                  { path: paths.savedPosts, element: <SavedPostsPage /> },
                  { path: paths.notificationSettings, element: <NotificationSettingsPage /> },
                  { path: paths.notifications, element: <NotificationsPage /> },
                  { path: paths.dashboard, element: <DashboardPage /> },
                  { path: paths.discover, element: <DiscoverPage /> },
                  { path: paths.search, element: <SearchPage /> },
                  { path: paths.search, element: <SearchPage /> },
                  { path: paths.connections, element: <ConnectionsPage /> },
                  { path: paths.messages, element: <MessagesPage /> },
                  { path: `${paths.calls}/:callId`, element: <div aria-hidden="true" /> },
                  { path: paths.communities, element: <CommunitiesPage /> },
                  { path: paths.jobApplications, element: <MyJobApplicationsPage /> },
                  { path: `${paths.jobs}/:listingId`, element: <JobsPage /> },
                  { path: paths.jobs, element: <JobsPage /> },
                  { path: paths.projectProposals, element: <MyProjectProposalsPage /> },
                  { path: `${paths.projects}/:listingId`, element: <ProjectsPage /> },
                  { path: paths.projects, element: <ProjectsPage /> },
                  { path: paths.aiCareer, element: <AiCareerPage /> },
                  { path: paths.admin, element: <AdminDashboardPage /> },
                  { path: paths.myProfile, element: <MyProfilePage /> },
                  { path: paths.editProfile, element: <EditProfilePage /> },
                  {
                    path: paths.previewProfile,
                    element: <PreviewProfilePage />,
                  },
                ],
              },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
