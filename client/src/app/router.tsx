import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { paths } from "./paths";
import { GuestRoute } from "../features/auth/GuestRoute";
import { OnboardedRoute } from "../features/auth/OnboardedRoute";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import PublicLayout from "../layouts/PublicLayout";
import LandingPage from "../pages/LandingPage";
import DashboardPage from "../pages/DashboardPage";
import DesignPreviewPage from "../pages/DesignPreviewPage";
import EditProfilePage from "../pages/EditProfilePage";
import LoginPage from "../pages/LoginPage";
import MyProfilePage from "../pages/MyProfilePage";
import OnboardingPage from "../pages/OnboardingPage";
import PreviewProfilePage from "../pages/PreviewProfilePage";
import ProfilePage from "../pages/ProfilePage";
import RegisterPage from "../pages/RegisterPage";
import AccessDeniedPage from "../pages/AccessDeniedPage";
import NotFoundPage from "../pages/NotFoundPage";
import RouteErrorPage from "../pages/RouteErrorPage";
import DiscoverPage from "../pages/DiscoverPage";
import ConnectionsPage from "../pages/ConnectionsPage";

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
          { path: paths.home, element: <LandingPage /> },
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
                  { path: paths.dashboard, element: <DashboardPage /> },
                  { path: paths.discover, element: <DiscoverPage /> },
                  { path: paths.connections, element: <ConnectionsPage /> },
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
