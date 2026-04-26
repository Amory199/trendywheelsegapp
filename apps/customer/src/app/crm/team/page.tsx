"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";

import { authedFetch } from "../../../lib/fetcher";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  staffRole: string | null;
  salesTargetMonthly: string | number | null;
  salesAssignmentWeight: number;
  monthWonAmount: number;
  monthWonCount: number;
  openLeads: number;
  progressPct: number | null;
}

export default function TeamPage(): JSX.Element {
  const q = useQuery<{ data: TeamMember[] }>({
    queryKey: ["crm-team"],
    queryFn: () => authedFetch("/api/crm/team"),
  });

  const members = q.data?.data ?? [];
  const sales = members.filter((m) => m.staffRole === "sales" || m.staffRole === "admin");
  const others = members.filter((m) => m.staffRole !== "sales" && m.staffRole !== "admin");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.brand.trendyPink, letterSpacing: "0.12em" }}>TEAM</span>
        <h1 style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 36, margin: "4px 0 0", textTransform: "uppercase" }}>
          The squad<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
        <p style={{ color: "#6B6A85", marginTop: 4 }}>Sales targets · open pipeline · month-to-date wins</p>
      </div>

      <Section title="Sales agents" members={sales} accent={colors.brand.trendyPink} />
      <Section title="Other staff" members={others} accent={colors.brand.poolBlue} />
    </div>
  );
}

function Section({ title, members, accent }: { title: string; members: TeamMember[]; accent: string }): JSX.Element {
  return (
    <div>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#6B6A85", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>{title}</h2>
      <div className="tw-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {members.map((m) => {
          const pct = m.progressPct ?? 0;
          const target = m.salesTargetMonthly ? Number(m.salesTargetMonthly) : 0;
          return (
            <div
              key={m.id}
              className="tw-card-lift"
              style={{ background: "#fff", border: "1px solid #ECECF1", borderRadius: 14, padding: 18, borderTop: `3px solid ${accent}` }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    background: `linear-gradient(135deg, ${colors.brand.trendyPink}, ${colors.brand.friendlyBlue})`,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: colors.brand.trustWorth }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "#6B6A85", textTransform: "capitalize" }}>{m.staffRole ?? "staff"} · weight {m.salesAssignmentWeight}</div>
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B6A85" }}>
                <span>{m.monthWonCount} won · {m.openLeads} open</span>
                <span style={{ color: colors.brand.ecoLimelight === accent ? colors.brand.trustWorth : "#4B4A6B", fontWeight: 700 }}>
                  EGP {Math.round(m.monthWonAmount).toLocaleString()}
                </span>
              </div>
              {target > 0 ? (
                <>
                  <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: "#F4F4F7", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${accent}, ${colors.brand.ecoLimelight})`,
                        transition: "width 800ms cubic-bezier(.2,.7,.3,1)",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: "#4B4A6B" }}>
                    {pct}% of EGP {Math.round(target).toLocaleString()} target
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 8, fontSize: 11, color: "#9E9DAE" }}>No monthly target set</div>
              )}
            </div>
          );
        })}
        {members.length === 0 ? <div style={{ color: "#6B6A85", fontSize: 13 }}>No team members yet.</div> : null}
      </div>
    </div>
  );
}
