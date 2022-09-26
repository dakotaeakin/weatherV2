console.log("Hello World");

var WeatherEditionMenuElementPanel;
(function (WeatherEditionMenuElementPanel) {
  WeatherEditionMenuElementPanel[
    (WeatherEditionMenuElementPanel["SETTINGS"] = 0)
  ] = "SETTINGS";
  WeatherEditionMenuElementPanel[(WeatherEditionMenuElementPanel["WIND"] = 1)] =
    "WIND";
  WeatherEditionMenuElementPanel[
    (WeatherEditionMenuElementPanel["CLOUD"] = 2)
  ] = "CLOUD";
})(WeatherEditionMenuElementPanel || (WeatherEditionMenuElementPanel = {}));
class WeatherEditionMenuElement extends TemplateElement {
  constructor() {
    super();
    this.m_w_pending_presets = [];
    this.initialized = false;
    this.m_timeLocked = false;
    this.m_timeSliderChangedLocally = false;
    this.m_metar_panel_state = false;
    this.init = () => {
      if (this.initialized) return;
      this.initialized = true;
      super.connectedCallback();
      this.m_d_panels = this.querySelector(".panels");
      this.m_c_presetbar = this.querySelector("weather-preset-bar");
      this.m_c_presetplan = this.querySelector("weather-preset-plan");
      this.m_c_settings = this.querySelector("weather-settings");
      this.m_c_windLayerSettings = this.querySelector(
        "weather-wind-layer-settings"
      );
      this.m_c_cloudLayerSettings = this.querySelector(
        "weather-cloud-layer-settings"
      );
      this.m_c_flightPlanningSlider = this.querySelector("flight-time-slider");
      this.m_liveOverlay = this.querySelector(".WeatherLiveOverlay");
      this.m_liveButtonMetar = this.querySelector(".GoToMetarPanelButton");
      this.m_PresetBarContainer = this.querySelector(
        ".WeatherPresetBarContainer"
      );
      this.m_datepicker = this.querySelector("#datePicker");
      this.m_datepicker.addEventListener(
        "dateChanged",
        this.onWeatherSettingUpdateDate
      );
      this.m_ToggleTimeLive = this.querySelector("#ToggleTimeLive");
      this.m_ToggleTimeLive.addEventListener(
        "OnValidate",
        this.onToggleTimeLive
      );
      this.m_ToggleWeatherLive = this.querySelector("#ToggleWeatherLive");
      this.m_ToggleWeatherLive.addEventListener(
        "OnValidate",
        this.onToggleWeatherLive
      );
      this.m_liveButtonMetar.addEventListener(
        "OnValidate",
        this.onLiveButtonMetarPush
      );
      this.m_weather_listener = RegisterWeatherListener();
      this.m_weather_listener.setWeatherPresetList(this.onSetWeatherPresetList);
      this.m_weather_listener.onFlightTimeChanged(this.onFlightTimeChanged);
      this.m_weather_listener.onTimeUpdated(this.onTimeUpdated);
      this.m_weather_listener.onToggleReadOnlyPanel(this.onToggleReadOnlyPanel);
      this.m_weather_listener.updatePreset(this.setData);
      this.m_weather_listener.onUpdateGustSpeedGraphData(
        this.onUpdateGustSpeedGraphData
      );
      this.m_weather_listener.onAllowEditGameflightFlag(
        this.onAllowEditGameflightFlag
      );
      this.m_weather_listener.onAllowLocalSave(this.onAllowLocalSave);
      this.m_weather_listener.onMetarPanelVisiblityStateChange(
        this.onMetarPanelVisiblityStateChange
      );
      this.m_weather_listener.onMeanGroundLevelLineChange(
        this.onMeanGroundLevelLineChange
      );
      this.m_c_settings.addEventListener("update", this.onWeatherSettingUpdate);
      this.m_c_settings.addEventListener(
        "dateChanged",
        this.onWeatherSettingUpdateDate
      );
      this.m_c_presetbar.addEventListener(
        "selectedWeatherPreset",
        this.onSelectedWeatherPreset
      );
      this.m_c_presetbar.addEventListener("save", this.onPresetBarSave);
      this.m_c_presetbar.addEventListener("saveAs", this.onPresetBarSaveAs);
      this.m_c_presetbar.addEventListener("edit", this.onPresetBarEdit);
      this.m_c_presetbar.addEventListener("delete", this.onPresetBarDelete);
      this.m_c_presetplan.addEventListener(
        "selectLayer",
        this.onWeatherPresetPlanLayerSelect
      );
      this.m_c_presetplan.addEventListener(
        "unSelectLayer",
        this.onWeatherPresetPlanLayerUnSelect
      );
      this.m_c_presetplan.addEventListener(
        "createCloudLayer",
        this.onWeatherPresetPlanCloudLayerCreate
      );
      this.m_c_presetplan.addEventListener(
        "updateCloudLayer",
        this.onWeatherPresetPlanCloudLayerUpdate
      );
      this.m_c_presetplan.addEventListener(
        "createWindLayer",
        this.onWeatherPresetPlanWindLayerCreate
      );
      this.m_c_presetplan.addEventListener(
        "updateWindLayer",
        this.onWeatherPresetPlanWindLayerUpdate
      );
      this.m_c_presetplan.addEventListener(
        "settingClick",
        this.onOpenSettingPanelClick
      );
      this.m_c_windLayerSettings.addEventListener(
        "update",
        this.onSelectedWindLayerUpdate
      );
      this.m_c_windLayerSettings.addEventListener(
        "remove",
        this.onSelectedWindLayerRemove
      );
      this.m_c_windLayerSettings.addEventListener(
        "unSelectLayer",
        this.onWeatherPresetPlanLayerUnSelect
      );
      this.m_c_cloudLayerSettings.addEventListener(
        "update",
        this.onSelectedCloudLayerUpdate
      );
      this.m_c_cloudLayerSettings.addEventListener(
        "remove",
        this.onSelectedCloudLayerRemove
      );
      this.m_c_cloudLayerSettings.addEventListener(
        "unSelectLayer",
        this.onWeatherPresetPlanLayerUnSelect
      );
      this.m_c_flightPlanningSlider.addEventListener(
        "timeChange",
        this.onTimeChanged
      );
      this.m_c_flightPlanningSlider.addEventListener(
        "timeIncrease",
        this.onTimeIncrease
      );
      this.m_c_flightPlanningSlider.addEventListener(
        "timeDecrease",
        this.onTimeDecrease
      );
      this.m_c_flightPlanningSlider.addEventListener(
        "rangeDragStart",
        this.onTimeStartDrag
      );
      this.m_c_flightPlanningSlider.addEventListener(
        "rangeDragEnd",
        this.onTimeEndDrag
      );
      this.m_c_flightPlanningSlider.addEventListener(
        "timeLocalToSystemTime",
        this.onTimeLocalToSystemTime
      );
      this.m_d_panels.addEventListener(
        "mousemove",
        this.onWeatherPanelComponentMouseMove
      );
      this.m_datepicker.addEventListener(
        "uiScrollSizeUpdate",
        this.onDatePickerSizeUpdate
      );
    };
    this.setData = (weatherPreset) => {
      if (!this.m_w_local_preset)
        this.toggleSubPanel(WeatherEditionMenuElementPanel.SETTINGS);
      this.m_w_displayed_preset = weatherPreset;
      this.m_w_local_preset = this.m_w_displayed_preset;
      if (this.m_w_local_preset.index == 0) {
        this.live = true;
      } else {
        this.live = false;
      }
      this.m_liveOverlay.classList.toggle("hide", !this.live);
      this.m_ToggleWeatherLive.setValue(this.live);
      this.m_weather_listener.getWeatherPresetList();
      this.m_c_presetbar.pendingChange = false;
      this.m_c_presetbar.setWeatherPreset(this.m_w_local_preset);
      this.m_c_presetplan.unSelectLayer();
      this.m_c_presetplan.setData(this.m_w_local_preset, true);
      this.m_c_settings.setData(this.m_w_local_preset.oSettings);
    };
    this.onUpdateGustSpeedGraphData = (data) => {
      if (this.activeSubPanel instanceof WeatherWindLayerSettingsElement) {
        const speedData = new WeatherWindLayerSettingsGustGraphElementData();
        speedData.dvSpeed = Object.assign(
          {
            value:
              this.m_w_local_preset.tWindLayers[
                this.m_c_presetplan.selectedLayer.index
              ].gustWaveData.dvSpeedMultiplier.value *
              this.m_w_local_preset.tWindLayers[
                this.m_c_presetplan.selectedLayer.index
              ].dvSpeed.value,
          },
          this.m_w_local_preset.tWindLayers[
            this.m_c_presetplan.selectedLayer.index
          ].dvSpeed
        );
        speedData.tGraphSpeedData = data;
        this.activeSubPanel.setGustGraphData(speedData);
      }
    };
    this.onAllowEditGameflightFlag = (value) => {
      this.m_c_presetbar.setAllowEditGameFlight(value);
    };
    this.onAllowLocalSave = (value) => {
      this.m_c_presetbar.setAllowLocalSave(value);
    };
    this.onMetarPanelVisiblityStateChange = (visible) => {
      this.m_metar_panel_state = visible;
      if (this.m_liveButtonMetar) {
        TemplateElement.call(this.m_liveButtonMetar, () => {
          this.m_liveButtonMetar.selected = visible;
        });
      }
    };
    this.onMeanGroundLevelLineChange = (value) => {
      TemplateElement.call(this, () => {
        this.m_c_presetplan.updateMeanGroundLevelPosition(value);
      });
    };
    this.onDatePickerSizeUpdate = () => {
      if (this.isConnected && this.m_c_settings.isConnected) {
        TemplateElement.call(this.m_c_settings, () => {
          this.m_c_settings.querySelector("virtual-scroll").sendSizeUpdate();
        });
      }
    };
    this.onSetWeatherPresetList = (m_w_preset_list) => {
      this.m_w_preset_list = m_w_preset_list;
      let presetBarData = new WeatherPresetBarData();
      presetBarData.presets = this.m_w_preset_list;
      if (this.m_w_local_preset)
        presetBarData.currentPresetIndex = this.m_w_local_preset.index + 1;
      presetBarData.switchable = true;
      presetBarData.editable = true;
      this.m_livePresetIndex = this.m_w_preset_list.findIndex(
        (preset) => preset.live
      );
      this.m_c_presetbar.setData(presetBarData);
    };
    this.onTimeUpdated = (data, locked) => {
      if (!this.isConnected || !this.initialized) return;
      this.m_timeLocked = locked;
      if (this.m_timeSliderChangedLocally) {
        this.m_timeSliderChangedLocally = false;
      } else {
        this.m_c_flightPlanningSlider.setData(data);
      }
      this.m_ToggleTimeLive.setValue(data.live);
      this.m_ToggleTimeLive.disable(data.live);
      this.setTimeData(data);
      if (this.m_c_flightPlanningSlider.disabled != this.m_timeLocked) {
        this.m_c_flightPlanningSlider.disabled = this.m_timeLocked;
      }
    };
    this.onFlightTimeChanged = (timeData) => {
      if (!this.isConnected || !this.initialized) return;
      if (this.m_timeSliderChangedLocally) {
        this.m_timeSliderChangedLocally = false;
      } else {
        this.m_c_flightPlanningSlider.setData(timeData);
      }
      this.m_ToggleTimeLive.setValue(timeData.live);
      this.m_ToggleTimeLive.disable(timeData.live);
      this.setTimeData(timeData);
    };
    this.onToggleReadOnlyPanel = (canEditWeather, canEditCustom) => {
      this.readonly = !canEditCustom;
      this.disabled = !canEditWeather;
    };
    this.m_sub_panels = [
      "weather-settings",
      "weather-wind-layer-settings",
      "weather-cloud-layer-settings",
    ];
    this.m_active_sub_panel_index = 0;
    this.onWeatherSettingUpdate = (e) => {
      this.m_w_local_preset.oSettings = e.data;
      this.dispatchNewPreset(null, e.forceRefresh);
    };
    this.onWeatherSettingUpdateDate = (e) => {
      this.m_weather_listener.setDate(e.data);
    };
    this.onWeatherPanelComponentMouseMove = (e) => {
      let target = e.target;
      if (target.classList.contains("disabled")) {
      } else {
      }
    };
    this.onTimeChanged = () => {
      if (!this.isConnected || !this.initialized) return;
      this.m_timeSliderChangedLocally = true;
      this.m_weather_listener.setLocalTime(
        this.m_c_flightPlanningSlider.getTimeValue()
      );
    };
    this.onTimeIncrease = () => {
      if (!this.isConnected || !this.initialized) return;
      this.m_weather_listener.increaseLocalTime();
    };
    this.onTimeDecrease = () => {
      if (!this.isConnected || !this.initialized) return;
      this.m_weather_listener.decreaseLocalTime();
    };
    this.onTimeStartDrag = () => {
      this.m_weather_listener.setForcedTime(true);
    };
    this.onTimeEndDrag = () => {
      this.m_weather_listener.setForcedTime(false);
    };
    this.onTimeLocalToSystemTime = () => {
      if (!this.isConnected) return;
      this.m_weather_listener.timeLocalToSystemTime();
    };
    this.onToggleTimeLive = () => {
      if (this.m_ToggleTimeLive.toggled) {
        this.m_weather_listener.timeLocalToSystemTime();
      }
    };
    this.onToggleWeatherLive = () => {
      if (this.m_ToggleWeatherLive.toggled) {
        this.m_weather_listener.setWeatherPreset(this.m_livePresetIndex);
      } else {
        this.m_weather_listener.setWeatherPreset(this.m_w_preset_list[1].index);
        LaunchFlowEventToGlobalFlow("FORCE_DISABLE_AND_HIDE_METAR_PANEL");
      }
    };
    this.onLiveButtonMetarPush = () => {
      if (this.m_metar_panel_state) {
        LaunchFlowEventToGlobalFlow("FORCE_DISABLE_AND_HIDE_METAR_PANEL");
      } else {
        LaunchFlowEventToGlobalFlow("FORCE_ENABLE_AND_DISPLAY_METAR_PANEL");
      }
    };
    this.onSelectedWeatherPreset = (e) => {
      this.m_weather_listener.setWeatherPreset(e.detail.ID);
      this.toggleSubPanel(WeatherEditionMenuElementPanel.SETTINGS);
    };
    this.onPresetBarSave = (e) => {
      this.m_c_presetbar.pendingChange = false;
      this.m_weather_listener.savePreset(
        this.generateNewPresetData(),
        () => {},
        (e) => {
          console.warn(e);
        }
      );
      this.m_weather_listener.getWeatherPresetList();
    };
    this.onPresetBarSaveAs = (e) => {
      this.m_c_presetbar.pendingChange = false;
      this.m_weather_listener.addPreset(
        e.presetName,
        e.bIsInCloud,
        () => {},
        (e) => {
          console.warn(e);
        }
      );
      this.m_weather_listener.getWeatherPresetList();
    };
    this.onPresetBarEdit = (e) => {
      this.m_w_local_preset.sPresetName = e.detail.name;
      this.m_weather_listener.savePreset(
        this.generateNewPresetData(),
        () => {},
        (e) => {
          console.warn(e);
        }
      );
      this.m_weather_listener.getWeatherPresetList();
    };
    this.onPresetBarDelete = (e) => {
      this.m_weather_listener.removePreset(
        (res) => {
          console.error(res);
        },
        (e) => {
          console.error(e);
        }
      );
      this.m_weather_listener.getWeatherPresetList();
    };
    this.onSelectedWindLayerUpdate = (event) => {
      if (
        !this.m_c_presetplan.selectedLayer ||
        !(
          this.m_c_presetplan.selectedLayer instanceof
          WeatherPresetPlanWindLayerLineElement
        )
      )
        return;
      this.m_w_local_preset.tWindLayers[
        this.m_c_presetplan.selectedLayer.index
      ] = event.data;
      this.dispatchNewPreset();
    };
    this.onSelectedWindLayerRemove = (event) => {
      if (
        !this.m_c_presetplan.selectedLayer ||
        !(
          this.m_c_presetplan.selectedLayer instanceof
          WeatherPresetPlanWindLayerLineElement
        )
      )
        return;
      this.m_w_local_preset.tWindLayers.splice(
        this.m_c_presetplan.selectedLayer.index,
        1
      );
      this.toggleSubPanel(WeatherEditionMenuElementPanel.SETTINGS);
      this.m_c_settings.setData(this.m_w_local_preset.oSettings);
      this.dispatchNewPreset();
    };
    this.onSelectedCloudLayerUpdate = (event) => {
      if (
        !this.m_c_presetplan.selectedLayer ||
        !(
          this.m_c_presetplan.selectedLayer instanceof
          WeatherPresetPlanCloudLayerLineElement
        )
      )
        return;
      this.m_w_local_preset.tCloudLayers[
        this.m_c_presetplan.selectedLayer.index
      ] = event.data;
      this.dispatchNewPreset();
    };
    this.onSelectedCloudLayerRemove = (event) => {
      if (
        !this.m_c_presetplan.selectedLayer ||
        !(
          this.m_c_presetplan.selectedLayer instanceof
          WeatherPresetPlanCloudLayerLineElement
        )
      )
        return;
      this.m_w_local_preset.tCloudLayers.splice(
        this.m_c_presetplan.selectedLayer.index,
        1
      );
      this.toggleSubPanel(WeatherEditionMenuElementPanel.SETTINGS);
      this.m_c_settings.setData(this.m_w_local_preset.oSettings);
      this.dispatchNewPreset();
    };
    this.onWeatherPresetPlanLayerSelect = (event) => {
      if (event.layerElement instanceof WeatherPresetPlanWindLayerLineElement) {
        this.toggleSubPanel(WeatherEditionMenuElementPanel.WIND);
        this.m_c_windLayerSettings.setConfig(this.m_w_local_preset.oConfig);
        this.m_c_windLayerSettings.setData(
          this.m_w_local_preset.tWindLayers[event.layerElement.index]
        );
      } else if (
        event.layerElement instanceof WeatherPresetPlanCloudLayerLineElement
      ) {
        this.toggleSubPanel(WeatherEditionMenuElementPanel.CLOUD);
        this.m_c_cloudLayerSettings.setData(
          this.m_w_local_preset.tCloudLayers[event.layerElement.index],
          this.m_w_local_preset.oConfig.dvMaxAltitude
        );
      }
    };
    this.onWeatherPresetPlanLayerUnSelect = (event) => {
      if (this.m_c_presetplan.selectedLayer) {
        this.m_c_presetplan.selectedLayer.selected = false;
        this.m_c_presetplan.selectedLayer = null;
        this.toggleSubPanel(WeatherEditionMenuElementPanel.SETTINGS);
      }
    };
    this.onWeatherPresetPlanCloudLayerCreate = (event) => {
      return;
    };
    this.onWeatherPresetPlanCloudLayerUpdate = (event) => {
      this.m_w_local_preset.tCloudLayers[event.index].dvAltitudeBot.value =
        event.altitude.value;
      this.m_w_local_preset.tCloudLayers[event.index].dvAltitudeTop.value =
        event.altitudeTop.value;
      this.toggleSubPanel(WeatherEditionMenuElementPanel.CLOUD);
      this.m_c_cloudLayerSettings.setData(
        this.m_w_local_preset.tCloudLayers[event.index],
        this.m_w_local_preset.oConfig.dvMaxAltitude
      );
      this.dispatchNewPreset();
    };
    this.onWeatherPresetPlanWindLayerCreate = (event) => {
      this.m_weather_listener.createWindLayer();
    };
    this.onWeatherPresetPlanWindLayerUpdate = (event) => {
      this.m_w_local_preset.tWindLayers[event.index].dvAltitude.value =
        event.altitude.value;
      this.toggleSubPanel(WeatherEditionMenuElementPanel.WIND);
      this.m_c_windLayerSettings.setConfig(this.m_w_local_preset.oConfig);
      this.m_c_windLayerSettings.setData(
        this.m_w_local_preset.tWindLayers[event.index]
      );
      this.dispatchNewPreset();
    };
    this.onOpenSettingPanelClick = (event) => {
      this.toggleSubPanel(WeatherEditionMenuElementPanel.SETTINGS);
      this.m_c_settings.setData(this.m_w_local_preset.oSettings);
    };
  }
  get templateID() {
    return "WeatherEditionMenuTemplate";
  }
  get theme() {
    return this.getAttribute("theme") || "light";
  }
  set theme(value) {
    this.setAttribute("theme", value);
  }
  get localPreset() {
    return this.m_w_local_preset;
  }
  get displayedPreset() {
    return this.m_w_displayed_preset;
  }
  get presetList() {
    return this.m_w_preset_list;
  }
  get readonly() {
    return this.hasAttribute("read-only");
  }
  set readonly(value) {
    if (value) {
      this.setAttribute("read-only", "");
    } else {
      this.removeAttribute("read-only");
    }
  }
  get live() {
    return this.hasAttribute("live");
  }
  set live(value) {
    if (value) {
      this.setAttribute("live", "");
    } else {
      this.removeAttribute("live");
    }
  }
  connectedCallback() {
    Include.addScript("/JS/Services/Weather.js", this.init);
  }
  static get observedAttributes() {
    return super.observedAttributes.concat(["live", "read-only"]);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case "read-only":
        if (newValue == oldValue) break;
        this.m_d_panels.classList.toggle(
          "disabled",
          this.readonly || this.live
        );
        this.m_PresetBarContainer.classList.toggle(
          "disabled",
          this.live || this.disabled
        );
        break;
      case "live":
        if (newValue == oldValue) break;
        this.m_d_panels.classList.toggle(
          "disabled",
          this.live || this.readonly
        );
        this.m_PresetBarContainer.classList.toggle(
          "disabled",
          this.live || this.disabled
        );
        break;
    }
  }
  onVisibilityChange(visible) {
    super.onVisibilityChange(visible);
    if (this.isConnected && this.m_c_settings.isConnected) {
      TemplateElement.call(this.m_c_settings, () => {
        this.m_c_settings.querySelector("virtual-scroll").sendSizeUpdate();
      });
    }
  }
  setTimeData(data) {
    if (!this.isConnected) return;
    this.m_datepicker.SetTimeData(data);
  }
  get activeSubPanel() {
    if (this.m_active_sub_panel_index == null) return null;
    if (typeof this.m_sub_panels[this.m_active_sub_panel_index] == "undefined")
      return null;
    let component = this.querySelector(
      ".sub.panel " + this.m_sub_panels[this.m_active_sub_panel_index]
    );
    if (!component) return null;
    if (component instanceof WeatherSettingElement) {
      return component;
    } else if (component instanceof WeatherWindLayerSettingsElement) {
      return component;
    } else if (component instanceof WeatherCloudLayerSettingsElement) {
      return component;
    }
    return null;
  }
  toggleSubPanel(index) {
    this.activeSubPanel.classList.toggle("hide", true);
    this.m_c_presetplan.toogleActiveSettingButtonState(false);
    const isSame = this.m_active_sub_panel_index == index;
    this.m_active_sub_panel_index = index;
    this.activeSubPanel.classList.toggle("hide", false);
    this.m_c_presetplan.toogleActiveSettingButtonState(index == 0);
    this.m_c_windLayerSettings.removable =
      index == 1 &&
      this.m_w_local_preset.tWindLayers.length >
        UIWeatherConfig.I_MIN_WIND_LAYERS;
    this.m_c_cloudLayerSettings.removable =
      index == 2 &&
      this.m_w_local_preset.tCloudLayers.length >
        UIWeatherConfig.I_MIN_CLOUD_LAYERS;
    if (
      index == 1 &&
      (!isSame ||
        this.m_c_presetplan.selectedLayer instanceof
          WeatherPresetPlanWindLayerLineElement)
    ) {
      this.m_weather_listener.setUISelectedWindLayerIndex(
        this.m_c_presetplan.selectedLayer.index
      );
    } else {
      this.m_weather_listener.setUISelectedWindLayerIndex(-1);
    }
  }
  dispatchNewPreset(callback, forceRefresh = false) {
    let newPreset = this.generateNewPresetData();
    if (this.m_dispatch_timeout) {
      this.m_w_pending_presets.push(newPreset);
      return;
    }
    this.m_dispatch_timeout = setTimeout(
      () => {
        if (
          newPreset.tCloudLayers.length < UIWeatherConfig.I_MIN_CLOUD_LAYERS ||
          newPreset.tCloudLayers.length > UIWeatherConfig.I_MAX_CLOUD_LAYERS
        ) {
          console.warn(
            "Not enough or too much cloud layers amount in the new preset"
          );
          return;
        }
        if (
          newPreset.tWindLayers.length < UIWeatherConfig.I_MIN_WIND_LAYERS ||
          newPreset.tWindLayers.length > UIWeatherConfig.I_MAX_WIND_LAYERS
        ) {
          console.warn(
            "Not enough or too much wind layers amount in the new preset"
          );
          return;
        }
        this.m_weather_listener.updateTempWeatherPreset(
          newPreset,
          (data) => {
            this.m_c_presetbar.pendingChange = true;
            this.m_w_pending_presets.splice(0, 1);
            newPreset.bIsRemovable = data.bIsRemovable;
            newPreset.bIsValid = data.bIsValid;
            newPreset.tCloudLayers.forEach((c, i) => {
              c.dvAltitudeBot.clamp_max =
                data.tCloudLayers[i].dvAltitudeBot.clamp_max;
              c.dvAltitudeBot.clamp_min =
                data.tCloudLayers[i].dvAltitudeBot.clamp_min;
              c.dvAltitudeTop.clamp_max =
                data.tCloudLayers[i].dvAltitudeTop.clamp_max;
              c.dvAltitudeTop.clamp_min =
                data.tCloudLayers[i].dvAltitudeTop.clamp_min;
            });
            newPreset.tWindLayers.forEach((w, i) => {
              w.dvAltitude.clamp_max = data.tWindLayers[i].dvAltitude.clamp_max;
              w.dvAltitude.clamp_min = data.tWindLayers[i].dvAltitude.clamp_min;
            });
            this.m_c_presetbar.setWeatherPreset(newPreset);
            this.m_c_presetplan.setData(newPreset);
            if (
              this.m_c_presetplan.selectedLayer instanceof
              WeatherPresetPlanCloudLayerLineElement
            ) {
              if (
                typeof newPreset.tCloudLayers[
                  this.m_c_presetplan.selectedLayer.index
                ] == "undefined"
              ) {
                this.m_c_presetplan.selectedLayer.remove();
                this.m_c_presetplan.selectedLayer = null;
              } else {
                this.m_c_cloudLayerSettings.setData(
                  newPreset.tCloudLayers[
                    this.m_c_presetplan.selectedLayer.index
                  ],
                  newPreset.oConfig.dvMaxAltitude
                );
              }
            } else if (
              this.m_c_presetplan.selectedLayer instanceof
              WeatherPresetPlanWindLayerLineElement
            ) {
              if (
                typeof newPreset.tWindLayers[
                  this.m_c_presetplan.selectedLayer.index
                ] == "undefined"
              ) {
                this.m_c_presetplan.selectedLayer.remove();
                this.m_c_presetplan.selectedLayer = null;
              } else {
                if (!this.m_c_presetplan.selectedLayer.dragging) {
                  this.m_c_windLayerSettings.setConfig(newPreset.oConfig);
                  this.m_c_windLayerSettings.setData(
                    newPreset.tWindLayers[
                      this.m_c_presetplan.selectedLayer.index
                    ]
                  );
                }
              }
            }
            if (callback) callback();
            this.m_dispatch_timeout = null;
            if (this.m_w_pending_presets.length > 0) {
              this.m_w_pending_presets = [];
              this.dispatchNewPreset();
              return;
            }
          },
          (e) => {
            if (callback) callback();
            this.m_dispatch_timeout = null;
            console.warn(e);
          }
        );
      },
      forceRefresh ? 0 : 25
    );
  }
  generateNewPresetData() {
    let newWeatherPreset = new WeatherPresetData();
    newWeatherPreset.index = this.m_w_local_preset.index;
    newWeatherPreset.bIsRemovable = this.m_w_local_preset.bIsRemovable;
    newWeatherPreset.bIsValid = this.m_w_local_preset.bIsValid;
    newWeatherPreset.sPresetName = this.m_w_local_preset.sPresetName;
    newWeatherPreset.oSettings = this.m_w_local_preset.oSettings;
    newWeatherPreset.oConfig = this.m_w_local_preset.oConfig;
    newWeatherPreset.tCloudLayers = [];
    newWeatherPreset.tWindLayers = [];
    this.m_w_local_preset.tCloudLayers.forEach((c, i) => {
      if (i >= 3) return;
      newWeatherPreset.tCloudLayers[i] = new CloudLayer();
      newWeatherPreset.tCloudLayers[i].__Type = "CloudLayerData";
      newWeatherPreset.tCloudLayers[i].dvDensityMultiplier =
        c.dvDensityMultiplier;
      newWeatherPreset.tCloudLayers[i].dvCoverageRatio = c.dvCoverageRatio;
      newWeatherPreset.tCloudLayers[i].dvCloudScatteringRatio =
        c.dvCloudScatteringRatio;
      newWeatherPreset.tCloudLayers[i].dvAltitudeBot = c.dvAltitudeBot;
      newWeatherPreset.tCloudLayers[i].dvAltitudeTop = c.dvAltitudeTop;
    });
    this.m_w_local_preset.tWindLayers.forEach((w, i) => {
      newWeatherPreset.tWindLayers[i] = new WindLayer();
      newWeatherPreset.tWindLayers[i].__Type = "WindLayerData";
      newWeatherPreset.tWindLayers[i].dvAltitude = w.dvAltitude;
      newWeatherPreset.tWindLayers[i].dvAngleRad = w.dvAngleRad;
      newWeatherPreset.tWindLayers[i].dvSpeed = w.dvSpeed;
      newWeatherPreset.tWindLayers[i].gustWaveData = w.gustWaveData;
    });
    return newWeatherPreset;
  }
}
window.customElements.define("weather-edition-menu", WeatherEditionMenuElement);
checkAutoload();
//# sourceMappingURL=WeatherEditionMenu.js.map
