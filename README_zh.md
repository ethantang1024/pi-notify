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

## 🐧 普通 Linux（主流发行版）深度兼容性与环境适配分析

在主流 Linux 操作系统与桌面环境下，系统通知体系高度依赖 **Freedesktop Desktop Notifications Specification**（D-Bus 规范）。本扩展对此提供了全面、严谨的兼容与降级支持：

### 1. 各主流发行版前置依赖安装

在各 Linux 发行版中，通知投递依赖 `notify-send`（由 `libnotify` 提供），音效依赖系统音频播放器：

| 发行版系列 | 安装命令 | 包含的底层工具 |
| :--- | :--- | :--- |
| **Ubuntu / Debian / Mint / Pop!_OS** | `sudo apt update && sudo apt install -y libnotify-bin pulseaudio-utils` | `notify-send`、`paplay` |
| **Fedora / RHEL / CentOS Stream / Rocky** | `sudo dnf install -y libnotify pulseaudio-utils` | `notify-send`、`paplay` |
| **Arch Linux / Manjaro / EndeavourOS** | `sudo pacman -S --needed libnotify libpulse` | `notify-send`、`paplay` |
| **openSUSE (Tumbleweed / Leap)** | `sudo zypper install -y libnotify-tools pulseaudio-utils` | `notify-send`、`paplay` |
| **Alpine Linux** | `sudo apk add libnotify pulseaudio-utils` | `notify-send`、`paplay` |
| **NixOS** | `environment.systemPackages = [ pkgs.libnotify pkgs.pulseaudio ];` | `notify-send`、`paplay` |

### 2. 桌面环境与通知守护进程 (Notification Daemons) 兼容矩阵

`notify-send` 通过 D-Bus 总线向 `org.freedesktop.Notifications` 目标服务发送通知请求：

| 桌面环境 / 窗口管理器 | 通知接收端服务 (Daemon) | 兼容状态 | 表现形式 |
| :--- | :--- | :---: | :--- |
| **GNOME 40+ (Ubuntu / Fedora / Debian)** | GNOME Shell 内置通知总线 | ✅ 完美兼容 | 屏幕顶部悬浮弹窗，自动收纳至日历通知中心 |
| **KDE Plasma 5 / 6 (Arch / openSUSE / Kubuntu)** | Plasma Workspace (`knotify`) | ✅ 完美兼容 | 右下角原生弧角卡片，支持悬停与历史记录 |
| **XFCE4 / MATE / Cinnamon** | `xfce4-notifyd` / `mate-notification-daemon` | ✅ 完美兼容 | 桌面右上角经典卡片通知 |
| **Hyprland (Wayland)** | `dunst` / `swaync` / `mako` | ✅ 完美兼容 | 平铺桌面美化弹窗，支持 CSS 自定义样式与快捷键清除 |
| **Sway / River (Wayland)** | `mako` / `fnott` | ✅ 完美兼容 | 轻量 Wayland 瞬态弹窗 |
| **Niri (Wayland 平铺合成器)** | `noctalia` / `mako` / `dunst` | ✅ 完美兼容 | 配合 Noctalia 现代外壳提供平滑过渡动效 |
| **i3 / bspwm / awesome (X11)** | `dunst` | ✅ 完美兼容 | X11 极简悬浮通知卡片 |

> [!NOTE]
> 如果你在轻量窗口管理器（如 i3 / Sway / Hyprland）中未收到通知，请确保后台已启动至少一种通知守护进程（如 `dunst &` 或 `mako &`）。主流桌面环境（GNOME / KDE / XFCE）已开箱自带。

### 3. 多音频驱动级联容灾机制 (PulseAudio / PipeWire / ALSA)

Linux 下音频后端繁多，本扩展内置了级联自动探测逻辑，**绝不因为单一音频命令缺失而抛错**：
1. **PulseAudio 优先**：若系统中存在 `paplay`，以配置音量调用系统音频 `/usr/share/sounds/freedesktop/stereo/complete.oga`；
2. **PipeWire 兜底**：若在纯 PipeWire 环境（未装 Pulse 兼容层）探测到 `pw-play`，自动调用 `pw-play --volume`；
3. **ALSA 基础层兜底**：若仅有纯内核级 ALSA，自动调用 `aplay -q`；
4. **终极终端蜂鸣**：若系统无任何可用声卡播放器，自动回退向终端输出 `\x07`（ASCII Bell 蜂鸣）。

### 4. 终端焦点感知 (DECSET 1004) 兼容性

| 终端仿真器 | DECSET 1004 焦点上报 | 行为与特性 |
| :--- | :---: | :--- |
| **WezTerm** | ✅ 完美支持 | 切出终端发出 `\x1b[O`，切回发出 `\x1b[I` |
| **Kitty** | ✅ 完美支持 | 支持 DECSET 1004，支持 OSC 99 协议 |
| **Ghostty** | ✅ 完美支持 | 原生支持焦点感知与 OSC 9 / OSC 777 |
| **Foot (Wayland)** | ✅ 完美支持 | 极速轻量 Wayland 终端，完美支持 DECSET 1004 |
| **GNOME Terminal / Ptyxis / Tilix** | ✅ 完美支持 | 基于 VTE 0.40+ 核心，完整支持焦点汇报 |
| **Windows Terminal (Win11 / WSL2)** | ✅ 完美支持 | 1.16+ 原生支持 DECSET 1004，WSL2 PTY 完美穿透 |
| **Alacritty** | ⚠️ 降级兜底 | 部分发行版版本未开启焦点汇报；插件自动降级为耗时与延迟检测，安全静默不崩溃 |

> [!TIP]
> **在 tmux 中使用**：若在 Linux 终端中运行了 tmux，请确保在 `~/.tmux.conf` 中追加以下配置以允许终端向 tmux 透传焦点事件：
> ```tmux
> set -g focus-events on
> ```

### 5. 无桌面环境与 SSH 远程服务器场景

- 若你在无显示屏的 Linux 服务器（Headless Server）上通过 SSH 连接运行 Pi：
  - 扩展检测到不存在图形界面显示服务时，**自动将通知转为 OSC 777 / OSC 99 控制序列**；
  - 本地宿主终端（如本地的 WezTerm / Windows Terminal / Kitty）接收到 SSH 输出流后，在本地桌面直接触发弹窗！

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
