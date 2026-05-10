"use client";

import { redirect } from "next/navigation";

export default function MaintenanceRedirect(): null {
  redirect("/repair");
}
