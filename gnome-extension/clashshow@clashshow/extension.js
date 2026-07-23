import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const REFRESH_INTERVAL = 3;
const DIRECT_COLOR = '#77216F';
const PROXY_COLOR = '#E95420';
const HOT_COLOR = '#E95420';
const BASE_STYLE = 'font-size: 11px;';

export default class ClashShowExtension extends Extension {
    enable() {
        this._scriptPath = GLib.build_filenamev([
            this.dir.get_path(),
            'clash_latest.py',
        ]);

        this._indicator = new PanelMenu.Button(0.0, 'ClashShow', true);

        const box = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
        });

        // 下载速度
        this._dlLabel = new St.Label({
            text: '⏳',
            y_align: Clutter.ActorAlign.CENTER,
            style: BASE_STYLE,
        });

        // 上传速度
        this._ulLabel = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 11px; margin-left: 6px;',
        });

        // 分隔符
        this._sepLabel = new St.Label({
            text: '│',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 11px; margin-left: 6px; margin-right: 6px;',
        });

        // 分流状态圆点
        this._dotLabel = new St.Label({
            text: '●',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 9px;',
        });

        // 域名
        this._hostLabel = new St.Label({
            text: 'Clash…',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 11px; margin-left: 5px;',
        });

        box.add_child(this._dlLabel);
        box.add_child(this._ulLabel);
        box.add_child(this._sepLabel);
        box.add_child(this._dotLabel);
        box.add_child(this._hostLabel);
        this._indicator.add_child(box);

        Main.panel.addToStatusArea('clashshow', this._indicator);

        try {
            const leftBox = Main.panel._leftBox;
            if (leftBox) {
                Main.panel._rightBox.remove_child(this._indicator.container);
                leftBox.add_child(this._indicator.container);
            }
        } catch (e) {
            logError(e, 'ClashShow: 无法移动到左侧');
        }

        this._update();
        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            REFRESH_INTERVAL,
            () => {
                this._update();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _update() {
        try {
            const proc = Gio.Subprocess.new(
                ['python3', this._scriptPath],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
            );
            const [ok, stdout] = proc.communicate_utf8(null, null);
            if (ok && stdout) {
                const info = JSON.parse(stdout.trim());

                // 下载速度（超1MB变色）
                this._dlLabel.text = info.dl || '';
                this._dlLabel.style = info.dl_hot
                    ? `font-size: 11px; color: ${HOT_COLOR};`
                    : BASE_STYLE;

                // 上传速度（超1MB变色）
                this._ulLabel.text = info.ul || '';
                this._ulLabel.style = info.ul_hot
                    ? 'font-size: 11px; margin-left: 6px; color: ' + HOT_COLOR + ';'
                    : 'font-size: 11px; margin-left: 6px;';

                // 域名
                this._hostLabel.text = info.host || '';

                // 圆点颜色：直连紫色，代理橙色
                const color = info.direct ? DIRECT_COLOR : PROXY_COLOR;
                this._dotLabel.style = `font-size: 9px; color: ${color};`;
            } else {
                this._dlLabel.text = '';
                this._ulLabel.text = '';
                this._hostLabel.text = 'Clash?';
            }
        } catch (e) {
            this._hostLabel.text = 'Err';
            logError(e, 'ClashShow');
        }
    }

    disable() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
            this._dlLabel = null;
            this._ulLabel = null;
            this._sepLabel = null;
            this._dotLabel = null;
            this._hostLabel = null;
        }
    }
}
