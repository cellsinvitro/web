"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BudgetDetailPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cyrosearch?tab=budget");
  }, [router]);

  return null;
}
