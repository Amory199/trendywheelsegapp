"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useEffect, useState } from "react";

import { useAuth } from "../../../lib/auth-store";
import { authedFetch } from "../../../lib/fetcher";

interface Rules {
  firstCallWithinMinutes: number;
  followUpCallWithinHours: number;
  reassignAfterHours: number;
  maxReassignmentsBeforeEscalation: number;
  notifyOnAssignment: boolean;
  notifyOnEscalation: boolean;
  enforceRules: boolean;
}

export default function CrmRulesPage(): JSX.Element {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.accountType === "admin";

  const q = useQuery<{ data: Rules }>({
    queryKey: ["crm-rules"],
    queryFn: () => authedFetch("/api/crm/rules"),
  });

  const [draft, setDraft] = useState<Rules | null>(null);
  useEffect(() => {
    if (q.data?.data && !draft) setDraft(q.data.data);
  }, [q.data, draft]);

  const save = useMutation({
    mutationFn: (body: Partial<Rules>) =>
      authedFetch("/api/crm/rules", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crm-rules"] });
    },
  });

  if (!isAdmin) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 16,
          padding: 32,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.brand.trendyPink,
            letterSpacing: "0.12em",
          }}
        >
          RESTRICTED
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 28,
            margin: "8px 0",
            textTransform: "uppercase",
          }}
        >
          Sales rules are admin-only
        </h1>
        <p style={{ color: "#6B6A85", fontSize: 14 }}>
          Ask an admin to adjust the call-back deadlines and reassignment thresholds.
        </p>
      </div>
    );
  }

  if (!draft) return <div style={{ color: "#6B6A85" }}>Loading rules…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.brand.trendyPink,
            letterSpacing: "0.12em",
          }}
        >
          SALES RULES
        </span>
        <h1
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            margin: "4px 0 0",
            textTransform: "uppercase",
          }}
        >
          Strict call rules<span style={{ color: colors.brand.trendyPink }}>.</span>
        </h1>
        <p style={{ color: "#6B6A85", marginTop: 4 }}>
          Agents must call leads within these windows. Misses → automatic reassignment.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <RuleCard
          title="First call deadline"
          unit="minutes"
          description="After auto-assignment, the agent must log a call within this many minutes."
          value={draft.firstCallWithinMinutes}
          onChange={(v) => setDraft({ ...draft, firstCallWithinMinutes: v })}
          min={5}
          max={240}
          accent={colors.brand.trendyPink}
        />
        <RuleCard
          title="Follow-up cadence"
          unit="hours"
          description="Once contacted, the lead must be called again within this window or it goes back into the pool."
          value={draft.followUpCallWithinHours}
          onChange={(v) => setDraft({ ...draft, followUpCallWithinHours: v })}
          min={1}
          max={168}
          accent={colors.brand.friendlyBlue}
        />
        <RuleCard
          title="Hard cap"
          unit="hours"
          description="If a lead has been assigned for this long with zero calls, reassign immediately."
          value={draft.reassignAfterHours}
          onChange={(v) => setDraft({ ...draft, reassignAfterHours: v })}
          min={1}
          max={720}
          accent={colors.brand.ultraRed}
        />
        <RuleCard
          title="Escalate after N misses"
          unit="reassignments"
          description="If a lead bounces this many times without a call, admins are paged."
          value={draft.maxReassignmentsBeforeEscalation}
          onChange={(v) => setDraft({ ...draft, maxReassignmentsBeforeEscalation: v })}
          min={1}
          max={10}
          accent={colors.brand.ecoLimelight}
        />
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ECECF1",
          borderRadius: 14,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <ToggleRow
          label="Enforce rules"
          description="Master switch. Disable to pause the auto-reassignment sweep."
          value={draft.enforceRules}
          onChange={(v) => setDraft({ ...draft, enforceRules: v })}
        />
        <ToggleRow
          label="Notify agent on assignment"
          description="Push notification when a lead lands on their queue."
          value={draft.notifyOnAssignment}
          onChange={(v) => setDraft({ ...draft, notifyOnAssignment: v })}
        />
        <ToggleRow
          label="Notify admins on escalation"
          description="Page admins when a lead has bounced past the threshold without a call."
          value={draft.notifyOnEscalation}
          onChange={(v) => setDraft({ ...draft, notifyOnEscalation: v })}
        />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={() => save.mutate(draft)}
          disabled={save.isPending}
          className="tw-press"
          style={{
            padding: "12px 24px",
            border: "none",
            borderRadius: 12,
            background: colors.brand.friendlyBlue,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: save.isPending ? "wait" : "pointer",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {save.isPending ? "Saving…" : "Save rules"}
        </button>
        {save.isSuccess ? (
          <span style={{ fontSize: 12, color: colors.brand.ecoLimelight, fontWeight: 700 }}>
            Saved · sweep runs every 15 min
          </span>
        ) : null}
      </div>
    </div>
  );
}

function RuleCard({
  title,
  unit,
  description,
  value,
  onChange,
  min,
  max,
  accent,
}: {
  title: string;
  unit: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  accent: string;
}): JSX.Element {
  return (
    <div
      className="tw-card-lift"
      style={{
        background: "#fff",
        border: "1px solid #ECECF1",
        borderRadius: 14,
        padding: 18,
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#4B4A6B",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
          style={{
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
            color: accent,
            border: "none",
            background: "transparent",
            width: 100,
            padding: 0,
          }}
        />
        <span style={{ fontSize: 13, color: "#6B6A85", fontWeight: 600 }}>{unit}</span>
      </div>
      <p style={{ fontSize: 12, color: "#6B6A85", marginTop: 8, lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.brand.trustWorth }}>{label}</div>
        <div style={{ fontSize: 11, color: "#6B6A85", marginTop: 2 }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="tw-press"
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: "none",
          background: value ? colors.brand.ecoLimelight : "#ECECF1",
          position: "relative",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: 10,
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
            transition: "left 180ms cubic-bezier(.2,.7,.3,1)",
          }}
        />
      </button>
    </div>
  );
}
