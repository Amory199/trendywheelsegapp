"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";

import { authedFetch } from "../../../lib/fetcher";

interface Lead {
  id: string;
  contactName: string;
  status: string;
  estimatedValue: string | number;
  owner: { id: string; name: string } | null;
  lastActivityAt: string;
  source: string;
}

const STATUS_COLOR: Record<string, string> = {
  new: colors.brand.poolBlue,
  contacted: "#7C7BFF",
  qualified: colors.brand.friendlyBlue,
  proposal: colors.brand.trendyPink,
  won: colors.brand.ecoLimelight,
  lost: "#9E9DAE",
};

export default function PipelinePage(): JSX.Element {
  const q = useQuery<{ data: Lead[] }>({
    queryKey: ["crm-leads-all"],
    queryFn: () => authedFetch("/api/crm/leads"),
  });
  const leads = q.data?.data ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.brand.trendyPink, letterSpacing: "0.12em" }}>FUNNEL</span>
        <h1 style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 36, margin: "4px 0 0", textTransform: "uppercase" }}>
          Pipeline value<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
      </div>

      <div style={{ background: "#fff", border: "1px solid #ECECF1", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F7F7FB" }}>
              <th style={th}>Contact</th>
              <th style={th}>Status</th>
              <th style={th}>Owner</th>
              <th style={th}>Source</th>
              <th style={{ ...th, textAlign: "right" }}>Value</th>
              <th style={th}>Last activity</th>
            </tr>
          </thead>
          <tbody className="tw-stagger">
            {leads.map((l) => (
              <tr key={l.id} style={{ borderTop: "1px solid #ECECF1" }}>
                <td style={td}>
                  <Link href={`/crm/leads/${l.id}`} style={{ color: colors.brand.friendlyBlue, fontWeight: 700, textDecoration: "none" }}>
                    {l.contactName}
                  </Link>
                </td>
                <td style={td}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: `${STATUS_COLOR[l.status] ?? "#888"}22`, color: STATUS_COLOR[l.status] ?? "#666", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: STATUS_COLOR[l.status] ?? "#888" }} />
                    {l.status}
                  </span>
                </td>
                <td style={td}>{l.owner?.name ?? <span style={{ color: "#9E9DAE" }}>Unassigned</span>}</td>
                <td style={{ ...td, textTransform: "capitalize" }}>{l.source.replace(/[-_]/g, " ")}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>EGP {Math.round(Number(l.estimatedValue)).toLocaleString()}</td>
                <td style={{ ...td, fontSize: 11, color: "#6B6A85" }}>{new Date(l.lastActivityAt).toLocaleString()}</td>
              </tr>
            ))}
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: "center", color: "#6B6A85", padding: 32 }}>No leads yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "12px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B6A85", textAlign: "left" };
const td: React.CSSProperties = { padding: "12px 16px", fontSize: 13, color: "#02011F" };
