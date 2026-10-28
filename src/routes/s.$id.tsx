import { createFileRoute } from "@tanstack/react-router";
import { PayLinkPage, parsePaySearch, payHead } from "@/components/pay-link-page";

export const Route = createFileRoute("/s/$id")({
  validateSearch: parsePaySearch,
  head: () => ({
    meta: payHead().meta.map((meta) => {
      if ("title" in meta) return { title: "Payment Link | CoindeccPay" };
      if ("property" in meta && meta.property === "og:title") return { ...meta, content: "Payment Link | CoindeccPay" };
      if (("name" in meta && meta.name === "description") || ("property" in meta && meta.property === "og:description")) {
        return { ...meta, content: "Pay a CoindeccPay payment link securely with USDC on Arc." };
      }
      return meta;
    }),
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { amt, cur, lnk, m } = Route.useSearch();
  return <PayLinkPage id={id} amount={amt} currency={cur} link={lnk ? { id: lnk, merchant: m ?? "" } : undefined} />;
}
