import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/grocery")({
  component: GroceryAlias,
});

function GroceryAlias() {
  return <Navigate to="/list" replace />;
}