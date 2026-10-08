import { createFileRoute } from "@tanstack/react-router";
import { IcpProfilesPage } from "@/client/features/projects/IcpProfilesPage";

export const Route = createFileRoute("/_project/p/$projectId/settings/icp")({
  component: IcpProfilesRoute,
});

function IcpProfilesRoute() {
  const { projectId } = Route.useParams();
  return <IcpProfilesPage projectId={projectId} />;
}
