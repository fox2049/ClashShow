#!/usr/bin/env python3
"""
ClashShow - 获取 Clash Verge (mihomo) 实时网速 + 最新连接信息
通过 Unix Socket 访问 mihomo API，输出格式（固定宽度）：
  ↓   0KB ↑   0KB │ host  ↓18.8KB ↑2.44KB  [DIRECT]
"""

import socket
import json
import sys
import time

SOCKET_PATH = "/tmp/verge/verge-mihomo.sock"
STATE_FILE = "/tmp/clashshow_speed.json"

# 常见的二级顶级域名后缀（取 3 段）
_TWO_PART_TLDS = {
    'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'ac.cn',
    'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
    'com.hk', 'org.hk', 'com.tw', 'org.tw',
    'co.jp', 'or.jp', 'ne.jp', 'ac.jp',
    'com.au', 'net.au', 'org.au',
    'co.kr', 'or.kr',
    'com.sg', 'com.my', 'co.th',
    'com.br', 'com.mx', 'com.ar',
    'co.in', 'co.za', 'co.nz',
    'com.ru', 'com.ua',
}


def main_domain(host):
    """提取主域名，如 a.b.google.com → google.com"""
    # IP 地址原样返回
    if not host or host[0].isdigit():
        return host
    parts = host.rstrip('.').split('.')
    if len(parts) <= 2:
        return host
    # 检查是否为二级顶级域名
    last_two = '.'.join(parts[-2:])
    if last_two in _TWO_PART_TLDS:
        return '.'.join(parts[-3:]) if len(parts) >= 3 else host
    return '.'.join(parts[-2:])


def format_bytes(b):
    """将字节数格式化为人类可读的形式（用于连接流量，宽度不固定）"""
    if b < 1024:
        return f"{b}B"
    elif b < 1024 ** 2:
        return f"{b / 1024:.1f}KB"
    elif b < 1024 ** 3:
        return f"{b / 1024 ** 2:.1f}MB"
    else:
        return f"{b / 1024 ** 3:.2f}GB"


def format_speed_fixed(bps):
    """
    将速度 (B/s) 格式化为固定 6 字符宽度（含单位）。
    数值部分恒定 4 字符，单位恒定 2 字符 (KB / MB)。
    示例: '   0KB'  '  42KB'  ' 999KB'  ' 1.2MB'  '99.9MB'
    """
    if bps < 0:
        bps = 0
    kb = bps / 1024
    if kb < 1000:
        return f'{kb:4.0f}KB'
    else:
        mb = kb / 1024
        if mb > 99.9:
            mb = 99.9
        return f'{mb:4.1f}MB'


def fetch_connections():
    """通过 Unix Socket 向 mihomo 发送 HTTP GET /connections"""
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.settimeout(3)
    sock.connect(SOCKET_PATH)
    request = (
        "GET /connections HTTP/1.0\r\n"
        "Host: localhost\r\n"
        "\r\n"
    )
    sock.sendall(request.encode())
    response = b""
    while True:
        try:
            chunk = sock.recv(65536)
            if not chunk:
                break
            response += chunk
        except socket.timeout:
            break
    sock.close()
    parts = response.split(b"\r\n\r\n", 1)
    if len(parts) < 2:
        return None
    return json.loads(parts[1])


def calc_speed(dl_total, ul_total):
    """根据两次累计值之差计算速度 (B/s)，状态持久化到临时文件"""
    now = time.time()
    prev = None
    try:
        with open(STATE_FILE, "r") as f:
            prev = json.load(f)
    except Exception:
        pass
    try:
        with open(STATE_FILE, "w") as f:
            json.dump({"dl": dl_total, "ul": ul_total, "t": now}, f)
    except Exception:
        pass
    if prev and "dl" in prev and "t" in prev:
        dt = now - prev["t"]
        if dt > 0.3:
            dl_speed = max(0, (dl_total - prev["dl"]) / dt)
            ul_speed = max(0, (ul_total - prev["ul"]) / dt)
            return dl_speed, ul_speed
    return 0.0, 0.0


def main():
    try:
        data = fetch_connections()
        if not data:
            return
        dl_total = data.get("downloadTotal", 0)
        ul_total = data.get("uploadTotal", 0)
        dl_speed, ul_speed = calc_speed(dl_total, ul_total)
        speed_str = f"↓{format_speed_fixed(dl_speed)}  ↑{format_speed_fixed(ul_speed)}"
        connections = data.get("connections") or []
        if not connections:
            print(json.dumps({"speed": speed_str, "chain": "", "host": "无活动连接", "direct": True}))
            return
        latest = max(connections, key=lambda c: c.get("start", ""))
        meta = latest.get("metadata", {})
        host = meta.get("host") or meta.get("destinationIP", "unknown")
        chains = latest.get("chains", [])
        chain = chains[-1] if chains else "?"
        is_direct = (chain == "DIRECT")
        print(json.dumps({"speed": speed_str, "chain": chain, "host": host, "direct": is_direct}))
    except FileNotFoundError:
        print(json.dumps({"speed": "↓   0KB  ↑   0KB", "chain": "", "host": "Clash 未运行", "direct": True}))
    except ConnectionRefusedError:
        print(json.dumps({"speed": "↓   0KB  ↑   0KB", "chain": "", "host": "Clash 连接失败", "direct": True}))
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
