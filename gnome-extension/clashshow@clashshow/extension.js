import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const REFRESH_INTERVAL = 3;
const PROXY_COLOR = '#77216F';

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

        this._icon = new St.Icon({
            icon_name: 'network-transmit-receive-symbolic',
            style_class: 'system-status-icon',
        });

        this._speedLabel = new St.Label({
            text: '⏳',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 11px;',
        });

        this._sepLabel = new St.Label({
            text: ' │ ',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 11px;',
        });

        this._chainLabel = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 11px;',
        });

        this._hostLabel = new St.Label({
            text: 'Clash…',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 11px;',
        });

        box.add_child(this._icon);
        box.add_child(this._speedLabel);
        box.add_child(this._sepLabel);
        box.add_child(this._chainLabel);
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
                this._speedLabel.text = info.speed || '';
                this._chainLabel.text = info.chain ? `[${info.chain}] ` : '';
                this._hostLabel.text = info.host || '';
                if (info.direct) {
                    this._hostLabel.style = 'font-size: 11px;';
                } else {
                    this._hostLabel.style = `font-size: 11px; color: ${PROXY_COLOR};`;
                }
            } else {
                this._speedLabel.text = '';
                this._chainLabel.text = '';
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
            this._speedLabel = null;
            this._sepLabel = null;
            this._chainLabel = null;
            this._hostLabel = null;
            this._icon = null;
        }
    }
}
