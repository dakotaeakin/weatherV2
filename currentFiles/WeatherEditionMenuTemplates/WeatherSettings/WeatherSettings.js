class WeatherSettingUpdateEvent extends Event {
  constructor(data, forceRefresh = false) {
    super("update");
    this.forceRefresh = false;
    this.data = data;
    this.forceRefresh = forceRefresh;
  }
}
class DatePickerEvent extends Event {
  constructor(data) {
    super("dateChanged", { bubbles: true });
    this.data = data;
  }
}
class DatePickerElement extends ButtonElement {
  constructor() {
    super(...arguments);
    this.m_startYear = 1990;
    this.m_endYear = 2100;
    this.m_monthsStrs = [
      "TT:TIME.JANUARY",
      "TT:TIME.FEBRUARY",
      "TT:TIME.MARCH",
      "TT:TIME.APRIL",
      "TT:TIME.MAY",
      "TT:TIME.JUNE",
      "TT:TIME.JULY",
      "TT:TIME.AUGUST",
      "TT:TIME.SEPTEMBER",
      "TT:TIME.OCTOBER",
      "TT:TIME.NOVEMBER",
      "TT:TIME.DECEMBER",
    ];
    this.onDayChanged = (e) => {
      this.m_currentDay = e.target.getCurrentValue();
      this.updateSelected();
      this.dispatchEvent(new DatePickerEvent(this._data));
    };
    this.onMonthChanged = (e) => {
      this.m_currentMonth = e.target.getCurrentValue();
      this.createDays();
      this.m_currentDay = this.m_dayWrapper
        .querySelector("#Days")
        .getCurrentValue();
      this.updateSelected();
      this.dispatchEvent(new DatePickerEvent(this._data));
    };
    this.onYearChange = (e) => {
      let currentYEar = e.target.value;
      this.m_currentYear = Number(currentYEar);
      this.createDays();
      this.updateSelected();
      this.dispatchEvent(new DatePickerEvent(this._data));
    };
    this.updateCursorModeOn = (e) => {
      this.interactive = false;
    };
    this.updateCursorModeOff = (e) => {
      this.interactive = true;
    };
  }
  get templateID() {
    return "WeatherDatePickerTemplate";
  }
  connectedCallback() {
    super.connectedCallback();
    this.m_dayWrapper = this.querySelector("#dayWrapper");
    Utils.RemoveAllChildren(this.m_dayWrapper);
    window.addEventListener(
      "updateExternal:cursorModeOn",
      this.updateCursorModeOn
    );
    window.addEventListener(
      "updateExternal:cursorModeOff",
      this.updateCursorModeOff
    );
  }
  disconnectedCallback() {
    window.removeEventListener(
      "updateExternal:cursorModeOn",
      this.updateCursorModeOn
    );
    window.removeEventListener(
      "updateExternal:cursorModeOff",
      this.updateCursorModeOff
    );
  }
  SetData(_data) {
    this.SetTimeData(_data.timeData);
  }
  GetTimeData() {
    return this._data;
  }
  SetTimeData(_data) {
    this._data = _data;
    this.m_currentYear = _data.year;
    this.m_currentMonth = _data.month - 1;
    this.m_currentDay = _data.dayInMonth - 1;
    this._data.dayInMonth = this.m_currentDay + 1;
    this._data.dayInMonthLocal = this._data.dayInMonth;
    this._data.month = this.m_currentMonth + 1;
    this._data.monthLocal = this._data.month;
    this._data.year = this.m_currentYear;
    this._data.yearLocal = this._data.year;
    this.createMonth(_data);
    this.createDays();
    this.createYear(_data);
    this.createDays();
    this.updateSelected();
  }
  CreateButton(_item) {
    var btn = window.document.createElement("new-list-button");
    this.FillButton(btn, _item);
    return btn;
  }
  getDefaultChildButton() {
    return this.m_months;
  }
  getKeyNavigationDirection() {
    return KeyNavigationDirection.KeyNavigation_Vertical;
  }
  getAllFocusableChildren() {
    return [this.m_months, this.m_days, this.m_years];
  }
  FillButton(btn, _data) {
    btn.id = _data.strId;
    btn.classList.add("listHeader");
    if (this.classList.contains("date-picker--inline")) {
      btn.classList.add("inList");
    }
    var data = new NewListButtonData();
    data.strId = _data.strId;
    data.sTitle = _data.sTitle;
    data.bLoop = true;
    data.iDefault = 0;
    data.daChoices = _data.daChoices;
    data.daMetadatas = _data.daMetadatas;
    btn.SetData(data);
  }
  createMonth(_data) {
    let id = "Month";
    if (this.m_months) {
      this.m_currentMonth = _data.monthLocal - 1;
      if (this.m_currentMonth != this.m_months.getCurrentValue())
        this.m_months.setCurrentValue(this.m_currentMonth);
    } else {
      let buttonData = new NewListButtonData();
      buttonData.strId = id;
      buttonData.daChoices = this.m_monthsStrs;
      buttonData.daMetadatas = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
      ];
      let button = this.CreateButton(buttonData);
      button.id = id;
      button.classList.add("linkedToLive");
      button.title = id;
      this.m_dayWrapper.appendChild(button);
      this.m_months = button;
      this.m_months.addEventListener("OnValidate", this.onMonthChanged);
    }
  }
  createYear(_data) {
    let id = "Year";
    if (this.m_years) {
      this.m_currentYear = _data.yearLocal;
      if (this.m_currentYear != Number(this.m_months.value))
        this.m_years.value = this.m_currentYear.toString();
    } else {
      let buttonData = new NewListButtonData();
      buttonData.strId = id;
      for (let i = this.m_startYear; i <= this.m_endYear; i++) {
        buttonData.daChoices.push(i.toString());
      }
      let button = this.CreateButton(buttonData);
      button.classList.add("linkedToLive");
      button.title = id;
      this.m_years = button;
      this.m_dayWrapper.appendChild(button);
      this.m_years.addEventListener("OnValidate", this.onYearChange);
    }
  }
  createDays() {
    let id = "Days";
    if (this.m_days) {
      this.m_currentDay = this._data.dayInMonthLocal - 1;
      let dayButtonData = new NewListButtonData();
      dayButtonData.strId = id;
      let nbDaysInMonth = new Date(
        this.m_currentYear,
        this.m_currentMonth + 1,
        0
      ).getDate();
      if (this.m_currentDay > nbDaysInMonth) {
        this.m_currentDay = nbDaysInMonth;
      }
      for (let i = 1; i <= nbDaysInMonth; i++) {
        dayButtonData.daChoices.push(i.toString());
      }
      dayButtonData.iDefault = this.m_currentDay;
      this.m_days.SetData(dayButtonData);
    } else {
      let dayButtonData = new NewListButtonData();
      dayButtonData.strId = id;
      let nbDaysInMonth = new Date(
        this.m_currentYear,
        this.m_currentMonth + 1,
        0
      ).getDate();
      if (this.m_currentDay > nbDaysInMonth) this.m_currentDay = nbDaysInMonth;
      for (let i = 1; i <= nbDaysInMonth; i++) {
        dayButtonData.daChoices.push(i.toString());
      }
      let dayButton = this.CreateButton(dayButtonData);
      dayButton.classList.add("linkedToLive");
      dayButton.title = id;
      this.m_dayWrapper.appendChild(dayButton);
      this.m_days = dayButton;
      this.m_days.addEventListener("OnValidate", this.onDayChanged);
      this.sendSizeUpdate();
    }
  }
  updateSelected() {
    this._data.dayInMonth = this.m_currentDay + 1;
    this._data.dayInMonthLocal = this._data.dayInMonth;
    this._data.month = this.m_currentMonth + 1;
    this._data.monthLocal = this._data.month;
    this._data.year = this.m_currentYear;
    this._data.yearLocal = this._data.year;
    this.m_months.setCurrentValue(this.m_currentMonth);
    this.m_years.setCurrentValue(this.m_currentYear - this.m_startYear);
    this.m_days.setCurrentValue(this.m_currentDay);
  }
  get year() {
    return this.m_currentYear;
  }
  get month() {
    return this.m_currentMonth;
  }
  get day() {
    return this.m_currentDay;
  }
  set year(year) {
    this.m_currentYear = year;
  }
  set month(month) {
    this.m_currentMonth = month;
  }
  set day(day) {
    this.m_currentDay = day;
  }
}
window.customElements.define("date-picker", DatePickerElement);
class GroundTemperatureValue extends DataValue {
  constructor(value) {
    super();
    this.toKelvin = () => {
      let origin = Number((this.value + 273.15).toFixed(2));
      let value = new GroundTemperatureValue();
      value.unit = "Kelvin";
      value.value = origin;
      value.valueStr = origin.toString();
      return value;
    };
    this.toCelcius = () => {
      let display = Number((this.value - 273.15).toFixed(2));
      let value = new GroundTemperatureValue();
      value.unit = "Celcius";
      value.value = display;
      value.valueStr = display.toString();
      return value;
    };
    this.toISA = () => {
      let isa = Number((this.value - 273.15 - 15).toFixed(2));
      let value = new ISAValue();
      value.unit = "ISA";
      value.value = isa;
      value.valueStr = isa.toString();
      return value;
    };
    if (value != null) this.value = Number(value.toFixed(2));
  }
}
class ISAValue extends DataValue {
  constructor(value) {
    super();
    if (value != null) this.value = Number(value.toFixed(2));
  }
  toCelcius() {
    let temp = Number((this.value + 15).toFixed(2));
    let value = new GroundTemperatureValue();
    value.unit = "Celcius";
    value.value = temp;
    value.valueStr = temp.toString();
    return value;
  }
}
class WeatherSettingElement extends TemplateElement {
  constructor() {
    super(...arguments);
    this.onInputGroundSnowDispatchUpdate = (e) => {
      this.m_data.dvSnowCover.value = e.value;
      this.dispatchEvent(new WeatherSettingUpdateEvent(this.m_data, e.isLast));
    };
    this.onInputPrecipitationDispatchUpdate = (e) => {
      this.m_data.dvPrecipitation.value = e.value;
      this.dispatchEvent(new WeatherSettingUpdateEvent(this.m_data, e.isLast));
    };
    this.onInputLighthningDispatchUpdate = (e) => {
      this.m_data.dvThunderstormRatio.value = e.value;
      this.dispatchEvent(new WeatherSettingUpdateEvent(this.m_data, e.isLast));
    };
    this.onInputPollutionDispatchUpdate = (e) => {
      this.m_data.dvPollution.value = e.value;
      this.dispatchEvent(new WeatherSettingUpdateEvent(this.m_data, e.isLast));
    };
    this.onInputGroundTempUpdate = (e) => {
      this.m_data.dvMSLGLTemperature.value = e.value;
      this.dispatchEvent(new WeatherSettingUpdateEvent(this.m_data, e.isLast));
    };
    this.onInputGroundPressDispatchUpdate = (e) => {
      this.m_data.dvMSLPressure.value = e.value;
      this.dispatchEvent(new WeatherSettingUpdateEvent(this.m_data, e.isLast));
    };
    this.onInputAerosolDensityDispatchUpdate = (e) => {
      this.m_data.dvHumidityMultiplier.value = e.value;
      this.dispatchEvent(new WeatherSettingUpdateEvent(this.m_data, e.isLast));
    };
    this.onAltitudeCalcultationModeChanged = (e) => {
      this.m_data.bIsAltitudeAMGL = JSON.parse(
        this.m_input_altitude_calculation_mode.metadata
      );
      this.dispatchEvent(new WeatherSettingUpdateEvent(this.m_data));
    };
  }
  get templateID() {
    return "WeatherSettingsTemplate";
  }
  connectedCallback() {
    super.connectedCallback();
    this.m_input_precipitations = this.querySelector(
      "inputable-range.precipitations"
    );
    this.m_input_precipitations.addEventListener(
      "update",
      this.onInputPrecipitationDispatchUpdate
    );
    this.m_input_ground_snow = this.querySelector("inputable-range.groundSnow");
    this.m_input_ground_snow.addEventListener(
      "update",
      this.onInputGroundSnowDispatchUpdate
    );
    this.m_input_lightning = this.querySelector("inputable-range.lightning");
    this.m_input_lightning.addEventListener(
      "update",
      this.onInputLighthningDispatchUpdate
    );
    this.m_input_pollution = this.querySelector("inputable-range.pollution");
    this.m_input_pollution.addEventListener(
      "update",
      this.onInputPollutionDispatchUpdate
    );
    this.m_input_groundTemp = this.querySelector("inputable-range.groundTemp");
    this.m_input_groundTemp.addEventListener(
      "update",
      this.onInputGroundTempUpdate
    );
    this.m_input_groundPress = this.querySelector(
      "inputable-range.groundPress"
    );
    this.m_input_groundPress.addEventListener(
      "update",
      this.onInputGroundPressDispatchUpdate
    );
    this.m_input_humidity = this.querySelector("inputable-range.humidity");
    this.m_input_humidity.addEventListener(
      "update",
      this.onInputAerosolDensityDispatchUpdate
    );
    this.m_input_altitude_calculation_mode = this.querySelector(
      "new-list-button.altitudeCalculation"
    );
    this.m_input_altitude_calculation_mode.addEventListener(
      "OnValidate",
      this.onAltitudeCalcultationModeChanged
    );
    this.querySelector("virtual-scroll").updateSizes();
  }
  setData(data) {
    this.m_data = data;
    //---------------------------------------------------------------------------
    console.log(this.m_data);
    //---------------------------------------------------------------------------
    this.m_input_precipitations.setFromRangeDataValue(
      this.m_data.dvPrecipitation
    );
    this.m_input_precipitations.dispatchOnInput = true;
    this.m_input_pollution.setFromRangeDataValue(this.m_data.dvPollution);
    this.m_input_pollution.dispatchOnInput = true;
    this.m_input_lightning.setFromRangeDataValue(
      this.m_data.dvThunderstormRatio
    );
    this.m_input_lightning.dispatchOnInput = true;
    this.m_input_groundTemp.setFromRangeDataValue(
      this.m_data.dvMSLGLTemperature
    );
    this.m_input_groundTemp.dispatchOnInput = true;
    this.m_input_groundPress.setFromRangeDataValue(this.m_data.dvMSLPressure);
    this.m_input_groundPress.dispatchOnInput = true;
    this.m_input_ground_snow.setFromRangeDataValue(this.m_data.dvSnowCover);
    this.m_input_ground_snow.dispatchOnInput = false;
    this.m_input_humidity.setFromRangeDataValue(
      this.m_data.dvHumidityMultiplier
    );
    this.m_input_humidity.dispatchOnInput = true;
    let listButtonData = new ListButtonData();
    listButtonData.sTitle = Coherent.translate(
      "TT:MENU.WEATHER_TOOLBAR_PANEL_SETTINGS_ALTITUDE_CALCULATION"
    );
    listButtonData.bDisabled = false;
    listButtonData.bLoop = true;
    listButtonData.daChoices = [
      Coherent.translate("TT:MENU.WEATHER_PRESETS_AMSL"),
      Coherent.translate("TT:MENU.WEATHER_PRESETS_AMGL"),
    ];
    listButtonData.daMetadatas = ["false", "true"];
    this.m_input_altitude_calculation_mode.SetData(listButtonData);
    if (this.m_data.bIsAltitudeAMGL) {
      this.m_input_altitude_calculation_mode.setCurrentValue(1);
    } else {
      this.m_input_altitude_calculation_mode.setCurrentValue(0);
    }
    this.m_input_humidity.sendSizeUpdate();
  }
}
window.customElements.define("weather-settings", WeatherSettingElement);
checkAutoload();
//# sourceMappingURL=WeatherSettings.js.map
