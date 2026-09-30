import { createFileRoute } from "@tanstack/react-router";
import { PayLinkPage, parsePaySearch, payHead } from "@/components/pay-link-page";

export const Route = createFileRoute("/checkout/$id")({
  validateSearch: parsePaySearch,
  head: payHead,
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { amt, cur } = Route.useSearch();
  return <PayLinkPage id={id} amount={amt} currency={cur} />;
}
