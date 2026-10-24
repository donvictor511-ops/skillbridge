import type { ReactElement } from "react";
import { RouterProvider } from "react-router/dom";
import { router } from "./app/router";

export default function App(): ReactElement {
  return <RouterProvider router={router} />;
}
