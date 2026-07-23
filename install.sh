#!/usr/bin/env bash
# ClashShow - 安装 GNOME Shell 扩展
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_UUID="clashshow@clashshow"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

echo "📦 安装 ClashShow 扩展..."

# 创建扩展目录
mkdir -p "$EXT_DIR"

# 复制扩展文件
cp "$SCRIPT_DIR/gnome-extension/$EXT_UUID/metadata.json" "$EXT_DIR/"
cp "$SCRIPT_DIR/gnome-extension/$EXT_UUID/extension.js" "$EXT_DIR/"

# 复制 Python 数据获取脚本
cp "$SCRIPT_DIR/clash_latest.py" "$EXT_DIR/"
chmod +x "$EXT_DIR/clash_latest.py"

echo "✅ 文件已复制到 $EXT_DIR"

# 尝试启用扩展
gnome-extensions enable "$EXT_UUID" 2>/dev/null && \
    echo "✅ 扩展已启用" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Wayland 下需要重新登录才能加载新扩展。"
echo "   请执行以下操作："
echo ""
echo "   1. 保存所有工作"
echo "   2. 注销当前会话 (点击右上角 → 注销)"
echo "   3. 重新登录后，扩展将自动生效"
echo ""
echo "   登录后如未自动启用，运行:"
echo "   gnome-extensions enable $EXT_UUID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   卸载: gnome-extensions disable $EXT_UUID && rm -rf $EXT_DIR"
