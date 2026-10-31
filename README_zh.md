# @yangzhaoyunfei/pi-notify

[English](README.md) | [简体中文](README_zh.md)

> **专为 Pi Coding Agent 打造的跨平台焦点感知（Focus-Aware）桌面通知与音效扩展**  
> 融合 **DECSET 1004 终端焦点检测** 与 **100% 确定性系统原生 API 投递**（Windows Shell 托盘气泡 / Linux D-Bus `notify-send` / macOS `osascript`）。

---

## 🌟 核心特性与解决的痛点

1. **终端焦点感知（Focus-Aware 防打扰）**：
   - **前台敲代码时**：眼睛正看着终端编码或日常一问一答，**彻底静默，绝不弹出桌面弹窗扰民**！
   - **切出终端后**：切去查文档、浏览网页或处理其他事务时，**长任务完成、命令报错或等待交互决策时，立即弹出桌面系统通知**。
2. **100% 确定性系统级原生投递（彻底根除终端 OSC 控制符被吞问题）**：
   - **Windows 11**：通过 PowerShell 直接调用 Win32 宿主系统托盘 `System.Windows.Forms.NotifyIcon`（气泡通知）与 `[console]::beep`；绕过脆弱且兼容性参差不齐的终端转义控制符，在 **Windows Terminal**、**WezTerm** 下 100% 稳定弹窗！
   - **Linux（含主流发行版与 NixOS）**：直接调用 Freedesktop 标准规范的 `notify-send`（D-Bus）通知总线，并在音频层依次适配 PulseAudio (`paplay`)、PipeWire (`pw-play`) 与 ALSA (`aplay`)；
   - **macOS**：原生集成 `osascript` 系统通知中心与 `afplay` 原生音效；
   - **纯无桌面 / SSH 远程场景**：自动降级为 OSC 777 / OSC 99 与终端蜂鸣，无缝穿透 PTY。
3. **关键生命周期事件覆盖**：
   - **任务收敛完成（`agent_settled`）**：离开终端且长任务执行完毕时通知；
   - **执行报错（`tool_result` isError）**：工具或代码运行异常时强提醒；
   - **等待用户输入（`ui_prompt_start`）**：Agent 等待你做单选/确认/输入决策时通知，防止长时程挂死。

---

## 🐧 全平台与主流 Linux 兼容性矩阵 (Compatibility Matrix)

### 1. 操作系统与桌面环境兼容矩阵

| 操作系统 / 发行版 | 桌面环境 / 窗口管理器 | 前置依赖安装命令 | 通知守护进程 (Daemon) | 音频容灾链 (4级) | 交付效果 |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Windows 10 / 11** | Windows Shell | *无需安装 (内置 PowerShell)* | Win32 `NotifyIcon` 托盘气泡 | `[console]::beep` | ✅ 完美原生 |
| **Ubuntu / Debian / Mint** | GNOME / XFCE / MATE | `apt install -y libnotify-bin pulseaudio-utils` | GNOME Shell / `xfce4-notifyd` | `paplay` → `pw-play` → `aplay` → Bell | ✅ 完美原生 |
| **Fedora / RHEL / CentOS** | GNOME / KDE Plasma | `dnf install -y libnotify pulseaudio-utils` | GNOME Shell / `knotify` | `pw-play` → `paplay` → `aplay` → Bell | ✅ 完美原生 |
| **Arch / Manjaro** | KDE / Hyprland / Sway | `pacman -S libnotify libpulse` | `knotify` / `dunst` / `mako` | `pw-play` → `paplay` → `aplay` → Bell | ✅ 完美原生 |
| **openSUSE (Tumbleweed/Leap)**| KDE Plasma / GNOME | `zypper install -y libnotify-tools pulseaudio-utils` | Plasma / GNOME | `pw-play` → `paplay` → `aplay` → Bell | ✅ 完美原生 |
| **NixOS** | Niri / Noctalia / GNOME | `pkgs.libnotify`, `pkgs.pulseaudio` | Noctalia / GNOME / `mako` | PipeWire / `paplay` | ✅ 完美原生 |
| **Alpine Linux** | Sway / Minimal | `apk add libnotify pulseaudio-utils` | `mako` / `fnott` | ALSA / `paplay` | ✅ 完美原生 |
| **macOS** | Aqua Desktop | *无需安装 (系统内置)* | `osascript` 通知中心 | `afplay` 原生音效 | ✅ 完美原生 |
| **Headless / SSH 远程无桌面** | 纯 CLI 终端 | *无需安装* | 降级透传 OSC 777 / OSC 99 | Terminal Bell (`\x07`) | 🔄 本地响应 |

### 2. 终端工具与焦点感知 (DECSET 1004) 支持矩阵

| 终端工具 (Terminal) | DECSET 1004 焦点上报 | 远程穿透 (WSL2 / SSH) | 桌面通知投递方式 | 配置说明 / 容灾行为 |
| :--- | :---: | :---: | :--- | :--- |
| **WezTerm** | ✅ 完美支持 (`\x1b[I` / `\x1b[O`) | ✅ 完美穿透 | Win32 气泡 / `notify-send` / OSC 9 | 开箱即用，焦点感知灵敏 |
| **Windows Terminal** | ✅ 完美支持 (1.16+) | ✅ 完美穿透 | Win32 托盘气泡 | 开箱即用，WSL2 PTY 完美穿透 |
| **Kitty** | ✅ 完美支持 | ✅ 完美穿透 | Linux `notify-send` / OSC 99 | 开箱即用 |
| **Ghostty** | ✅ 完美支持 | ✅ 完美穿透 | OS 原生 / OSC 9 / OSC 777 | 开箱即用 |
| **Foot (Wayland)** | ✅ 完美支持 | ✅ 完美穿透 | Linux `notify-send` | 极速轻量，开箱即用 |
| **GNOME Terminal / Ptyxis / Tilix** | ✅ 完美支持 (VTE 0.40+) | ✅ 完美穿透 | Linux `notify-send` | 主流发行版默认开箱即用 |
| **Tmux (复用器)** | ⚡ 依赖配置开启 | ✅ 完美穿透 | 跟随当前活跃窗口判定 | `~/.tmux.conf` 需加 `set -g focus-events on` |
| **Alacritty** | ⚠️ 自动降级兜底 | ⚠️ 自动降级 | OS 原生系统通知 | 无焦点事件时自动走离开时长检测，安全静默不崩溃 |

> [!TIP]
> 1. **独立窗口管理器（i3 / Sway / Hyprland）**：请确保后台已启动任一通知服务（如 `dunst &`、`mako &` 或 `swaync &`）。
> 2. **Tmux 用户**：请务必在 `~/.tmux.conf` 中追加 `set -g focus-events on` 以便终端向内层透传焦点事件。

---

## ⚙️ 安装与配置说明

### 1. 一键安装命令

在任何操作系统（Windows / Linux / macOS）的终端中运行：

```bash
pi install https://github.com/ethantang1024/pi-notify.git
```

### 2. 配置选项 (`settings.json`)

在全局配置文件 `~/.pi/agent/settings.json`（或项目级 `.pi/settings.json`）中按需调整 `"notify"` 字段：

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

### 3. 配置参数详解

| 配置键名 | 类型 | 默认值 | 作用与说明 |
| :--- | :---: | :---: | :--- |
| **`focusAware`** | `boolean` | `true` | **是否开启终端焦点感知**。开启后在前台操作终端时静默，仅在失焦离开终端后通知。 |
| **`onComplete`** | `boolean` | `true` | 任务收敛完成时是否通知（开启 `focusAware` 时仅失焦通知）。 |
| **`onError`** | `boolean` | `true` | 任务或工具执行出错时是否通知。 |
| **`onQuestion`** | `boolean` | `true` | 等待用户交互提问决策时是否通知（开启 `focusAware` 时仅失焦通知）。 |
| **`sound`** | `boolean` | `false` | 是否播放提示音（Windows 为蜂鸣音，Linux 为 PulseAudio/PipeWire 音效）。 |
| **`volume`** | `number` | `0.4` | 音量大小（`0.0 ~ 1.0`，仅在 Linux 环境生效）。 |
| **`minWorkMs`** | `number` | `2000` | 任务最少耗时毫秒数。低于此时间的极速响应视为常规单轮问答，不弹通知。 |
| **`minAwayMs`** | `number` | `1000` | 切离终端的最少等待毫秒数。防止误触切屏抖动导致误触发。 |
| **`alwaysNotifyOnError`**| `boolean` | `true` | 报错时即使用户正看着当前终端也强制弹窗（避免遗漏关键故障）。 |

---

## 🛠️ 交互调试与验证命令

扩展内置了 `/notify` 诊断命令：

- **`/notify`** 或 **`/notify check`**：
  在 Pi 交互界面底部实时回显当前焦点状态与判定指标：
  ```text
  Backend: linux | Focus: FOCUSED (quiet mode) (away: n/a) | focusAware: true | sound: false
  ```
- **`/notify test`**：
  立即向操作系统派发一条测试通知并触发提示音，用于快速校验当前系统的通知投递链路是否通畅。

---

## 📄 开源许可

本项目基于 [MIT License](LICENSE) 开源。
