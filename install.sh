#!/usr/bin/env bash
set -euo pipefail

REPO_SLUG="DiabloZhang/fifa2026calendar-larkcli"
REF="${FIFA2026CALENDAR_REF:-main}"
INSTALL_CMD="github:${REPO_SLUG}#${REF}"

say() {
  printf '%s\n' "$*"
}

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

say "==> 世界杯2026赛程 ⚽️ 安装器"

if ! need_cmd node || ! need_cmd npm; then
  say "未检测到 Node.js / npm。"
  say ""
  say "请先安装 Node.js（安装后会自带 npm / npx）："
  say "  https://nodejs.org/"
  say ""
  if need_cmd brew; then
    say "如果你用 Homebrew，也可以执行："
    say "  brew install node"
  fi
  fail ""
fi

say "检测到 Node.js: $(node -v)"
say "检测到 npm: $(npm -v)"

if ! need_cmd lark-cli; then
  say ""
  say "未检测到 lark-cli，开始安装..."
  npm install -g @larksuite/cli
  say "lark-cli 安装完成。"
fi

say ""
say "如果这是你第一次使用 lark-cli，请先完成初始化和授权："
say "  lark-cli config init"
say "  lark-cli auth login --domain calendar"
say ""

RUNNER=""
if need_cmd npx; then
  RUNNER="npx"
else
  RUNNER="npm exec --"
fi

say "开始导入世界杯赛程到飞书日历..."
if [ "$RUNNER" = "npx" ]; then
  exec npx "$INSTALL_CMD" install "$@"
else
  exec npm exec -- "$INSTALL_CMD" install "$@"
fi
