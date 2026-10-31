# @yangzhaoyunfei/pi-notify

[English](README.md) | [简体中文](README_zh.md)

> **Focus-Aware Desktop Notifications and Sounds for the Pi Coding Agent.**  
> Seamlessly blends **DECSET 1004 terminal focus tracking** with **100% reliable native OS delivery** (Windows Shell Tray BalloonTip, Linux D-Bus `notify-send`, and macOS `osascript`).

---

## 🌟 Key Features & Problem Solved

1. **Focus-Aware Quiet Mode**:
   - **While actively working in terminal**: When your eyes are on the screen coding or asking single-turn questions, **it stays 100% silent—zero annoying toasts or sounds**!
   - **When switching away**: Once you switch to a browser, editor, or documentation window, **it immediately alerts you when long runs complete, errors occur, or when input is required**.
2. **100% Deterministic Native OS Delivery (No Swallowed OSC Sequences)**:
   - **Windows 11**: Directly invokes Win32 Shell `System.Windows.Forms.NotifyIcon` (balloon tip) and `[console]::beep` via PowerShell, completely bypassing fragile terminal escape sequences. Works 100% in **Windows Terminal** and **WezTerm**!
   - **Linux (Standard Distributions & NixOS)**: Communicates via the Freedesktop `notify-send` D-Bus notification protocol, backed by multi-tiered audio drivers (PulseAudio `paplay`, PipeWire `pw-play`, and ALSA `aplay`);
   - **macOS**: Built-in support for `osascript` notification center and `afplay`;
   - **Headless / SSH Remote Sessions**: Automatically degrades to OSC 777 / OSC 99 terminal escape sequences and ASCII bell `\x07`.
3. **Comprehensive Lifecycle Tracking**:
   - **Task Completion (`agent_settled`)**: Notifies on run finish when away;
   - **Errors (`tool_result` isError)**: High-priority alerts on unexpected exceptions;
   - **User Input Needed (`ui_prompt_start`)**: Alerts when Pi blocks on a question or confirmation prompt, preventing idle lockups.

---

## 🐧 Cross-Platform & Linux Compatibility Matrix

### 1. Operating System & Desktop Environment Matrix

| OS / Distribution | Desktop / Window Manager | Prerequisite Install Command | Notification Daemon / API | Audio Cascade (4 Tiers) | Delivery Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Windows 10 / 11** | Windows Shell | *None (built-in PowerShell)* | Win32 `NotifyIcon` BalloonTip | `[console]::beep` | ✅ 100% Native |
| **Ubuntu / Debian / Mint** | GNOME / XFCE / MATE | `apt install -y libnotify-bin pulseaudio-utils` | GNOME Shell / `xfce4-notifyd` | `paplay` → `pw-play` → `aplay` → Bell | ✅ 100% Native |
| **Fedora / RHEL / CentOS** | GNOME / KDE Plasma | `dnf install -y libnotify pulseaudio-utils` | GNOME Shell / `knotify` | `pw-play` → `paplay` → `aplay` → Bell | ✅ 100% Native |
| **Arch / Manjaro** | KDE / Hyprland / Sway | `pacman -S libnotify libpulse` | `knotify` / `dunst` / `mako` | `pw-play` → `paplay` → `aplay` → Bell | ✅ 100% Native |
| **openSUSE (Tumbleweed/Leap)**| KDE Plasma / GNOME | `zypper install -y libnotify-tools pulseaudio-utils` | Plasma / GNOME | `pw-play` → `paplay` → `aplay` → Bell | ✅ 100% Native |
| **NixOS** | Niri / Noctalia / GNOME | `pkgs.libnotify`, `pkgs.pulseaudio` | Noctalia / GNOME / `mako` | PipeWire / `paplay` | ✅ 100% Native |
| **Alpine Linux** | Sway / Minimal | `apk add libnotify pulseaudio-utils` | `mako` / `fnott` | ALSA / `paplay` | ✅ 100% Native |
| **macOS** | Aqua Desktop | *None (built-in)* | `osascript` Notification Center | `afplay` native audio | ✅ 100% Native |
| **Headless / SSH Remote** | Pure CLI Terminal | *None required* | Degrades to OSC 777 / OSC 99 | Terminal Bell (`\x07`) | 🔄 Remote Pass-through |

### 2. Terminal Emulators & Focus Sensing (DECSET 1004) Matrix

| Terminal Emulator | DECSET 1004 Focus Tracking | Remote Pass-through (WSL2 / SSH) | Notification Protocol | Configuration Notes & Fallback |
| :--- | :---: | :---: | :--- | :--- |
| **WezTerm** | ✅ Full Support (`\x1b[I` / `\x1b[O`) | ✅ Full Pass-through | Win32 Toast / `notify-send` / OSC 9 | Works out-of-the-box, sensitive focus tracking |
| **Windows Terminal** | ✅ Full Support (1.16+) | ✅ Full Pass-through | Win32 Shell Tray BalloonTip | Works out-of-the-box, passes through WSL2 PTY |
| **Kitty** | ✅ Full Support | ✅ Full Pass-through | Linux `notify-send` / OSC 99 | Works out-of-the-box |
| **Ghostty** | ✅ Full Support | ✅ Full Pass-through | OS Native / OSC 9 / OSC 777 | Works out-of-the-box |
| **Foot (Wayland)** | ✅ Full Support | ✅ Full Pass-through | Linux `notify-send` | Ultra-fast Wayland terminal, out-of-the-box |
| **GNOME Terminal / Ptyxis / Tilix** | ✅ Full Support (VTE 0.40+) | ✅ Full Pass-through | Linux `notify-send` | Default terminal across major distributions |
| **Tmux (Multiplexer)** | ⚡ Config Required | ✅ Full Pass-through | Inherits active client focus | Requires `set -g focus-events on` in `~/.tmux.conf` |
| **Alacritty** | ⚠️ Graceful Fallback | ⚠️ Graceful Fallback | OS Native Notification | Falls back to away duration heuristics safely |

> [!TIP]
> 1. **Standalone Window Managers (i3 / Sway / Hyprland)**: Ensure a notification daemon (e.g. `dunst &`, `mako &`, or `swaync &`) is running in your session.
> 2. **Tmux Users**: Append `set -g focus-events on` to `~/.tmux.conf` so terminal focus events pass through cleanly.

---

## ⚙️ Installation & Configuration

### 1. Installation

Run the following command in any terminal:

```bash
pi install https://github.com/ethantang1024/pi-notify.git
```

### 2. Configuration (`settings.json`)

Configure `"notify"` in your `~/.pi/agent/settings.json` (or `.pi/settings.json` for project scope):

```json
{
  "packages": [
    "npm:gentle-engram@0.5.1",
    "https://github.com/ethantang1024/pi-notify.git"
  ],
  "notify": {
    "focusAware": true,
    "onComplete": true,
    "onError": true,
    "onQuestion": true,
    "sound": false,
    "volume": 0.4,
    "minWorkMs": 2000,
    "minAwayMs": 1000,
    "alwaysNotifyOnError": true
  }
}
```

### 3. Configuration Reference

| Option | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| **`focusAware`** | `boolean` | `true` | **Enables terminal focus awareness**. When active, keeps notifications quiet while you are focused on the terminal. |
| **`onComplete`** | `boolean` | `true` | Notify on task completion (only triggers when unfocused if `focusAware` is enabled). |
| **`onError`** | `boolean` | `true` | Notify on command or tool errors. |
| **`onQuestion`** | `boolean` | `true` | Notify when agent pauses waiting for user input (triggers only when unfocused). |
| **`sound`** | `boolean` | `false` | Whether to play sound alerts. |
| **`volume`** | `number` | `0.4` | Volume level between `0.0` and `1.0` (Linux sound drivers). |
| **`minWorkMs`** | `number` | `2000` | Minimum task duration in ms before qualifying for completion notifications (ignores instant turns). |
| **`minAwayMs`** | `number` | `1000` | Minimum unfocused duration in ms before firing (prevents accidental switch triggers). |
| **`alwaysNotifyOnError`**| `boolean` | `true` | Always trigger notification on error, even if focused. |

---

## 🛠️ Diagnostics & Commands

- **`/notify`** or **`/notify check`**:
  Prints current focus state, detected backend, and active settings in Pi's status bar:
  ```text
  Backend: linux | Focus: FOCUSED (quiet mode) (away: n/a) | focusAware: true | sound: false
  ```
- **`/notify test`**:
  Instantly dispatches a test notification and plays an alert sound to verify end-to-end functionality.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
