import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: SettingsAlias,
});

function SettingsAlias() {
  return <Navigate to="/profile" replace />;
}