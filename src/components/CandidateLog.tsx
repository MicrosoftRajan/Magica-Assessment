"use client";

import { useEffect } from "react";

export function CandidateLog() {
  useEffect(() => {
    const linkedin =
      process.env.NEXT_PUBLIC_CANDIDATE_LINKEDIN ??
      "https://www.linkedin.com/in/your-profile";
    console.log(`[NextFlow] Candidate LinkedIn: ${linkedin}`);
  }, []);

  return null;
}
