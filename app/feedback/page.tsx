import { Suspense } from "react";
import FeedbackClient from "./FeedbackClient";

export const dynamic = "force-dynamic";

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6">Loading...</div>}>
      <FeedbackClient />
    </Suspense>
  );
}