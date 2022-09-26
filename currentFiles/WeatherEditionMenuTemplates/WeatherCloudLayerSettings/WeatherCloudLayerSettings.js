class WeatherCloudLayerSettingUpdateEvent extends Event {
    constructor(data) {
        super("update");
        this.data = data;
    }
}
class WeatherCloudLayerSettingsElement extends TemplateElement {
    constructor() {
        super(...arguments);
        this.m_dispatchable = true;
        this.closeLayer = () => {
            this.dispatchEvent(new WeatherPresetPlanLayerUnselectEvent());
        };
        this.onRemoveLayer = (e) => {
            if (!this.removable)
                return;
            this.dispatchEvent(new CustomEvent('remove'));
        };
        this.onInputCoverageUpdate = (e) => {
            this.m_data.dvCoverageRatio.value = e.value;
            this.dispatchEvent(new WeatherCloudLayerSettingUpdateEvent(this.m_data));
            this.debounceDispatch();
        };
        this.onInputDensityUpdate = (e) => {
            this.m_data.dvDensityMultiplier.value = e.value;
            this.dispatchEvent(new WeatherCloudLayerSettingUpdateEvent(this.m_data));
            this.debounceDispatch();
        };
        this.onInputScatterUpdate = (e) => {
            this.m_data.dvCloudScatteringRatio.value = e.value;
            this.dispatchEvent(new WeatherCloudLayerSettingUpdateEvent(this.m_data));
            this.debounceDispatch();
        };
        this.onInputAltBotUpdate = (e) => {
            if (isNaN(e.value))
                return;
            this.m_dispatchable = false;
            this.m_data.dvAltitudeBot.value = e.value;
            this.m_input_altTop.clampMin = this.m_data.dvAltitudeBot.value;
            this.dispatchEvent(new WeatherCloudLayerSettingUpdateEvent(this.m_data));
            this.debounceDispatch();
        };
        this.onInputAltTopUpdate = (e) => {
            if (isNaN(e.value))
                return;
            this.m_dispatchable = false;
            this.m_data.dvAltitudeTop.value = e.value;
            this.m_input_altBot.clampMax = this.m_data.dvAltitudeTop.value;
            this.dispatchEvent(new WeatherCloudLayerSettingUpdateEvent(this.m_data));
            this.debounceDispatch();
        };
    }
    get templateID() { return "WeatherCloudLayerSettingsTemplate"; }
    ;
    connectedCallback() {
        super.connectedCallback();
        this.m_input_coverage = this.querySelector('inputable-range.coverage');
        this.m_input_density = this.querySelector('inputable-range.density');
        this.m_input_scatter = this.querySelector('inputable-range.scatter');
        this.m_input_altBot = this.querySelector('inputable-range.altBot');
        this.m_input_altTop = this.querySelector('inputable-range.altTop');
        this.m_closeLayerButton = this.querySelector('.CloseSettings');
        this.m_closeLayerButton.addEventListener('OnValidate', this.closeLayer);
        this.m_removeLayerButton = this.querySelector('new-push-button.remove');
        this.m_removeLayerButton.addEventListener('OnValidate', this.onRemoveLayer);
        this.m_input_coverage.addEventListener('update', this.onInputCoverageUpdate);
        this.m_input_density.addEventListener('update', this.onInputDensityUpdate);
        this.m_input_scatter.addEventListener('update', this.onInputScatterUpdate);
        this.m_input_altBot.addEventListener('update', this.onInputAltBotUpdate);
        this.m_input_altTop.addEventListener('update', this.onInputAltTopUpdate);
        TemplateElement.call(this.m_input_altTop, () => {
            this.m_input_coverage.dispatchOnInput = true;
            this.m_input_density.dispatchOnInput = true;
            this.m_input_scatter.dispatchOnInput = true;
            this.m_input_altBot.dispatchOnInput = true;
            this.m_input_altTop.dispatchOnInput = true;
        });
    }
    getData() {
        return this.m_data;
    }
    setData(data, maxAltitude) {
        this.m_data = data;
        if (this.m_dispatchable) {
            this.m_maxAltitude = maxAltitude;
            this.m_input_coverage.sqrtRange = true;
            this.m_input_coverage.setFromRangeDataValue(this.m_data.dvCoverageRatio);
            this.m_input_density.logRange = true;
            this.m_input_density.setFromRangeDataValue(this.m_data.dvDensityMultiplier);
            this.m_input_scatter.setFromRangeDataValue(this.m_data.dvCloudScatteringRatio);
            this.m_input_altBot.sqrtRange = true;
            this.m_input_altBot.setFromRangeDataValue(this.m_data.dvAltitudeBot);
            this.m_input_altTop.sqrtRange = true;
            this.m_input_altTop.setFromRangeDataValue(this.m_data.dvAltitudeTop);
        }
    }
    get removable() { return this.hasAttribute('removable'); }
    set removable(value) { if (value) {
        this.setAttribute('removable', '');
    }
    else {
        this.removeAttribute('removable');
    } }
    static get observedAttributes() { return super.observedAttributes.concat(['removable']); }
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        switch (name) {
            case "removable":
                this.m_removeLayerButton.disable(!this.removable);
                break;
        }
    }
    debounceDispatch() {
        this.m_dispatchable = false;
        clearTimeout(this.m_dispatchTimeout);
        this.m_dispatchTimeout = setTimeout(() => {
            this.m_dispatchable = true;
        }, 100);
    }
}
window.customElements.define("weather-cloud-layer-settings", WeatherCloudLayerSettingsElement);
checkAutoload();
//# sourceMappingURL=WeatherCloudLayerSettings.js.map