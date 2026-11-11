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
import ProfilePage from "../pages/ProfilePage";
import RegisterPage from "../pages/RegisterPage";
import AccessDeniedPage from "../pages/AccessDeniedPage";
import NotFoundPage from "../pages/NotFoundPage";
import RouteErrorPage from "../pages/RouteErrorPage";

// Developer tools: only available while running `npm run dev`.
const developmentOnlyRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: paths.designPreview, element: <DesignPreviewPage /> }]
  : [];

// Created once, outside the React tree.
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    // Last resort: if the layout itself crashes.
    errorElement: <RouteErrorPage />,
    children: [
      {
        // A pathless route that only adds a safety net around the pages.
        // If a page crashes, the header and footer stay visible.
        errorElement: <RouteErrorPage />,
        children: [
          { path: paths.home, element: <LandingPage /> },
          ...developmentOnlyRoutes,
          { path: paths.accessDenied, element: <AccessDeniedPage /> },
          // Anyone can open this URL. The API decides what they may see.
          { path: paths.profilePattern, element: <ProfilePage /> },
          {
            // Only for logged-out visitors. Logged-in people are redirected.
            element: <GuestRoute />,
            children: [
              { path: paths.login, element: <LoginPage /> },
              { path: paths.register, element: <RegisterPage /> },
            ],
          },
          {
            // Everything inside here needs a logged-in user.
            element: <ProtectedRoute />,
            children: [
              { path: paths.onboarding, element: <OnboardingPage /> },
              {
                // ...and a finished setup (otherwise: sent to /onboarding).
                element: <OnboardedRoute />,
                children: [
                  { path: paths.dashboard, element: <DashboardPage /> },
                  // "/profile/me" and "/profile/edit" are more specific than
                  // "/profile/:userId", so the router picks these for them.
                  { path: paths.myProfile, element: <MyProfilePage /> },
                  { path: paths.editProfile, element: <EditProfilePage /> },
                ],
              },
            ],
          },
          // The catch-all: any URL that matched nothing above.
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
