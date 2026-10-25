import { createBrowserRouter } from "react-router";
import { MainLayout } from "../components/layout/MainLayout";
import DesignPreviewPage from "../pages/DesignPreviewPage";
import NotFoundPage from "../pages/NotFoundPage";
import SetupCheckPage from "../pages/SetupCheckPage";

// Every page renders inside MainLayout's <Outlet />.
export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "/", element: <SetupCheckPage /> },
      // TEMPORARY: removed when the real pages are built.
      { path: "/design-preview", element: <DesignPreviewPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
