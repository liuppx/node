#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${1:-}"
CONFIG_FILE="$ROOT_DIR/config.js"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  printf 'Usage: %s <target-dir>\n' "$(basename "$0")" >&2
}

if [[ -z "$TARGET_DIR" ]]; then
  usage
  fail "缺少目标文件夹全路径参数"
fi

if [[ "$TARGET_DIR" != /* ]]; then
  fail "目标文件夹必须是全路径: $TARGET_DIR"
fi

[[ -f "$CONFIG_FILE" ]] || fail "未找到配置文件: $CONFIG_FILE"
[[ -d "$TARGET_DIR" ]] || fail "目标文件夹不存在: $TARGET_DIR"

cp "$CONFIG_FILE" "$TARGET_DIR/config.js" || fail "复制配置文件失败: $CONFIG_FILE -> $TARGET_DIR/config.js"

exit 0
