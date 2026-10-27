import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { paths } from "./paths";
import PublicLayout from "../layouts/PublicLayout";
import LandingPage from "../pages/LandingPage";
import DesignPreviewPage from "../pages/DesignPreviewPage";
import LoginPage from "../pages/LoginPage";
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
          { path: paths.login, element: <LoginPage /> }, // PLACEHOLDER
          { path: paths.register, element: <RegisterPage /> }, // PLACEHOLDER
          { path: paths.accessDenied, element: <AccessDeniedPage /> },
          // The catch-all: any URL that matched nothing above.
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
