import { createBrowserRouter } from "react-router";
import SetupCheckPage from "../pages/SetupCheckPage";

// Created once, outside the React tree.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <SetupCheckPage />,
  },
]);
