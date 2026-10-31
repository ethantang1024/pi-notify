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

## 🐧 Standard Linux Compatibility & Environment Analysis

On Linux, desktop notifications adhere to the **Freedesktop Desktop Notifications Specification** over D-Bus. This extension is engineered for seamless cross-distro compatibility:

### 1. Prerequisites by Distribution

To enable native desktop popups and audio alerts on your distribution:

| Distribution Family | Installation Command | Packages Included |
| :--- | :--- | :--- |
| **Ubuntu / Debian / Mint / Pop!_OS** | `sudo apt update && sudo apt install -y libnotify-bin pulseaudio-utils` | `notify-send`, `paplay` |
| **Fedora / RHEL / CentOS Stream / Rocky** | `sudo dnf install -y libnotify pulseaudio-utils` | `notify-send`, `paplay` |
| **Arch Linux / Manjaro / EndeavourOS** | `sudo pacman -S --needed libnotify libpulse` | `notify-send`, `paplay` |
| **openSUSE (Tumbleweed / Leap)** | `sudo zypper install -y libnotify-tools pulseaudio-utils` | `notify-send`, `paplay` |
| **Alpine Linux** | `sudo apk add libnotify pulseaudio-utils` | `notify-send`, `paplay` |
| **NixOS** | `environment.systemPackages = [ pkgs.libnotify pkgs.pulseaudio ];` | `notify-send`, `paplay` |

### 2. Desktop Environment & Notification Daemons

`notify-send` dispatches messages to the `org.freedesktop.Notifications` service on the user D-Bus session:

| Desktop Environment / Window Manager | Notification Daemon | Status | Experience |
| :--- | :--- | :---: | :--- |
| **GNOME 40+ (Ubuntu, Fedora, Debian)** | Built-in GNOME Shell Daemon | ✅ Full Support | Top-screen transient banner, logged into calendar center |
| **KDE Plasma 5 / 6 (Arch, Kubuntu, openSUSE)** | Plasma Workspace (`knotify`) | ✅ Full Support | Bottom-right curved card with hover actions |
| **XFCE4 / MATE / Cinnamon** | `xfce4-notifyd` / `mate-notification-daemon` | ✅ Full Support | Lightweight desktop notification card |
| **Hyprland (Wayland)** | `dunst` / `swaync` / `mako` | ✅ Full Support | Fully customizable CSS notification overlay |
| **Sway / River (Wayland)** | `mako` / `fnott` | ✅ Full Support | Native Wayland overlay |
| **Niri (Wayland Tiling)** | `noctalia` / `mako` / `dunst` | ✅ Full Support | Smooth transitions with Noctalia desktop shell |
| **i3 / bspwm / awesome (X11)** | `dunst` | ✅ Full Support | Minimalist floating notifications |

> [!NOTE]
> If using a standalone window manager (like i3, Sway, or Hyprland), ensure an active notification daemon (such as `dunst` or `mako`) is running in your session. Mainstream desktop environments (GNOME, KDE, XFCE) have this running out of the box.

### 3. Cascading Audio Drivers (PulseAudio / PipeWire / ALSA)

Linux audio setups vary widely. To prevent silent crashes, audio playback features a multi-tiered fallback:
1. **PulseAudio Preferred**: If `paplay` is detected, plays `/usr/share/sounds/freedesktop/stereo/complete.oga` with volume control;
2. **PipeWire Direct**: If running pure PipeWire without pulse wrappers, falls back to `pw-play --volume`;
3. **ALSA Core**: If only kernel ALSA is present, falls back to `aplay -q`;
4. **Terminal Bell**: If no sound backend binary is found, emits `\x07` (ASCII Bell).

### 4. Terminal Focus Tracking (DECSET 1004)

| Terminal Emulator | DECSET 1004 Support | Behavior |
| :--- | :---: | :--- |
| **WezTerm** | ✅ Full Support | Emits `\x1b[O` on defocus, `\x1b[I` on focus |
| **Kitty** | ✅ Full Support | Native DECSET 1004 + OSC 99 |
| **Ghostty** | ✅ Full Support | Native DECSET 1004 + OSC 9 / 777 |
| **Foot (Wayland)** | ✅ Full Support | Lightweight Wayland terminal, fully supported |
| **GNOME Terminal / Ptyxis / Tilix** | ✅ Full Support | VTE 0.40+ engine with focus reporting |
| **Windows Terminal (Win11 / WSL2)** | ✅ Full Support | 1.16+ native focus reporting through PTY |
| **Alacritty** | ⚠️ Graceful Fallback | Focus reporting may be unavailable; gracefully falls back to time heuristics without errors |

> [!TIP]
> **Using inside tmux**: Add the following line to `~/.tmux.conf` to forward focus events from the host terminal:
> ```tmux
> set -g focus-events on
> ```

### 5. Headless Servers & SSH Remote Sessions

- When connecting to a remote Linux server via SSH without an X11 or Wayland display:
  - The extension detects the lack of a display server;
  - It automatically routes notifications as OSC 777 or OSC 99 sequences through the PTY;
  - Your local client terminal (e.g., WezTerm, Kitty, or Windows Terminal) receives the escape sequence and renders the notification on your local machine!

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
