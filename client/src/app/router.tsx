import { createBrowserRouter } from "react-router";
import SetupCheckPage from "../pages/SetupCheckPage";
import DesignPreviewPage from "../pages/DesignPreviewPage";

// Created once, outside the React tree.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <SetupCheckPage />,
  },
  {
    // TEMPORARY: removed when the real pages are built.
    path: "/design-preview",
    element: <DesignPreviewPage />,
  },
]);
