import type { Metadata } from "next";
import { Suspense } from "react";
import { AddView } from "@/components/AddView";

export const metadata: Metadata = { title: "Add a game" };

export default function AddPage() {
  return (
    <Suspense>
      <AddView />
    </Suspense>
  );
}
