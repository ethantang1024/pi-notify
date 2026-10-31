# @yangzhaoyunfei/pi-notify

> **带焦点感知（Focus-Aware）的 Pi Coding Agent 跨平台桌面通知与音效扩展**  
> 融合 **DECSET 1004 终端焦点检测** 与 **100% 确定性系统原生 API 交付**（Windows Shell 托盘气泡 / Linux D-Bus `notify-send`）。

---

## 🌟 核心特性与解决的痛点

1. **终端焦点感知（Focus-Aware 防打扰）**：
   - 眼睛正看着终端编码或日常一问一答时：**彻底静默，绝不弹出桌面通知弹窗骚扰**！
   - 切出当前终端（看文档、切浏览器、其他窗口工作）：**长任务完成、工具报错或等待交互提问时，立刻弹出桌面通知**。
2. **100% 确定性系统级原生投递（彻底解决 OSC 转义序列被吞问题）**：
   - **Windows 11**：通过 PowerShell 直接调用 Win32 宿主系统托盘 `System.Windows.Forms.NotifyIcon`（气泡通知）与 `[console]::beep`；绕过脆弱的终端控制字符，在 **Windows Terminal** 与 **WezTerm** 下 100% 弹出通知！
   - **NixOS 桌面（Niri + Noctalia）**：直接调用 `notify-send` 经 D-Bus 发往 Noctalia 桌面外壳，并调用 `paplay` 播放提示音；
   - **终端协议回退**：对纯无桌面终端自动降级为 OSC 777 / OSC 99。
3. **关键事件不遗漏**：
   - **长任务完成（`agent_settled`）**：离开终端且任务执行完毕时通知；
   - **任务报错（`tool_result` isError）**：发生工具或系统错误时通知；
   - **交互提问（`ui_prompt_start`）**：Agent 等待你做单选/确认/输入决策时通知，防止会话挂死。

---

## 🖥️ 终端与多场景兼容矩阵

| 终端工具 | Windows 11 原生 Pi | NixOS + Niri 物理桌面 | Win11 + WSL2 NixOS | 焦点感知 (DECSET 1004) | 桌面通知投递方式 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **WezTerm** | ✅ 完美兼容 | ✅ 完美兼容 | ✅ 完美兼容 | ✅ 支持（失焦 `\x1b[O`，聚焦 `\x1b[I`） | Windows 托盘气泡 / Linux `notify-send` |
| **Windows Terminal** | ✅ 完美兼容 | — | ✅ 完美兼容 | ✅ 支持（失焦 `\x1b[O`，聚焦 `\x1b[I`） | Windows 托盘气泡 |
| **Kitty** | — | ✅ 完美兼容 | — | ✅ 支持（失焦 `\x1b[O`，聚焦 `\x1b[I`） | Linux `notify-send` / OSC 99 |
| **Alacritty** | ⚠️ 降级兜底 | ⚠️ 降级兜底 | ❌ 不推荐 | ⚠️ 部分版本不支持焦点汇报，降级为常规通知 | Windows 托盘气泡 / Linux `notify-send` |

---

## ⚙️ 配置说明 (`settings.json`)

在 `~/.pi/agent/settings.json`（或项目级 `.pi/settings.json`）中配置 `"notify"` 字段：

```json
{
  "packages": [
    "git:gitee.com/yangzhaoyunfei/pi-notify.git"
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

### 参数配置字典

| 配置项 | 类型 | 默认值 | 作用与说明 |
| :--- | :---: | :---: | :--- |
| **`focusAware`** | `boolean` | `true` | **是否开启终端焦点感知**。开启后，在终端处于前台焦点时静默，失焦时才发通知。 |
| **`onComplete`** | `boolean` | `true` | 任务完成时是否通知（在 `focusAware: true` 下，仅失焦时才通知）。 |
| **`onError`** | `boolean` | `true` | 发生错误或工具异常时是否通知。 |
| **`onQuestion`** | `boolean` | `true` | 等待用户交互提问输入时是否通知（在 `focusAware: true` 下，仅失焦时才通知）。 |
| **`sound`** | `boolean` | `false` | 是否播放提示音（Windows 为蜂鸣音，Linux 为 freedesktop 音效）。 |
| **`volume`** | `number` | `0.4` | 音量大小（`0.0 ~ 1.0`，仅在 Linux `paplay` 下生效）。 |
| **`minWorkMs`** | `number` | `2000` | 任务最少耗时毫秒数。低于此时间的极速响应视为普通单轮对话，不弹通知。 |
| **`minAwayMs`** | `number` | `1000` | 切离终端的最少等待毫秒数。防止误触切屏抖动导致误发弹窗。 |
| **`alwaysNotifyOnError`** | `boolean` | `true` | 发生错误时，即使当前聚焦在终端也强行弹出通知（避免遗漏故障）。 |

---

## 🛠️ 交互调试命令

扩展内置了 `/notify` 斜杠命令：

- **`/notify`** 或 **`/notify check`**：
  在 Pi 底部状态栏实时回显当前焦点判定状态与配置：
  ```text
  Backend: windows | Focus: FOCUSED (quiet mode) (away: n/a) | focusAware: true | sound: false
  ```
- **`/notify test`**：
  立即发送一条测试通知并触发蜂鸣音，用于快速校验当前系统的通知投递链路是否畅通。
