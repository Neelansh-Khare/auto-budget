import { Suspense } from "react";
import { SubscriptionsClient } from "./SubscriptionsClient";

export const metadata = {
  title: "Subscriptions - AutoBudgeter",
};

export default function SubscriptionsPage() {
  return (
    <div className="container max-w-screen-2xl mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground">
          Manage your recurring expenses and subscriptions.
        </p>
      </div>

      <Suspense fallback={<div>Loading subscriptions...</div>}>
        <SubscriptionsClient />
      </Suspense>
    </div>
  );
}
