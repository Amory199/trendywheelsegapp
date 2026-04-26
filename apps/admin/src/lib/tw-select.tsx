"use client";

import { colors } from "@trendywheels/ui-tokens";
import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
  color?: string;
  bg?: string;
}

interface Props {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  size?: "sm" | "md";
  pill?: boolean;
  width?: number | string;
  placeholder?: string;
}

export function TWSelect({
  value,
  options,
  onChange,
  size = "md",
  pill = false,
  width,
  placeholder = "Select…",
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [springKey, setSpringKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const padding = size === "sm" ? "6px 10px" : "9px 14px";
  const fontSize = size === "sm" ? 12 : 13;

  const triggerStyle: React.CSSProperties = pill
    ? {
        padding: "3px 10px",
        borderRadius: 999,
        background: selected?.bg ?? "#F4F4F7",
        color: selected?.color ?? colors.brand.trustWorth,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "capitalize",
        border: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        letterSpacing: "0.02em",
      }
    : {
        padding,
        borderRadius: 10,
        background: "#fff",
        color: colors.brand.trustWorth,
        fontSize,
        fontWeight: 600,
        border: "1px solid #ECECF1",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        width,
        minWidth: width ? undefined : 140,
      };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        key={springKey}
        className="tw-press tw-spring"
        onClick={() => setOpen((v) => !v)}
        style={triggerStyle}
        type="button"
      >
        <span style={{ flex: 1, textAlign: "left" }}>
          {selected?.label ?? <span style={{ opacity: 0.5 }}>{placeholder}</span>}
        </span>
        <span
          style={{
            display: "inline-block",
            transition: "transform 200ms cubic-bezier(.2,.7,.3,1)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            fontSize: 9,
            opacity: 0.6,
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          className="tw-popover"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 100,
            background: "#fff",
            border: "1px solid #ECECF1",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(2,1,31,0.14)",
            padding: 6,
            minWidth: pill ? 160 : Math.max(typeof width === "number" ? width : 160, 160),
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {options.map((o, i) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setSpringKey((k) => k + 1);
                  setOpen(false);
                }}
                className="tw-press"
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: active ? "rgba(43,15,248,0.08)" : "transparent",
                  color: active ? colors.brand.friendlyBlue : colors.brand.trustWorth,
                  fontWeight: active ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textTransform: "capitalize",
                  animation: `twFadeInUp 220ms cubic-bezier(.2,.7,.3,1) ${i * 30}ms both`,
                }}
              >
                {o.color || o.bg ? (
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: o.color ?? o.bg,
                      boxShadow: `0 0 0 3px ${(o.color ?? o.bg ?? "#000")}22`,
                    }}
                  />
                ) : null}
                <span style={{ flex: 1 }}>{o.label}</span>
                {active ? <span style={{ color: colors.brand.trendyPink, fontSize: 12 }}>✓</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
