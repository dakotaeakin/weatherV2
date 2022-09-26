class WeatherPresetBarData {
}
class SaveAsEvent extends Event {
    constructor(_presetName, _bIsInCloud = false) {
        super('saveAs');
        this.presetName = _presetName;
        this.bIsInCloud = _bIsInCloud;
    }
}
class WeatherPresetBarElement extends TemplateElement {
    constructor() {
        super(...arguments);
        this.m_weatherPreset = null;
        this.m_bAllowEditGameFlight = false;
        this.m_bAllowLocalSave = false;
        this.setData = (data) => {
            this.m_data = data;
            if (!this.m_data.presets.length)
                return;
            let dropDownValues = [];
            data.presets.forEach((uiWData, i) => {
                let value = new DataValue;
                value.name = Coherent.translate(uiWData.name);
                value.ID = i;
                dropDownValues.push(value);
            });
            this.m_dropdown.setData(dropDownValues, data.currentPresetIndex - 1);
        };
        this.setWeatherPreset = (data) => {
            this.m_weatherPreset = data;
            this.updateButtonState();
        };
        this.selectWeatherPreset = (event) => {
            this.pendingChange = false;
            this.update(event);
        };
        this.update = (event) => {
            this.dispatchEvent(new CustomEvent("selectedWeatherPreset", { detail: event.selected }));
        };
        this.onSavePresetButton = (event) => {
            if (!this.pendingChange)
                return;
            if (!this.m_weatherPreset.bIsRemovable)
                return;
            this.dispatchEvent(new CustomEvent('save'));
        };
        this.onSaveAsPresetButton = (event) => {
            if (!this.pendingChange)
                return;
            let popUpParams = new PopUp.NotiticationParams();
            popUpParams.title = "TT:MENU.POPUP_TITLE_WEATHER_PRESET_SAVE";
            if (this.m_bAllowLocalSave) {
                popUpParams.buttons.push(new NotificationButton("TT:MENU.SAVE_TO_CLOUD", "WP_VALIDATE_SAVE_AS_CLOUD"));
                popUpParams.buttons.push(new NotificationButton("TT:MENU.SAVE_LOCAL", "WP_VALIDATE_SAVE_AS_LOCAL"));
            }
            else {
                popUpParams.buttons.push(new NotificationButton("TT:MENU.SAVE", "WP_VALIDATE_SAVE_AS_CLOUD"));
            }
            popUpParams.buttons.push(new NotificationButton("TT:MENU.CANCEL", "WP_CANCEL_SAVE_AS"));
            popUpParams.contentUrl = "/templates/PopUps/PopUp_InputText/PopUp_InputText.html";
            popUpParams.contentTemplate = "popup-input-text";
            let maxLength = 64;
            let newName = Utils.Translate("TT:MENU.WEATHER_PANEL.CREATE.PRESETNAME.PREFIX") + " " + Utils.Translate(this.m_weatherPreset.sPresetName);
            newName = newName.substring(0, maxLength - 1);
            popUpParams.contentData = JSON.stringify({ description: Utils.Translate("TT:MENU.WEATHER_PANEL.CREATE.PRESETNAME"), maxLength: maxLength, defaultText: newName });
            popUpParams.style = "small";
            PopUp.showPopUp(popUpParams);
        };
        this.onEditPresetButton = (event) => {
            if (!this.m_weatherPreset.bIsRemovable)
                return;
            let popUpParams = new PopUp.NotiticationParams();
            popUpParams.title = "TT:MENU.POPUP_TITLE_WEATHER_PRESET_EDIT";
            popUpParams.buttons.push(new NotificationButton("TT:MENU.SAVE", "WP_VALIDATE_EDIT"));
            popUpParams.buttons.push(new NotificationButton("TT:MENU.CANCEL", "WP_CANCEL_EDIT"));
            popUpParams.contentUrl = "/templates/PopUps/PopUp_InputText/PopUp_InputText.html";
            popUpParams.contentTemplate = "popup-input-text";
            popUpParams.contentData = JSON.stringify({ description: Utils.Translate("TT:MENU.WEATHER_PANEL.EDIT.PRESETNAME"), maxLength: 64, defaultText: this.m_weatherPreset.sPresetName });
            popUpParams.style = "small";
            PopUp.showPopUp(popUpParams);
        };
        this.onRemovePresetButton = (event) => {
            if (!this.m_weatherPreset.bIsRemovable)
                return;
            let popUpParams = new PopUp.NotiticationParams();
            popUpParams.title = "TT:MENU.POPUP_TITLE_WEATHER_PRESET_DELETE";
            popUpParams.contentData = "TT:MENU.POPUP_TITLE_SURE";
            popUpParams.description = "TT:MENU.POPUP_TITLE_SURE";
            popUpParams.buttons.push(new NotificationButton("TT:MENU.DELETE", "WP_VALIDATE_DELETE"));
            popUpParams.buttons.push(new NotificationButton("TT:MENU.CANCEL", "WP_CANCEL_DELETE"));
            popUpParams.style = "small";
            PopUp.showPopUp(popUpParams);
        };
        this.onValidateSaveAsLocal = (presetname) => {
            this.dispatchEvent(new SaveAsEvent(presetname, false));
            this.m_dropdown.focusByKeys(0);
        };
        this.onValidateSaveAsCloud = (presetname) => {
            this.dispatchEvent(new SaveAsEvent(presetname, true));
            this.m_dropdown.focusByKeys(0);
        };
        this.onValidateEdit = (presetname) => {
            this.dispatchEvent(new CustomEvent('edit', { detail: { name: presetname } }));
            this.m_dropdown.focusByKeys(0);
        };
        this.onValidateDelete = () => {
            this.dispatchEvent(new CustomEvent('delete'));
            this.m_dropdown.focusByKeys(0);
        };
        this.setAllowEditGameFlight = (value) => {
            this.m_bAllowEditGameFlight = value;
            this.updateButtonState();
        };
        this.setAllowLocalSave = (value) => {
            this.m_bAllowLocalSave = value;
        };
        this.updateButtonState = () => {
            this.m_saveAsPresetButton.disable(!this.m_bAllowEditGameFlight);
            this.m_savePresetButton.disable(!this.m_bAllowEditGameFlight);
            this.m_editPresetButton.disable(!this.m_bAllowEditGameFlight);
            this.m_removePresetButton.disable(!this.m_bAllowEditGameFlight);
            this.m_saveAsPresetButton.disable(!this.pendingChange);
            if (this.m_weatherPreset && this.m_weatherPreset.bIsRemovable) {
                this.m_savePresetButton.disable(!this.pendingChange);
                this.m_editPresetButton.disable(false);
                this.m_removePresetButton.disable(false);
            }
        };
    }
    get templateID() { return "WeatherPresetBarTemplate"; }
    ;
    connectedCallback() {
        super.connectedCallback();
        this.m_dropdown = this.querySelector('drop-down');
        this.m_savePresetButton = this.querySelector('icon-button.save');
        this.m_saveAsPresetButton = this.querySelector('icon-button.saveAs');
        this.m_editPresetButton = this.querySelector('icon-button.edit');
        this.m_removePresetButton = this.querySelector('icon-button.remove');
        this.m_dropdown.addEventListener("select", this.selectWeatherPreset);
        this.m_savePresetButton.addEventListener("OnValidate", this.onSavePresetButton);
        this.m_saveAsPresetButton.addEventListener("OnValidate", this.onSaveAsPresetButton);
        this.m_editPresetButton.addEventListener("OnValidate", this.onEditPresetButton);
        this.m_removePresetButton.addEventListener("OnValidate", this.onRemovePresetButton);
        Coherent.on("WP_VALIDATE_SAVE_AS_LOCAL", this.onValidateSaveAsLocal);
        Coherent.on("WP_VALIDATE_SAVE_AS_CLOUD", this.onValidateSaveAsCloud);
        Coherent.on("WP_VALIDATE_EDIT", this.onValidateEdit);
        Coherent.on("WP_VALIDATE_DELETE", this.onValidateDelete);
    }
    get pendingChange() { return this.hasAttribute('pending-change'); }
    set pendingChange(value) {
        if (this.m_bAllowEditGameFlight) {
            this.setAttribute('pending-change', '');
        }
        else {
            if (value) {
                this.setAttribute('pending-change', '');
            }
            else if (this.pendingChange) {
                this.removeAttribute('pending-change');
            }
        }
    }
    static get observedAttributes() { return ["pending-change"]; }
    attributeChangedCallback(name, oldValue, newValue) {
        if (!this.isConnected)
            return;
        switch (name) {
            case "pending-change":
                this.updateButtonState();
                break;
            default:
                return;
        }
    }
}
window.customElements.define("weather-preset-bar", WeatherPresetBarElement);
checkAutoload();
//# sourceMappingURL=WeatherPresetBar.js.map