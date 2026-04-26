"use client";

import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import Link from "next/link";

import { authedFetch } from "../../lib/fetcher";

interface PipelineData {
  byStatus: Array<{ status: string; count: number; value: number }>;
  totals: { count: number; value: number };
  recent: Array<{
    id: string;
    contactName: string;
    status: string;
    estimatedValue: string | number;
    lastActivityAt: string;
    owner: { id: string; name: string } | null;
    customer: { id: string; name: string } | null;
  }>;
  myTarget: {
    targetMonthly: number;
    wonAmount: number;
    wonCount: number;
    progressPct: number | null;
    openValue: number;
    openCount: number;
  } | null;
}

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const STATUS_COLOR: Record<string, string> = {
  new: colors.brand.poolBlue,
  contacted: "#7C7BFF",
  qualified: colors.brand.friendlyBlue,
  proposal: colors.brand.trendyPink,
  won: colors.brand.ecoLimelight,
  lost: "#9E9DAE",
};

export default function CrmDashboardPage(): JSX.Element {
  const q = useQuery<{ data: PipelineData }>({
    queryKey: ["crm-pipeline"],
    queryFn: () => authedFetch("/api/crm/pipeline"),
  });

  const data = q.data?.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.brand.trendyPink, letterSpacing: "0.12em" }}>
          SALES WORKSPACE
        </span>
        <h1 style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 44, margin: "6px 0 0", textTransform: "uppercase", letterSpacing: "0.01em" }}>
          The pipeline<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
        <p style={{ color: "#6B6A85", marginTop: 4 }}>
          Live leads · automatic round-robin · {data ? `${data.totals.count} open` : "loading"}
        </p>
      </div>

      {data?.myTarget ? <TargetCard target={data.myTarget} /> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {data?.byStatus.map((b) => (
          <div
            key={b.status}
            className="tw-card-lift"
            style={{
              background: "#fff",
              border: "1px solid #ECECF1",
              borderRadius: 14,
              padding: 16,
              borderLeft: `4px solid ${STATUS_COLOR[b.status] ?? "#888"}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B6A85", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {STATUS_LABEL[b.status] ?? b.status}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: colors.brand.trustWorth, marginTop: 4, fontFamily: "Anton, Impact, sans-serif" }}>
              {b.count}
            </div>
            <div style={{ fontSize: 12, color: "#6B6A85", marginTop: 2 }}>
              EGP {Math.round(b.value).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #ECECF1", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Recent activity</h2>
          <Link href="/crm/leads" style={{ fontSize: 12, color: colors.brand.friendlyBlue, fontWeight: 700, textDecoration: "none" }}>
            See all leads →
          </Link>
        </div>
        <div className="tw-stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(data?.recent ?? []).map((r) => (
            <Link
              key={r.id}
              href={`/crm/leads/${r.id}`}
              style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 10, background: "#F7F7FB", border: "1px solid transparent" }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: STATUS_COLOR[r.status] ?? "#888",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.contactName}
                </div>
                <div style={{ fontSize: 12, color: "#6B6A85" }}>
                  {STATUS_LABEL[r.status] ?? r.status} · {r.owner?.name ?? "Unassigned"}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.brand.trustWorth }}>
                EGP {Math.round(Number(r.estimatedValue)).toLocaleString()}
              </div>
            </Link>
          ))}
          {!data?.recent?.length && !q.isLoading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#6B6A85", fontSize: 13 }}>No leads yet — they appear automatically as customers sign up.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TargetCard({ target }: { target: NonNullable<PipelineData["myTarget"]> }): JSX.Element {
  const pct = target.progressPct ?? 0;
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${colors.brand.friendlyBlue}, ${colors.brand.trustWorth})`,
        color: "#fff",
        borderRadius: 18,
        padding: 22,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="tw-hero-ambient" aria-hidden>
        <div className="tw-hero-orb h-pink" />
        <div className="tw-hero-orb h-lime" />
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: colors.brand.ecoLimelight }}>
            MY TARGET · MONTH-TO-DATE
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
            <span style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 44, lineHeight: 1 }}>
              EGP {Math.round(target.wonAmount).toLocaleString()}
            </span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
              of {target.targetMonthly ? `EGP ${Math.round(target.targetMonthly).toLocaleString()}` : "no target set"}
            </span>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            {target.wonCount} won · {target.openCount} open · EGP {Math.round(target.openValue).toLocaleString()} in pipeline
          </div>
        </div>
        <div style={{ minWidth: 220 }}>
          <div style={{ height: 12, borderRadius: 6, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${colors.brand.ecoLimelight}, ${colors.brand.trendyPink})`,
                transition: "width 800ms cubic-bezier(.2,.7,.3,1)",
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
            {target.targetMonthly ? `${pct}% to target` : "Set a target in Team settings"}
          </div>
        </div>
      </div>
    </div>
  );
}
