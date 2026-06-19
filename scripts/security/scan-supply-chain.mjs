#!/usr/bin/env node
/**
 * Supply-chain & agent-harness IOC scanner — read-only, zero dependencies.
 *
 * Why this exists: this box runs the live API + DB and also hosts third-party
 * agent skills/plugins. The highest-likelihood compromise vector is a poisoned
 * npm package or a malicious agent-config payload, not our own code. This scans
 * for those before a deploy.
 *
 * What it does (reads files only — never executes, fetches, or writes):
 *   1. Dependency manifests/lockfiles → known-compromised package@version.
 *   2. Agent-config persistence paths (~/.claude hooks, VS Code tasks,
 *      LaunchAgents, systemd user units, ~/.local/bin, /tmp) → known payload/
 *      persistence filenames + dead-man-switch token stores.
 *   3. Inspected files → known malicious domains / IPs / worm markers.
 *   4. Installed skills tree → embedded executables and high-signal danger
 *      patterns (pipe-to-shell, base64 decode-run, credential access).
 *
 * Threat intel is public advisory data (extend from https://osv.dev):
 *   - "Shai-Hulud" self-replicating npm worm (Sep 2025; "Second Coming" Nov 2025)
 *   - node-ipc protestware (CVE-2022-23812)
 *
 * Usage:
 *   node scripts/security/scan-supply-chain.mjs            # repo + home + skills
 *   node scripts/security/scan-supply-chain.mjs --json
 *   node scripts/security/scan-supply-chain.mjs --repo . --no-home --no-skills
 * Exit code 0 = clean, 1 = findings, 2 = error.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ── threat intel (seed; keep dated, extend from OSV/GitHub Advisory) ──────────
// Known-compromised package -> versions. Representative recent campaigns.
const COMPROMISED_PACKAGES = {
  "node-ipc": ["9.1.6", "9.2.3", "10.1.1", "10.1.2", "11.0.0", "11.1.0", "12.0.1"],
  "@ctrl/tinycolor": ["4.1.1", "4.1.2"],
  "@mistralai/mistralai": ["2.2.2", "2.2.3", "2.2.4"],
  "@tanstack/react-router": ["1.169.5", "1.169.8"],
  rand_user_agent: ["2.0.83", "1.0.110"],
  ngx_bootstrap: [],
};

// Worm / payload markers + known C2 domains and IPs (public IOCs).
const IOC_STRINGS = [
  "shai-hulud", "shai-hulud-workflow.yml", "gh-token-monitor",
  "IfYouRevokeThisTokenItWillWipeTheComputerOfTheOwner",
  "litter.catbox.moe", "filev2.getsession.org", "seed1.getsession.org",
  "git-tanstack.com", "api.masscan.cloud", "169.254.169.254", "127.0.0.1:8200",
  "transformers.pyz", "pgmonitor.py", "tanstack_runner.js", "router_runtime.js",
  "webhook.site", "oast.fun", "interactsh",
];

// Persistence/payload filenames that should never appear in agent-config paths.
const PERSISTENCE_FILES = [
  "router_runtime.js", "setup.mjs", "router_init.js", "tanstack_runner.js",
  "gh-token-monitor.sh", "pgmonitor.py", "gh-token-monitor.service",
  "pgsql-monitor.service", "com.user.gh-token-monitor.plist",
  "shai-hulud-workflow.yml", "codeql_analysis.yml",
];

// Specific home-relative targets to existence-check (agent harness + IDE).
const HOME_TARGETS = [
  ".claude/setup.mjs", ".claude/router_runtime.js", ".claude/hooks/hooks.json",
  ".config/gh-token-monitor/token", ".local/bin/gh-token-monitor.sh",
  ".local/bin/pgmonitor.py", ".config/systemd/user/gh-token-monitor.service",
  ".config/systemd/user/pgsql-monitor.service",
  "Library/LaunchAgents/com.user.gh-token-monitor.plist",
  ".vscode/tasks.json", ".config/Code/User/tasks.json",
];
const TMP_TARGETS = [
  "/tmp/transformers.pyz", "/tmp/pgmonitor.py",
  "/tmp/node-ipc-9.1.6.tgz", "/tmp/node-ipc-12.0.1.tar.gz",
];

const DEP_FILES = new Set([
  "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  "bun.lock", "requirements.txt", "pyproject.toml", "poetry.lock",
]);
const SKILL_EXEC_EXT = new Set([".sh", ".js", ".mjs", ".cjs", ".py", ".rb", ".ps1", ".bat", ".pl"]);
const SKILL_DANGER = [
  /\|\s*(ba)?sh\b/, /curl\s+[^\n|]*\|\s*(ba)?sh/, /base64\s+-d/,
  /id_rsa|BEGIN [A-Z ]*PRIVATE KEY/, /AWS_SECRET|AWS_ACCESS_KEY/,
  /\beval\(/, /child_process|os\.system|subprocess\.(Popen|call|run)/,
];
const IGNORE_DIRS = new Set([".git", "dist", "build", ".next", "coverage", "__pycache__"]);

const findings = [];
const add = (severity, file, indicator, message, line = 0) =>
  findings.push({ severity, file, line, indicator, message });

const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };
const lineOf = (text, idx) => text.slice(0, idx).split(/\r?\n/).length;

function* walk(dir, { intoNodeModules = false } = {}) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      if (e.name === "node_modules" && !intoNodeModules) continue;
      yield* walk(full, { intoNodeModules });
    } else if (e.isFile()) {
      yield full;
    }
  }
}

// ── 1+3. dependency manifests + IOC text ──────────────────────────────────────
function scanDepFile(file) {
  const text = read(file);
  const lower = text.toLowerCase();
  for (const [pkg, versions] of Object.entries(COMPROMISED_PACKAGES)) {
    for (const v of versions) {
      const re = new RegExp(`${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w./-])[^\\n]{0,80}${v.replace(/\./g, "\\.")}(?![\\d.])`, "i");
      const m = re.exec(text);
      if (m) add("critical", file, `${pkg}@${v}`, "Lockfile/manifest references a known-compromised package version", lineOf(text, m.index));
    }
  }
  for (const ioc of IOC_STRINGS) {
    const i = lower.indexOf(ioc.toLowerCase());
    if (i !== -1) add("critical", file, ioc, "Known supply-chain IOC string present", lineOf(text, i));
  }
}

// ── 2. persistence / payload files ────────────────────────────────────────────
function scanPersistence(home) {
  for (const rel of HOME_TARGETS) {
    const f = path.join(home, rel);
    if (fs.existsSync(f)) {
      const isPayload = PERSISTENCE_FILES.includes(path.basename(f));
      add(isPayload ? "critical" : "warn", f, path.basename(f),
        isPayload ? "Known agent-harness persistence/payload file present" : "Agent/IDE config present — confirm you authored it");
    }
  }
  for (const f of TMP_TARGETS) if (fs.existsSync(f)) add("critical", f, path.basename(f), "Known worm payload artifact present in /tmp");
}

// ── 4. installed skills hygiene ───────────────────────────────────────────────
function scanSkills(skillsDir) {
  if (!fs.existsSync(skillsDir)) return;
  for (const f of walk(skillsDir)) {
    const ext = path.extname(f).toLowerCase();
    if (SKILL_EXEC_EXT.has(ext)) add("warn", f, ext, "Executable inside a skill — review before trusting");
    if (/\.(md|txt|json|sh|js|mjs|py|yaml|yml)$/i.test(f)) {
      const text = read(f);
      for (const re of SKILL_DANGER) {
        const m = re.exec(text);
        if (m) add("high", f, m[0].slice(0, 40), "High-signal danger pattern in a skill file", lineOf(text, m.index));
      }
    }
  }
}

// ── run ───────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, def) => argv.includes(`--no-${name}`) ? false : (argv.includes(`--${name}`) ? true : def);
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); return i !== -1 && argv[i + 1] ? argv[i + 1] : def; };
const json = argv.includes("--json");
const repo = path.resolve(opt("repo", "."));
const home = os.homedir();
const skillsDir = opt("skills", path.join(home, ".claude", "skills"));

let scanned = 0;
if (flag("repo", true)) for (const f of walk(repo, { intoNodeModules: true })) {
  if (DEP_FILES.has(path.basename(f))) { scanDepFile(f); scanned++; }
}
if (flag("home", true)) scanPersistence(home);
if (flag("skills", true)) scanSkills(skillsDir);

const order = { critical: 0, high: 1, warn: 2 };
findings.sort((a, b) => (order[a.severity] - order[b.severity]) || a.file.localeCompare(b.file));

if (json) {
  console.log(JSON.stringify({ scannedDepFiles: scanned, findings }, null, 2));
} else if (findings.length === 0) {
  console.log(`✅ supply-chain scan clean (${scanned} dependency files inspected, home + skills checked)`);
} else {
  for (const f of findings) {
    const where = f.line ? `${f.file}:${f.line}` : f.file;
    console.error(`${f.severity.toUpperCase()}: ${where}  [${f.indicator}]\n  ${f.message}`);
  }
  console.error(`\n${findings.length} finding(s).`);
}
const blocking = findings.filter((f) => f.severity === "critical" || f.severity === "high");
process.exit(blocking.length > 0 ? 1 : 0);
