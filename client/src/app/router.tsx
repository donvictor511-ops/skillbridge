import { createBrowserRouter } from "react-router";
import PublicLayout from "../layouts/PublicLayout";
import SetupCheckPage from "../pages/SetupCheckPage";
import DesignPreviewPage from "../pages/DesignPreviewPage";

// Created once, outside the React tree.
export const router = createBrowserRouter([
  {
    // A layout route has no path. It only adds the frame around its children.
    element: <PublicLayout />,
    children: [
      {
        path: "/",
        element: <SetupCheckPage />,
      },
      {
        // TEMPORARY: removed when the real pages are built.
        path: "/design-preview",
        element: <DesignPreviewPage />,
      },
    ],
  },
]);
