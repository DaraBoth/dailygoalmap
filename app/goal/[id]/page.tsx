"use client";

import React from "react";
import { use } from "react";
import GoalDetailContent from "@/components/goal/GoalDetailContent";

export default function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <GoalDetailContent goalId={id} />;
}
