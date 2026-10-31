# Changelog

## 1.0.0 (2026-10-31)

### Features
- Initial release of `@yangzhaoyunfei/pi-notify`.
- Added DECSET 1004 terminal focus tracking (`\x1b[?1004h` / `\x1b[?1004l`).
- Integrated 100% reliable native OS delivery:
  - Windows: PowerShell WinForms `NotifyIcon` BalloonTip + `[console]::beep`.
  - Linux: `notify-send` + `paplay` (D-Bus / Noctalia).
- Added focus gating: quiet when user is actively looking at the terminal, alert when unfocused.
- Added `/notify [check|test]` interactive command.
