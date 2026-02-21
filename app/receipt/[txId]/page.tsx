import { Suspense } from "react";
import ReceiptClient from "./ReceiptClient";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ txId: string }>;
}) {
  const { txId } = await params;

  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading receipt...</div>}>
      <ReceiptClient txId={txId} />
    </Suspense>
  );
}