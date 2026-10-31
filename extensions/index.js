/**
 * @ethantang1024/pi-notify — Focus-aware desktop notifications and sounds for Pi.
 *
 * Combines 100% reliable native OS delivery with DECSET 1004 terminal focus tracking:
 *   - Windows: PowerShell WinForms NotifyIcon (Shell Tray BalloonTip) + console beep.
 *   - Linux:   notify-send (D-Bus / Noctalia) + paplay.
 *   - Focus:   DECSET 1004 focus reporting (ESC [ ? 1004 h / l) for WezTerm, Windows Terminal, Kitty.
 *              Never spams when focused; alerts reliably when unfocused.
 *
 * Config (settings.json under "notify"):
 *   {
 *     "focusAware": true,          // Enable terminal focus detection (default true)
 *     "onComplete": true,          // Notify on task complete (only when unfocused if focusAware)
 *     "onError": true,             // Notify on error
 *     "onQuestion": true,          // Notify on question / input prompt (only when unfocused if focusAware)
 *     "sound": false,              // Play sound (default false)
 *     "volume": 0.4,               // Sound volume (Linux paplay)
 *     "minWorkMs": 2000,           // Minimum work duration in ms before qualifying for completion notification
 *     "minAwayMs": 1000,           // Minimum unfocused time in ms before alerting (debounce switch)
 *     "alwaysNotifyOnError": true  // Always alert on errors even when focused
 *   }
 */

import { execFile } from "node:child_process";
import { accessSync, constants, readFileSync } from "node:fs";
import { delimiter, join, basename } from "node:path";
import os from "node:os";

const ESC = "\x1b";

const DEFAULTS = {
  focusAware: true,
  onComplete: true,
  onError: true,
  onQuestion: true,
  sound: false,
  volume: 0.4,
  minWorkMs: 2000,
  minAwayMs: 1000,
  alwaysNotifyOnError: true,
};

/**
 * Read the `notify` settings key from settings.json, searching <cwd>/.pi →
 * ~/.pi/agent → ~/.pi/agents.
 */
export function readSettingsKey(cwd, key, trusted = false) {
  const home = os.homedir();
  const dirs = [
    ...(trusted ? [join(cwd || process.cwd(), ".pi")] : []),
    process.env.PI_CODING_AGENT_DIR || join(home, ".pi", "agent"),
    join(home, ".pi", "agents"),
  ];
  for (const dir of dirs) {
    try {
      const parsed = JSON.parse(readFileSync(join(dir, "settings.json"), "utf8"));
      const v = parsed?.[key];
      if (v && typeof v === "object" && !Array.isArray(v)) return v;
      if (v !== undefined) {
        console.warn(
          `${key}: ${join(dir, "settings.json")} has a non-object "${key}" value — ignoring`,
        );
      }
    } catch {
      // missing or unreadable is fine, try next
    }
  }
  return undefined;
}

export function resolveConfig(user) {
  return { ...DEFAULTS, ...(user && typeof user === "object" ? user : {}) };
}

function hasBinary(name) {
  for (const dir of (process.env.PATH || "").split(delimiter)) {
    if (!dir) continue;
    try {
      accessSync(join(dir, name), constants.X_OK);
      return true;
    } catch {
      /* continue */
    }
  }
  return false;
}

let backendCache;

export function detectBackend() {
  if (backendCache) return backendCache;
  if (process.platform === "win32") {
    backendCache = hasBinary("powershell.exe") ? "windows" : "terminal";
  } else if (process.platform === "darwin") {
    backendCache = hasBinary("osascript") ? "darwin" : "terminal";
  } else if (process.platform === "linux") {
    backendCache = hasBinary("notify-send") ? "linux" : "terminal";
  } else {
    backendCache = "terminal";
  }
  return backendCache;
}

function run(cmd, args) {
  try {
    execFile(cmd, args, { timeout: 6000 }, () => {});
  } catch {
    /* best-effort */
  }
}

export function sanitizeOsc(str) {
  return String(str).replace(/[\x00-\x1f\x7f]/g, "").replace(/;/g, ",");
}

export function appleScriptEscape(str) {
  return String(str).replace(/["\\]/g, "\\$&");
}

export function toastScript(title, body) {
  const t = String(title).replace(/'/g, "''");
  const b = String(body).replace(/'/g, "''");
  return `[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') > $null; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; $n.ShowBalloonTip(5000, '${t}', '${b}', 'Info'); Start-Sleep -Seconds 6; $n.Dispose()`;
}

function notifyOSC777(title, body) {
  if (!process.stdout || !process.stdout.isTTY) return;
  try {
    process.stdout.write(`\x1b]777;notify;${sanitizeOsc(title)};${sanitizeOsc(body)}\x07`);
  } catch {
    /* best-effort */
  }
}

function notifyOSC99(title, body) {
  if (!process.stdout || !process.stdout.isTTY) return;
  try {
    process.stdout.write(`\x1b]99;i=1:d=0;${sanitizeOsc(title)}\x1b\\`);
    process.stdout.write(`\x1b]99;i=1:p=body;${sanitizeOsc(body)}\x1b\\`);
  } catch {
    /* best-effort */
  }
}

export function notify(title, body, backend = detectBackend()) {
  switch (backend) {
    case "windows":
      run("powershell.exe", ["-NoProfile", "-Command", toastScript(title, body)]);
      return;
    case "linux":
      run("notify-send", ["-a", "Pi", "--", String(title), String(body)]);
      return;
    case "darwin":
      run("osascript", ["-e", `display notification "${appleScriptEscape(body)}" with title "${appleScriptEscape(title)}"`]);
      return;
    case "terminal":
    default:
      if (process.env.KITTY_WINDOW_ID) notifyOSC99(title, body);
      else notifyOSC777(title, body);
  }
}

export function playSound(volume, backend = detectBackend()) {
  const v = Math.min(1, Math.max(0, Number(volume) || 0));
  switch (backend) {
    case "windows":
      run("powershell.exe", ["-NoProfile", "-Command", "[console]::beep(800, 300)"]);
      return;
    case "linux": {
      const soundFile = "/usr/share/sounds/freedesktop/stereo/complete.oga";
      if (hasBinary("paplay")) {
        run("paplay", ["--volume=" + Math.round(v * 65536), soundFile]);
      } else if (hasBinary("pw-play")) {
        run("pw-play", ["--volume=" + v, soundFile]);
      } else if (hasBinary("aplay")) {
        run("aplay", ["-q", "/usr/share/sounds/alsa/Front_Center.wav"]);
      } else {
        try {
          if (process.stdout && process.stdout.isTTY) process.stdout.write("\x07");
        } catch {
          /* best-effort */
        }
      }
      return;
    }
    case "darwin":
      run("afplay", ["/System/Library/Sounds/Glass.aiff"]);
      return;
    case "terminal":
    default:
      try {
        if (process.stdout && process.stdout.isTTY) process.stdout.write("\x07");
      } catch {
        /* best-effort */
      }
  }
}

function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

// ── Focus Tracking ──────────────────────────────────────────────────────────

export function initialFocusState() {
  return { focused: true, gotFocusEvent: false, unfocusedAt: undefined };
}

/**
 * Strip FocusIn (\x1b[I) and FocusOut (\x1b[O) escape sequences from input data.
 * Updates state accordingly.
 */
export function scanFocusInput(data, state, now = Date.now()) {
  if (typeof data !== "string" || data.startsWith(`${ESC}[200~`)) return undefined;
  let out = "";
  let last = 0;
  let found = false;
  for (let i = 0; i < data.length; i++) {
    if (data.startsWith(`${ESC}[I`, i)) {
      state.focused = true;
      state.gotFocusEvent = true;
      state.unfocusedAt = undefined;
      out += data.slice(last, i);
      last = i + 3;
      i += 2;
      found = true;
    } else if (data.startsWith(`${ESC}[O`, i)) {
      if (state.focused || state.unfocusedAt === undefined) {
        state.unfocusedAt = now;
      }
      state.focused = false;
      state.gotFocusEvent = true;
      out += data.slice(last, i);
      last = i + 3;
      i += 2;
      found = true;
    }
  }
  if (!found) return undefined;
  out += data.slice(last);
  return out.length === 0 ? null : out;
}

function tmuxFocused() {
  return new Promise((resolve) => {
    if (!process.env.TMUX) return resolve(null);
    const target = process.env.TMUX_PANE ? ["-t", process.env.TMUX_PANE] : [];
    execFile("tmux", ["display-message", "-p", ...target, "#{window_active_clients}"], { timeout: 1000 }, (err, out) => {
      resolve(!err && out.trim() === "0" ? false : null);
    });
  });
}

function writeTty(data) {
  try {
    if (process.stdout && process.stdout.isTTY) {
      process.stdout.write(data);
    }
  } catch {
    /* best-effort */
  }
}

// ── Extension Factory ───────────────────────────────────────────────────────

export default function notifyExtension(pi, opts = {}) {
  const doNotify = opts.notify || notify;
  const doSound = opts.playSound || playSound;

  pi.registerFlag("no-notify", {
    description: "Disable pi-notify desktop notifications and sounds",
    type: "boolean",
  });

  let noNotify = false;
  try {
    noNotify = Boolean(pi.getFlag("no-notify"));
  } catch {
    noNotify = false;
  }

  let cfg = resolveConfig(undefined);
  const refreshConfig = (cwd, trusted) => {
    try {
      cfg = resolveConfig(readSettingsKey(cwd, "notify", trusted));
    } catch {
      cfg = resolveConfig(undefined);
    }
  };

  const focus = initialFocusState();
  let focusEnabled = false;
  let hasTypedInput = false;
  let unsubscribeInput;
  let startMs = 0;
  let toolCalls = 0;
  let errors = 0;
  let erroredThisTurn = false;

  const getTerminalFocus = async () => {
    if (focus.gotFocusEvent || hasTypedInput) return focus.focused;
    if (process.env.TMUX) {
      const tmux = await tmuxFocused();
      if (tmux !== null) return tmux;
    }
    return null; // Unknown focus (e.g. unsupported terminal)
  };

  const fire = (title, body, eventKind) => {
    try {
      if (noNotify) return;
      if (eventKind === "complete" && !cfg.onComplete) return;
      if (eventKind === "error" && !cfg.onError) return;
      if (eventKind === "question" && !cfg.onQuestion) return;

      try {
        doNotify(title, body);
      } catch {
        /* best-effort */
      }
      if (cfg.sound) {
        try {
          doSound(cfg.volume);
        } catch {
          /* best-effort */
        }
      }
    } catch {
      /* best-effort */
    }
  };

  const enableFocusReporting = (ctx) => {
    if (ctx.mode !== "tui" || focusEnabled) return;
    writeTty(`${ESC}[?1004h`);
    focusEnabled = true;

    unsubscribeInput?.();
    if (typeof ctx.ui?.onTerminalInput === "function") {
      unsubscribeInput = ctx.ui.onTerminalInput((data) => {
        const stripped = scanFocusInput(data, focus);
        if (stripped === null) {
          return { consume: true };
        }
        if (stripped !== undefined) {
          return { data: stripped };
        }
        // User is typing -> definitely focused
        hasTypedInput = true;
        focus.focused = true;
        focus.unfocusedAt = undefined;
        return undefined;
      });
    }
  };

  const disableFocusReporting = () => {
    if (!focusEnabled) return;
    writeTty(`${ESC}[?1004l`);
    focusEnabled = false;
    unsubscribeInput?.();
    unsubscribeInput = undefined;
    Object.assign(focus, initialFocusState());
    hasTypedInput = false;
  };

  process.on("exit", disableFocusReporting);

  // ── Lifecycle Hooks ────────────────────────────────────────────────────────

  pi.on("session_start", (_event, ctx) => {
    erroredThisTurn = false;
    startMs = 0;
    toolCalls = 0;
    errors = 0;
    refreshConfig(ctx?.cwd || process.cwd(), ctx?.isProjectTrusted?.() === true);
    if (cfg.focusAware) {
      enableFocusReporting(ctx);
    }
  });

  pi.on("session_shutdown", () => {
    disableFocusReporting();
  });

  pi.on("turn_start", () => {
    erroredThisTurn = false;
    startMs = Date.now();
    toolCalls = 0;
    errors = 0;
  });

  pi.on("tool_result", (event) => {
    toolCalls++;
    if (event?.isError) {
      errors++;
      if (erroredThisTurn) return;
      if (!noNotify && cfg.onError !== false) {
        erroredThisTurn = true;
      }

      // Check focus awareness for errors
      if (cfg.focusAware && !cfg.alwaysNotifyOnError && focus.gotFocusEvent && focus.focused) {
        // Suppressed because user is focused and alwaysNotifyOnError is false
        return;
      }

      fire("Pi", "An error occurred", "error");
    }
  });

  pi.on("ui_prompt_start", async (event) => {
    if (!cfg.onQuestion) return;

    // In focusAware mode, only notify if user is NOT focused on terminal
    if (cfg.focusAware) {
      const isFocused = await getTerminalFocus();
      if (isFocused === true) {
        // User is already looking at the terminal prompt, do not alert
        return;
      }
    }

    const title = typeof event?.title === "string" && event.title ? event.title : "waiting for your input";
    fire("Pi", `Question: ${title}`, "question");
  });

  pi.on("agent_settled", async (_event, ctx) => {
    if (erroredThisTurn) return;
    if (!cfg.onComplete) return;

    const dur = startMs ? Date.now() - startMs : 0;
    if (dur < cfg.minWorkMs && toolCalls === 0) {
      // Too fast and no tool work, skip notification
      return;
    }

    if (cfg.focusAware) {
      const isFocused = await getTerminalFocus();
      if (isFocused === true) {
        // User is looking right at the terminal, keep quiet!
        return;
      }

      // If user just switched away, ensure minAwayMs
      if (focus.gotFocusEvent && focus.unfocusedAt !== undefined) {
        const awayMs = Date.now() - focus.unfocusedAt;
        if (awayMs < cfg.minAwayMs) {
          // Debounce: wait the remaining away time
          setTimeout(async () => {
            const currentFocus = await getTerminalFocus();
            if (currentFocus === false) {
              const baseDir = ctx?.cwd ? basename(ctx.cwd) : "";
              const title = baseDir ? `Pi (${baseDir})` : "Pi";
              fire(title, `Task complete (${formatDuration(dur)})`, "complete");
            }
          }, cfg.minAwayMs - awayMs).unref?.();
          return;
        }
      }
    }

    const baseDir = ctx?.cwd ? basename(ctx.cwd) : "";
    const title = baseDir ? `Pi (${baseDir})` : "Pi";
    fire(title, `Task complete (${formatDuration(dur)})`, "complete");
  });

  // ── Slash Command ─────────────────────────────────────────────────────────

  pi.registerCommand("notify", {
    description: "Check focus state or trigger a test notification: /notify [check|test]",
    getArgumentCompletions: (prefix) => {
      const items = [
        { value: "check", label: "check", description: "Show current focus and configuration status" },
        { value: "test", label: "test", description: "Send an immediate test desktop notification" },
      ].filter((i) => i.value.startsWith(prefix));
      return items.length > 0 ? items : null;
    },
    handler: async (args, ctx) => {
      const action = (args || "").trim() || "check";
      if (action === "test") {
        const backend = detectBackend();
        fire("Pi Test", "Desktop notification and sound verified successfully!", "complete");
        ctx.ui?.notify?.(`Test notification dispatched via [${backend}] backend.`, "info");
        return;
      }
      if (action !== "check") {
        ctx.ui?.notify?.("Usage: /notify [check|test]", "warning");
        return;
      }

      const f = await getTerminalFocus();
      const focusText = f === true ? "FOCUSED (quiet mode)" : f === false ? "UNFOCUSED (alert active)" : "UNKNOWN (fallback)";
      const awayText = focus.unfocusedAt ? `${Math.round((Date.now() - focus.unfocusedAt) / 1000)}s ago` : "n/a";
      const backend = detectBackend();
      const statusMsg = `Backend: ${backend} | Focus: ${focusText} (away: ${awayText}) | focusAware: ${cfg.focusAware} | sound: ${cfg.sound}`;
      ctx.ui?.notify?.(statusMsg, "info");
    },
  });
}
