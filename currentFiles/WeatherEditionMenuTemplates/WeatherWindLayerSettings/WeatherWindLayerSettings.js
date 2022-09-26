Include.addScript('/JS/animation/animation.js');
class WeatherWindLayerSettingUpdateEvent extends Event {
    constructor(data) {
        super("update");
        this.data = data;
    }
}
class WeatherWindLayerSettingsGustGraphElementData {
}
class WeatherWindLayerSettingsCompassElement extends ButtonElement {
    constructor() {
        super();
        this.m_rotating = false;
        this.handleMouseDown = (e) => {
            this.m_rotating = true;
        };
        this.handleMouseMove = (e) => {
            if (!this.m_rotating)
                return;
            let angle = this.getAngle(e.clientX, e.clientY, (this.querySelector('.wrapper').getBoundingClientRect().left + this.querySelector('.wrapper').getBoundingClientRect().right) / 2, (this.querySelector('.wrapper').getBoundingClientRect().top + this.querySelector('.wrapper').getBoundingClientRect().bottom) / 2);
            angle = angle - 90 < 0 ? 360 + (angle - 90) : angle - 90;
            this.value = angle;
        };
        this.handleMouseUp = (e) => {
            this.m_rotating = false;
            this.dispatchEvent(new CustomEvent("update"));
        };
        this.display = () => {
            this.m_d_arrow_icon.style.transform = "translate(-50%, -50%) rotate(" + this.reversedValue + "deg)";
        };
        this.getAngle = (originX, originY, targetX, targetY) => {
            var dx = originX - targetX;
            var dy = originY - targetY;
            var theta = Math.atan2(-dy, -dx);
            theta *= 180 / Math.PI;
            if (theta < 0)
                theta += 360;
            return Math.round(theta);
        };
    }
    get templateID() { return "WeatherWindLayerSettingsCompassTemplate"; }
    ;
    get value() { return Number(this.getAttribute("value")); }
    set value(value) { this.setAttribute("value", value.toString()); }
    get valueAsString() {
        return parseFloat(Number(this.getAttribute("value")).toFixed(1)).toString();
    }
    get reversedValue() { return Number(this.getAttribute("reversed-value")); }
    set reversedValue(value) { this.setAttribute("reversed-value", value.toString()); }
    connectedCallback() {
        super.connectedCallback();
        this.virtualScrollElement = this.querySelector('virtual-scroll');
        this.m_d_arrow_handle = this.querySelector('.handle');
        this.m_d_arrow_icon = this.querySelector(".icon-arrow");
        this.m_d_value = this.querySelector(".angle");
        this.m_d_arrow_handle.addEventListener("mousedown", this.handleMouseDown);
        this.addEventListener("mouseup", this.handleMouseUp);
        this.addEventListener("mousemove", this.handleMouseMove);
        this.display();
    }
    onKeyDown(keycode) {
        if (keycode == KeyCode.KEY_LEFT || keycode == KeyCode.KEY_RIGHT) {
            if (keycode == KeyCode.KEY_LEFT)
                this.value -= 1;
            else
                this.value += 1;
            return true;
        }
        return super.onKeyDown(keycode);
        ;
    }
    static get observedAttributes() { return super.observedAttributes.concat(['value', 'reversed-value']); }
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if (oldValue != newValue) {
            switch (name) {
                case 'value':
                    this.reversedValue = (Number(newValue) + 180) % 360;
                    this.display();
                    break;
            }
        }
    }
    onVisibilityChange(val) {
        if (this.isConnected && this.virtualScrollElement) {
            TemplateElement.call(this.virtualScrollElement, () => {
                this.virtualScrollElement.updateSizes();
            });
        }
    }
    onAnalogPadScroll(values) {
        this.value = (Math.atan2(values.down - values.up, values.right - values.left) * 180 / Math.PI) + 90;
        if (!this.m_analogDispatchDebounce) {
            this.m_analogDispatchDebounce = setTimeout(() => {
                this.dispatchEvent(new CustomEvent("update"));
                this.m_analogDispatchDebounce = null;
            }, 5);
        }
    }
}
window.customElements.define("weather-wind-layer-settings-compass", WeatherWindLayerSettingsCompassElement);
class WeatherWindLayerSettingsGustGraphElement extends TemplateElement {
    constructor() {
        super();
        this.m_wave_colors = new Array("#DF9CFF", "#6DA7FF", "#97DE82", "#FFED75", "#FFAD09");
        this.setData = (_data) => {
            if (this.m_data)
                this.clean();
            this.m_data = _data;
            if (this.isConnected) {
                this.m_d_speed.innerHTML = Math.round(this.maxSpeed).toString() + " " + _data.dvSpeed.unit.toLowerCase();
                this.m_d_duration.innerHTML = "60 " + Utils.Translate('TT:MENU.UNIT_SECONDS');
                this.draw.main();
            }
        };
        this.clean = () => {
            this.m_timeline.stop();
            this.m_timeline = null;
            Utils.RemoveAllChildren(this.m_svg);
        };
        this.draw = {
            "main": () => {
                const topMaring = 30;
                const width = this.m_svg.getBoundingClientRect().width;
                const height = this.m_svg.getBoundingClientRect().height - topMaring;
                this.m_svg.setAttribute('viewBox', '0 0 ' + this.m_svg.getBoundingClientRect().width + ' ' + this.m_svg.getBoundingClientRect().height);
                const xSize = width / 120;
                const ySize = this.maxSpeed > 0 ? height / this.maxSpeed : height;
                let points = [];
                this.m_data.tGraphSpeedData.forEach((speed, index) => {
                    points.push([xSize * index, height - (speed * ySize) + topMaring]);
                });
                let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", this.m_wave_colors[0] || "white");
                path.setAttribute("d", this.draw.sPath(points, this.draw.bezierCommand));
                this.m_svg.appendChild(path);
                this.m_timeline = new UITimeline();
                let animationOptions = {
                    elements: Array.from(this.querySelectorAll('.caroussel svg path')),
                    iterations: -1,
                    duration: 60000,
                    properties: {
                        transform: [
                            { value: `translateX(0)`, percent: 0 },
                            { value: `translateX(-50%)`, percent: 100, easing: 'linear' }
                        ]
                    }
                };
                this.m_timeline.add(animationOptions);
                this.m_timeline.play();
            },
            "sPath": (points, command) => points.reduce((acc, point, i, a) => i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${command(point, i, a)}`, ''),
            "line": (pointA, pointB) => {
                const lengthX = pointB[0] - pointA[0];
                const lengthY = pointB[1] - pointA[1];
                return {
                    length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
                    angle: Math.atan2(lengthY, lengthX)
                };
            },
            "controlPoint": (current, previous, next, reverse = false) => {
                const p = previous || current;
                const n = next || current;
                const smoothing = 0.2;
                const o = this.draw.line(p, n);
                const angle = o.angle + (reverse ? Math.PI : 0);
                const length = o.length * smoothing;
                const x = current[0] + Math.cos(angle) * length;
                const y = current[1] + Math.sin(angle) * length;
                return [x, y];
            },
            "bezierCommand": (point, i, a) => {
                const [cpsX, cpsY] = this.draw.controlPoint(a[i - 1], a[i - 2], point);
                const [cpeX, cpeY] = this.draw.controlPoint(point, a[i - 1], a[i + 1], true);
                return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
            },
            "lineCommand": (point) => `L ${point[0]} ${point[1]}`,
        };
    }
    get templateID() { return "WeatherWindLayerSettingsGustGraphTemplate"; }
    ;
    connectedCallback() {
        super.connectedCallback();
        this.m_svg = this.querySelector('svg');
        this.m_d_speed = this.querySelector('.hud .speed');
        this.m_d_speed_min = this.querySelector('.hud .index');
        this.m_d_duration = this.querySelector('.hud .duration');
        if (this.m_data) {
            this.setData(this.m_data);
        }
    }
    get maxSpeed() { return Math.max(...this.m_data.tGraphSpeedData); }
    get minSpeed() { return Math.min(...this.m_data.tGraphSpeedData); }
}
window.customElements.define("weather-wind-layer-settings-gusts-graph", WeatherWindLayerSettingsGustGraphElement);
class WeatherWindLayerSettingsElement extends TemplateElement {
    constructor() {
        super(...arguments);
        this.onSpeedInputUpdate = (e) => {
            let newValue = Number(e.target.value);
            if (this.m_data.dvSpeed.value == newValue)
                return;
            this.m_data.dvSpeed.value = newValue;
            this.dispatchUpdate();
        };
        this.closeLayer = () => {
            this.dispatchEvent(new WeatherPresetPlanLayerUnselectEvent());
        };
        this.onAngleNumberInputUpdate = (e) => {
            let newValue = (e.target.value) * (Math.PI / 180);
            if (this.m_data.dvAngleRad.value == newValue)
                return;
            this.m_data.dvAngleRad.value = newValue;
            this.dispatchUpdate();
        };
        this.onAngleCompassUpdate = (e) => {
            let newValue = e.target.value * (Math.PI / 180);
            if (this.m_data.dvAngleRad.value == newValue)
                return;
            this.m_data.dvAngleRad.value = newValue;
            this.dispatchUpdate();
        };
        this.onGustSpeedInputUpdate = (e) => {
            let newValue;
            if (this.m_data.dvSpeed.value > 0) {
                newValue = Number(e.target.value / this.m_data.dvSpeed.value);
            }
            else {
                newValue = 0.0;
            }
            console.log("New Speed : ", newValue, e.target.value);
            if (this.m_data.gustWaveData.dvSpeedMultiplier.value == newValue)
                return;
            this.m_data.gustWaveData.dvSpeedMultiplier.value = newValue;
            this.dispatchUpdate();
        };
        this.onGustFrequencyInputUpdate = (e) => {
            let value = Math.ceil(Number(e.target.value));
            if (value == 0)
                return;
            if (this.m_data.gustWaveData.dvIntervalS.value == value)
                return;
            this.m_data.gustWaveData.dvIntervalS.value = value;
            this.dispatchUpdate();
        };
        this.onGustAngleNumberInputUpdate = (e) => {
            let value = e.target.value * (Math.PI / 180);
            if (this.m_data.gustWaveData.dvAngleRad.value == value)
                return;
            this.m_data.gustWaveData.dvAngleRad.value = value;
            this.dispatchUpdate();
        };
        this.onGustAngleCompassUpdate = (e) => {
            let value = e.target.value * (Math.PI / 180);
            if (this.m_data.gustWaveData.dvAngleRad.value == value)
                return;
            this.m_data.gustWaveData.dvAngleRad.value = value;
            this.dispatchUpdate();
        };
        this.setGustGraphData = (data) => {
            this.m_windLayerGustGraph.setData(data);
        };
        this.dispatchUpdate = () => {
            this.dispatchEvent(new WeatherWindLayerSettingUpdateEvent(this.m_data));
        };
        this.onRemoveLayer = (e) => {
            if (!this.removable)
                return;
            this.dispatchEvent(new CustomEvent('remove'));
        };
    }
    get templateID() { return "WeatherWindLayerSettingsTemplate"; }
    ;
    get pending() { return Number(this.getAttribute('max-speed')); }
    set pending(value) { this.setAttribute('max-speed', value.toString()); }
    get maxSpeed() { return Number(this.getAttribute('max-speed')); }
    set maxSpeed(value) { this.setAttribute('max-speed', value.toString()); }
    get maxGustSpeedRatio() { return Number(this.getAttribute('max-gust-speed-ratio')); }
    set maxGustSpeedRatio(value) { this.setAttribute('max-gust-speed-ratio', value.toString()); }
    get minGustSpeedRatio() { return Number(this.getAttribute('min-gust-speed-ratio')); }
    set minGustSpeedRatio(value) { this.setAttribute('min-gust-speed-ratio', value.toString()); }
    connectedCallback() {
        super.connectedCallback();
        this.m_windLayerTitleAltitude = this.querySelector('.wind-layer-title-altitude');
        this.m_windLayerShortDesc = this.querySelector('.wind-layer-short-desc');
        this.m_windLayerAngleNumberInput = this.querySelector('#windAngleNumberInput');
        this.m_windLayerCompass = this.querySelector('weather-wind-layer-settings-compass#wind');
        this.m_windLayerGustAngleNumberInput = this.querySelector('#windGustAngleNumberInput');
        this.m_windLayerGustCompass = this.querySelector('weather-wind-layer-settings-compass#windgusts');
        this.m_closeLayerButton = this.querySelector('.CloseSettings');
        this.m_closeLayerButton.addEventListener('OnValidate', this.closeLayer);
        this.m_windLayerGustGraph = this.querySelector('weather-wind-layer-settings-gusts-graph');
        this.m_removeLayerButton = this.querySelector('new-push-button.remove');
        this.m_removeLayerButton.addEventListener('OnValidate', this.onRemoveLayer);
        this.m_speedInput = this.querySelector('#wind-layer-speed-input');
        this.m_gustwaveSpeedInput = this.querySelector('#gust-speed-input');
        this.m_gustwaveFrequencyInput = this.querySelector('#gust-freq-input');
        this.m_virtualScroll = this.querySelector("virtual-scroll");
    }
    getData() {
        if (!this.m_data)
            return null;
        return Object.assign({}, this.m_data);
    }
    setData(data) {
        this.m_data = data;
        this.m_windLayerTitleAltitude.innerHTML = this.m_data.dvAltitude.value < 250 ? Utils.Translate('TT:MENU.GROUND') : Utils.Translate('TT:MENU.WEATHER_PANEL_AT') + " " + this.m_data.dvAltitude.value.toFixed() + Utils.Translate('TT:MENU.UNIT_FEET');
        let angelDeg = this.m_data.dvAngleRad.value * (180 / Math.PI);
        let gustAngelDeg = this.m_data.gustWaveData.dvAngleRad.value * (180 / Math.PI);
        if (this.m_data.dvSpeed.value <= 6 ||
            (Math.abs(angelDeg - gustAngelDeg) >= 60 && this.m_data.dvSpeed.value > 6)) {
            this.m_windLayerShortDesc.innerHTML = Utils.Translate('TT:MENU.WEATHER_PANEL.WIND_VAR_PREFIX') + " " + String(Math.ceil(this.m_data.dvSpeed.value)).padStart(2, '0');
            if (this.m_data.gustWaveData.dvSpeedMultiplier.value * this.m_data.dvSpeed.value > 0)
                this.m_windLayerShortDesc.innerHTML += "G" + String(Math.ceil(this.m_data.gustWaveData.dvSpeedMultiplier.value * this.m_data.dvSpeed.value)).padStart(2, '0');
        }
        else if (this.m_data.gustWaveData.dvSpeedMultiplier.value * this.m_data.dvSpeed.value > 0) {
            this.m_windLayerShortDesc.innerHTML = String(Math.ceil(angelDeg)).padStart(3, '0') + " " + String(Math.ceil(this.m_data.dvSpeed.value)).padStart(2, '0') + "G" + String(Math.ceil(this.m_data.gustWaveData.dvSpeedMultiplier.value * this.m_data.dvSpeed.value)).padStart(2, '0');
        }
        else {
            this.m_windLayerShortDesc.innerHTML = String(Math.ceil(angelDeg)).padStart(3, '0') + " " + String(Math.ceil(this.m_data.dvSpeed.value)).padStart(2, '0');
        }
        this.m_speedInput.setFromRangeDataValue(this.m_data.dvSpeed);
        this.m_speedInput.logRange = true;
        this.m_windLayerAngleNumberInput.min = 0;
        this.m_windLayerAngleNumberInput.max = 359;
        this.m_windLayerAngleNumberInput.step = 1;
        this.m_windLayerAngleNumberInput.setValue(Math.ceil(data.dvAngleRad.value * (180 / Math.PI)));
        this.m_windLayerGustAngleNumberInput.min = 0;
        this.m_windLayerGustAngleNumberInput.max = 359;
        this.m_windLayerGustAngleNumberInput.step = 1;
        this.m_windLayerGustAngleNumberInput.setValue(Math.ceil(data.gustWaveData.dvAngleRad.value * (180 / Math.PI)));
        this.m_gustwaveSpeedInput.m_value_dispatchable = false;
        this.m_gustwaveSpeedInput.label = Utils.Translate(this.m_data.gustWaveData.dvSpeedMultiplier.name).toUpperCase();
        this.m_gustwaveSpeedInput.subLabel = "(" + Utils.Translate(this.m_data.gustWaveData.dvSpeedMultiplier.unit.toLowerCase()) + ")";
        this.m_gustwaveSpeedInput.value = this.m_data.gustWaveData.dvSpeedMultiplier.value * this.m_data.dvSpeed.value;
        this.m_gustwaveSpeedInput.min = this.m_gustwaveSpeedInput.clampMin = 0;
        this.m_gustwaveSpeedInput.max = this.m_gustwaveSpeedInput.clampMax = 2 * this.m_data.dvSpeed.value;
        this.m_gustwaveFrequencyInput.setFromRangeDataValue(this.m_data.gustWaveData.dvIntervalS);
        this.m_windLayerCompass.value = data.dvAngleRad.value * (180 / Math.PI);
        this.m_windLayerGustCompass.value = data.gustWaveData.dvAngleRad.value * (180 / Math.PI);
        this.m_gustwaveSpeedInput.disable(this.m_data.dvSpeed.value == 0);
        this.m_windLayerGustAngleNumberInput.disable(this.m_data.dvSpeed.value == 0);
        this.m_windLayerGustCompass.disable(this.m_data.dvSpeed.value == 0);
        this.m_gustwaveFrequencyInput.disable(this.m_data.dvSpeed.value == 0 || this.m_data.gustWaveData.dvSpeedMultiplier.value == 0.0);
        this.m_speedInput.addEventListener("update", this.onSpeedInputUpdate);
        this.m_windLayerAngleNumberInput.addEventListener('change', this.onAngleNumberInputUpdate);
        this.m_windLayerCompass.addEventListener("update", this.onAngleCompassUpdate);
        this.m_gustwaveSpeedInput.addEventListener("update", this.onGustSpeedInputUpdate);
        this.m_gustwaveFrequencyInput.addEventListener("update", this.onGustFrequencyInputUpdate);
        this.m_windLayerGustAngleNumberInput.addEventListener('change', this.onGustAngleNumberInputUpdate);
        this.m_windLayerGustCompass.addEventListener("update", this.onGustAngleCompassUpdate);
        TemplateElement.call(this.m_virtualScroll, () => {
            this.m_virtualScroll.updateSizes();
        });
    }
    setConfig(config) {
        this.maxSpeed = config.dvMaxWindSpeed.value;
        this.maxGustSpeedRatio = config.fMaxGustSpeedRatio;
        this.minGustSpeedRatio = config.fMinGustSpeedRatio;
    }
    get removable() { return this.hasAttribute('removable'); }
    set removable(value) { if (value) {
        this.setAttribute('removable', '');
    }
    else {
        this.removeAttribute('removable');
    } }
    static get observedAttributes() { return super.observedAttributes.concat(['removable', 'max-speed', 'max-gust-speed']); }
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        switch (name) {
            case "max-speed":
                this.m_speedInput.max = this.maxSpeed;
                break;
            case "max-gust-speed-ratio":
                this.m_gustwaveSpeedInput.max = this.maxGustSpeedRatio;
                break;
            case "min-gust-speed-ratio":
                this.m_gustwaveSpeedInput.min = this.minGustSpeedRatio;
                break;
            case "removable":
                this.m_removeLayerButton.disable(!this.removable);
                break;
        }
    }
}
window.customElements.define("weather-wind-layer-settings", WeatherWindLayerSettingsElement);
checkAutoload();
//# sourceMappingURL=WeatherWindLayerSettings.js.map