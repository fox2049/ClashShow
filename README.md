# ClashShow

在 GNOME 顶栏实时显示 Clash Verge (mihomo) 的网速与分流信息。

![GNOME Shell](https://img.shields.io/badge/GNOME-48--50-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 效果

```
↓ 224KB  ↑  73KB │ [DIRECT] bilivideo.cn
↓ 1.2MB  ↑ 128KB │ [白嫖机场] google.com      ← 代理时域名显示为紫色
```

- **左侧**：本机总下载/上传速度（固定宽度，自动切换 KB/MB）
- **中间**：分流策略（DIRECT / 代理节点名）
- **右侧**：最新连接的完整域名（代理时变为 `#77216F` 紫色）

## 依赖

- GNOME Shell 48+（Wayland / X11）
- Python 3
- [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev)（需运行中）

## 安装

```bash
git clone https://github.com/YOUR_USERNAME/ClashShow.git
cd ClashShow
bash install.sh
```

安装后**注销并重新登录**（Wayland 下新扩展必须重启 GNOME Shell）。

## 工作原理

1. `clash_latest.py` 通过 Unix Socket (`/tmp/verge/verge-mihomo.sock`) 调用 mihomo API 的 `/connections` 端点
2. 计算两次采样间 `downloadTotal` / `uploadTotal` 差值得出实时速度
3. 取 `start` 时间最新的连接，输出 JSON（速度、策略、域名、是否直连）
4. GNOME Shell 扩展每 3 秒调用脚本，解析 JSON 渲染到顶栏，代理时域名变色

## 自定义

| 项目 | 位置 | 说明 |
|------|------|------|
| 刷新间隔 | `extension.js` → `REFRESH_INTERVAL` | 默认 3 秒 |
| 代理颜色 | `extension.js` → `PROXY_COLOR` | 默认 `#77216F` |
| Socket 路径 | `clash_latest.py` → `SOCKET_PATH` | 默认 `/tmp/verge/verge-mihomo.sock` |

## 卸载

```bash
gnome-extensions disable clashshow@clashshow
rm -rf ~/.local/share/gnome-shell/extensions/clashshow@clashshow
```

## License

MIT
