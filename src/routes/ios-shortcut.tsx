import { createFileRoute } from "@tanstack/react-router";
import IosShortcutPage from "@/pages/IosShortcut";

export const Route = createFileRoute("/ios-shortcut")({
  component: IosShortcutPage,
});
