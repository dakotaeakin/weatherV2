class WeatherPresetPlanLayerSelectEvent extends Event {
  constructor(layerElement) {
    super("selectLayer");
    this.layerElement = layerElement;
  }
}
class WeatherPresetPlanLayerUnselectEvent extends Event {
  constructor() {
    super("unSelectLayer");
  }
}
class WeatherPresetPlanCloudLayerUpdateEvent extends Event {
  constructor(index, altitude, altitudeTop) {
    super("updateCloudLayer");
    this.index = index;
    this.altitude = altitude;
    this.altitudeTop = altitudeTop;
  }
}
class WeatherPresetPlanWindLayerUpdateEvent extends Event {
  constructor(index, altitude) {
    super("updateWindLayer");
    this.index = index;
    this.altitude = altitude;
  }
}
class WeatherPresetPlanLineElement extends ButtonElement {
  constructor(index, m_min_drawableAltitude, m_max_drawableAltitude) {
    super();
    this.m_draggable = false;
    this.m_selectable = false;
    this.m_altitude = DataValue.fromValueWithUnit(0, this.altitudeUnit);
    this.m_min_drawableAltitude = DataValue.fromValueWithUnit(
      0,
      this.altitudeUnit
    );
    this.m_max_drawableAltitude = DataValue.fromValueWithUnit(
      0,
      this.altitudeUnit
    );
    this.m_f_onMouseEnterCallback = null;
    this.m_f_onMouseLeaveCallback = null;
    this.select = () => {
      if (!this.m_selectable) return;
      if (this.selected) return;
      this.dispatchEvent(new WeatherPresetPlanLayerSelectEvent(this));
    };
    this.unselect = () => {
      if (!this.selected) return;
      this.dispatchEvent(new WeatherPresetPlanLayerUnselectEvent());
    };
    this.index = index;
    this.selected = false;
    if (m_min_drawableAltitude != null)
      this.m_min_drawableAltitude = m_min_drawableAltitude;
    if (m_max_drawableAltitude != null)
      this.m_max_drawableAltitude = m_max_drawableAltitude;
  }
  get tabIndex() {
    return Number(this.getAttribute("tabIndex"));
  }
  set tabIndex(value) {
    if (value != null) {
      this.setAttribute("tabIndex", value.toString());
    } else {
      this.removeAttribute("tabIndex");
    }
  }
  get defaultSoundType() {
    return "push";
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("OnValidate", this.select);
  }
  get posY() {
    return this.getPositionFromAltitude(this.m_altitude);
  }
  getPositionFromAltitude(altitude) {
    let x = altitude.value;
    let a = this.m_min_drawableAltitude.value;
    let b = this.m_max_drawableAltitude.value;
    if (x < a) x = a;
    if (x > b) x = b;
    let sqrtRange = new SqrtRange(a, b, b);
    let posSqrtYPercentage =
      ((sqrtRange.getInputValue(b) + sqrtRange.getInputValue(x) * -1) * 100) /
      (sqrtRange.getInputValue(b) - sqrtRange.getInputValue(a));
    return posSqrtYPercentage;
  }
  getAltitudeFromPosition(position) {
    let sqrtRange = new SqrtRange(
      this.m_min_drawableAltitude.value,
      this.m_max_drawableAltitude.value,
      this.m_max_drawableAltitude.value
    );
    position = 100 - position;
    let range = Math.abs(
      sqrtRange.getInputValue(this.m_max_drawableAltitude.value) -
        sqrtRange.getInputValue(this.m_min_drawableAltitude.value)
    );
    let altitude =
      sqrtRange.getInputValue(this.m_min_drawableAltitude.value) +
      (range / 100) * position;
    let sqrtAltitude = sqrtRange.getRealValue(altitude);
    if (sqrtAltitude < this.m_min_drawableAltitude.value)
      sqrtAltitude = this.m_min_drawableAltitude.value;
    if (sqrtAltitude > this.m_max_drawableAltitude.value)
      sqrtAltitude = this.m_max_drawableAltitude.value;
    return DataValue.fromValueWithUnit(sqrtAltitude, this.altitudeUnit);
  }
  get index() {
    return Number(this.getAttribute("index"));
  }
  set index(value) {
    this.setAttribute(
      "index",
      (value === null || value === void 0 ? void 0 : value.toString()) || ""
    );
  }
  get selected() {
    return this.classList.contains("selected");
  }
  set selected(value) {
    this.classList.toggle("selected", value);
    if (this instanceof WeatherPresetPlanCloudLayerLineElement) {
      if (this.m_tophandle)
        this.m_tophandle.classList.toggle("cloudLayerIsSelected", value);
      if (this.m_bothandle)
        this.m_bothandle.classList.toggle("cloudLayerIsSelected", value);
    }
  }
  get dragging() {
    return this.getAttribute("dragging") == "true";
  }
  set dragging(value) {
    this.setAttribute("dragging", value ? "true" : "false");
  }
  get draggingClientY() {
    return Number(this.getAttribute("draggingClientY"));
  }
  set draggingClientY(value) {
    this.setAttribute("draggingClientY", value.toString());
  }
  get draggingStartClientY() {
    return Number(this.getAttribute("draggingStartClientY"));
  }
  set draggingStartClientY(value) {
    this.setAttribute("draggingStartClientY", value.toString());
  }
  get draggingStartPosition() {
    return Number(this.getAttribute("draggingStartPosition"));
  }
  set draggingStartPosition(value) {
    this.setAttribute("draggingStartPosition", value.toString());
  }
  get minDrawableAltitude() {
    return this.m_min_drawableAltitude;
  }
  set minDrawableAltitude(value) {
    this.m_min_drawableAltitude = value;
  }
  get maxDrawableAltitude() {
    return this.m_max_drawableAltitude;
  }
  set maxDrawableAltitude(value) {
    this.m_max_drawableAltitude = value;
  }
  get altitudeUnit() {
    if (this.maxDrawableAltitude) return this.maxDrawableAltitude.unit;
    else return "";
  }
  render() {
    this.style.top = this.posY + "%";
  }
}
class WeatherPresetPlanAltitudeLineElement extends WeatherPresetPlanLineElement {
  constructor(index, m_min_drawableAltitude, m_max_drawableAltitude) {
    super(index, m_min_drawableAltitude, m_max_drawableAltitude);
    this.setData = (altitude) => {
      this.m_altitude = altitude;
      if (!this.isConnected) return;
      this.render();
    };
    this.updateName = (value) => {
      if (!this.isConnected) return;
      this.m_altitude_label.innerHTML = value;
    };
  }
  get templateID() {
    return "WeatherPresetPlanAltitudeLineTemplate";
  }
  get isBaseLine() {
    return this.m_isBaseLine;
  }
  set isBaseLine(value) {
    this.m_isBaseLine = value;
  }
  get isAMGL() {
    return this.m_isAMGL;
  }
  set isAMGL(value) {
    this.m_isAMGL = value;
  }
  connectedCallback() {
    super.connectedCallback();
    this.m_altitude_label = this.querySelector("label");
    this.m_line = this.querySelector(".separator");
    this.m_line.classList.toggle("hide", this.hideLine);
    this.m_altitude_label.classList.toggle("hide", this.hideLabel);
    if (this.m_altitude) this.setData(this.m_altitude);
  }
  get isDotted() {
    return this.classList.contains("dotted");
  }
  set isDotted(value) {
    this.classList.toggle("dotted", value);
  }
  get inverted() {
    return this.classList.contains("inverted");
  }
  set inverted(value) {
    this.classList.toggle("inverted", value);
  }
  get hideLine() {
    return this.hasAttribute("hide-line");
  }
  set hideLine(value) {
    if (value) {
      this.setAttribute("hide-line", "");
    } else {
      this.removeAttribute("hide-line");
    }
  }
  get hideLabel() {
    return this.hasAttribute("hide-label");
  }
  set hideLabel(value) {
    if (value) {
      this.setAttribute("hide-label", "");
    } else {
      this.removeAttribute("hide-label");
    }
  }
  static get observedAttributes() {
    return super.observedAttributes.concat(["hideLine", "hideLabel"]);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case "hideLine":
        this.m_line.classList.toggle("hide", this.hideLine);
        break;
      case "hideLabel":
        this.m_altitude_label.classList.toggle("hide", this.hideLabel);
        break;
    }
  }
  render() {
    super.render();
    if (this.m_altitude.value == 0) {
      this.m_altitude_label.innerHTML = this.m_altitude.name;
    } else {
      this.m_altitude_label.innerHTML =
        Math.round(this.m_altitude.value) +
        " <span>" +
        this.m_altitude.unit +
        "</span>";
    }
  }
}
window.customElements.define(
  "weather-preset-plan-altitude-line",
  WeatherPresetPlanAltitudeLineElement
);
class WeatherPresetPlanAltitudeHandleElement extends WeatherPresetPlanLineElement {
  constructor(index, m_min_drawableAltitude, m_max_drawableAltitude) {
    super(index, m_min_drawableAltitude, m_max_drawableAltitude);
    this.cloudLayer = null;
    this.setData = (altitude, applyOffset) => {
      this.m_altitude = altitude;
      this.m_applyOffset = applyOffset;
      if (!this.isConnected) return;
      this.render();
    };
    this.m_applyOffset = false;
    this.m_fisrtRender = true;
  }
  get templateID() {
    return "WeatherPresetPlanAltitudeHandleElement";
  }
  connectedCallback() {
    super.connectedCallback();
    this.m_altitude_label = this.querySelector("label");
    this.addEventListener("mousedown", this.onMouseDownCallback);
    this.addEventListener("mousemove", this.onMouseMoveCallback);
    this.addEventListener("mouseup", this.onMouseUpCallback);
    if (this.m_altitude) this.setData(this.m_altitude, this.m_applyOffset);
  }
  disconnectedCallback() {
    this.removeEventListener("mousedown", this.onMouseDownCallback);
    this.removeEventListener("mousemove", this.onMouseMoveCallback);
    this.removeEventListener("mouseup", this.onMouseUpCallback);
  }
  onMouseDownCallback(e) {
    if (!this.cloudLayer) return;
    this.cloudLayer.onMouseDownCallback(
      e,
      true,
      this.classList.contains("top") ? "top" : "bottom"
    );
  }
  onMouseMoveCallback(e) {
    if (!this.cloudLayer) return;
    this.cloudLayer.onMouseMoveCallback(
      e,
      true,
      this.classList.contains("top") ? "top" : "bottom"
    );
  }
  onMouseUpCallback(e) {
    if (!this.cloudLayer) return;
    this.cloudLayer.onMouseUpCallback(
      e,
      true,
      this.classList.contains("top") ? "top" : "bottom"
    );
  }
  render() {
    if (!this.cloudLayer) return;
    let pos = this.classList.contains("top")
      ? this.cloudLayer.posY2
      : 100 - this.cloudLayer.posY;
    if (this.m_applyOffset) {
      if (this.m_fisrtRender) {
        setTimeout(() => {
          this.style.top = `calc(${pos}% ${
            this.classList.contains("top") ? " - " : " + "
          } ${Utils.getSize(3)}px)`;
        }, 25);
      } else {
        this.style.top = `calc(${pos}% ${
          this.classList.contains("top") ? " - " : " + "
        } ${Utils.getSize(3)}px)`;
      }
    } else {
      this.style.top = `calc(${pos}% ${
        this.classList.contains("top") ? " - " : " + "
      } ${Utils.getSize(1)}px)`;
    }
    this.m_altitude_label.innerHTML =
      this.m_altitude.value.toFixed() +
      " <span> " +
      this.m_altitude.unit +
      "</span>";
  }
}
window.customElements.define(
  "weather-preset-plan-altitude-handle",
  WeatherPresetPlanAltitudeHandleElement
);
class WeatherPresetPlanWindLayerLineElement extends WeatherPresetPlanLineElement {
  constructor(index, m_min_drawableAltitude, m_max_drawableAltitude) {
    super(index, m_min_drawableAltitude, m_max_drawableAltitude);
    this.setData = (altitude) => {
      this.m_altitude = altitude;
      if (this.isConnected && !this.dragging) {
        this.render();
      }
    };
    this.dragTo = (clientY) => {
      clientY = clientY - this.parentElement.getBoundingClientRect().top;
      let relativeClientY =
        ((this.parentElement.getBoundingClientRect().height - clientY) /
          this.parentElement.getBoundingClientRect().height) *
        100;
      let relativeStartClientY =
        ((this.parentElement.getBoundingClientRect().height -
          this.draggingStartClientY) /
          this.parentElement.getBoundingClientRect().height) *
        100;
      let relative = relativeClientY - relativeStartClientY;
      let relativeFactor = Math.abs(relativeClientY - relativeStartClientY);
      let newTop;
      if (relative < 0) {
        newTop = this.draggingStartPosition + relativeFactor;
      } else if (relative > 0) {
        newTop = this.draggingStartPosition - relativeFactor;
      } else {
        return;
      }
      let altitudeBottomPosition = newTop;
      if (altitudeBottomPosition >= 100) altitudeBottomPosition = 100;
      if (altitudeBottomPosition <= 0) altitudeBottomPosition = 0;
      this.m_altitude = this.m_local_altitude = this.getAltitudeFromPosition(
        altitudeBottomPosition
      );
      this.render();
    };
    this.onHover = () => {
      super.onHover();
      this.classList.toggle("focus", true);
      this.classList.toggle("Dragging", true);
      Cursor.setCursor("CURSOR_GRAB");
    };
    this.onLeave = () => {
      if (this.dragging) return;
      super.onLeave();
      this.classList.toggle("focus", false);
      this.classList.toggle("Dragging", false);
      Cursor.unsetCursor();
    };
    this.onMouseMoveCallback = (e) => {
      if (this.dragging) {
        this.dragTo(e.clientY);
      }
    };
    this.onMouseDownCallback = (e) => {
      this.select();
      this.dragging = true;
      this.draggingStartPosition = this.posY;
      this.draggingStartClientY =
        e.clientY - this.parentElement.getBoundingClientRect().top;
      g_SoundMgr.PlaySound(SoundManager.SND_VALID, this.soundType);
    };
    this.onMouseUpCallback = (e) => {
      this.dragging = false;
      this.tabIndex = 1;
    };
    this.m_draggable = true;
    this.m_selectable = true;
    this.dragging = false;
  }
  get templateID() {
    return "WeatherPresetPlanWindLayerLineTempalate";
  }
  get altitude() {
    return this.m_local_altitude;
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.m_altitude) this.setData(this.m_altitude);
    this.addEventListener("mousedown", this.onMouseDownCallback);
  }
}
window.customElements.define(
  "weather-preset-plan-wind-line",
  WeatherPresetPlanWindLayerLineElement
);
class WeatherPresetPlanCloudLayerLineElement extends WeatherPresetPlanLineElement {
  constructor(
    index,
    m_min_drawableAltitude,
    m_max_drawableAltitude,
    m_min_cloud_height
  ) {
    super(index, m_min_drawableAltitude, m_max_drawableAltitude);
    this.setData = (altitudeBottom, altitudeTop) => {
      if (altitudeBottom.value < this.m_min_drawableAltitude.value)
        altitudeBottom.value = this.m_min_drawableAltitude.value;
      if (altitudeTop.value > this.m_max_drawableAltitude.value)
        altitudeTop.value = this.m_max_drawableAltitude.value;
      this.m_altitude = altitudeBottom;
      this.m_altitude_top = altitudeTop;
      this.m_local_altitude_bottom = this.m_altitude;
      this.m_local_altitude_top = this.m_altitude_top;
      if (this.isConnected && !this.dragging && !this.resizing) {
        this.render();
      }
    };
    this.m_temp_clientY = null;
    this.dragTo = (clientY) => {
      if (clientY == this.m_temp_clientY) return;
      this.m_temp_clientY = clientY;
      clientY = clientY - this.parentElement.getBoundingClientRect().top;
      let relativeClientY =
        ((this.parentElement.getBoundingClientRect().height - clientY) /
          this.parentElement.getBoundingClientRect().height) *
        100;
      let relativeStartClientY =
        ((this.parentElement.getBoundingClientRect().height -
          this.draggingStartClientY) /
          this.parentElement.getBoundingClientRect().height) *
        100;
      let relative = relativeClientY - relativeStartClientY;
      let relativeFactor = Math.abs(relativeClientY - relativeStartClientY);
      let newTopPosition;
      let newBottomPosition;
      if (relative < 0) {
        newTopPosition = this.draggingStartPosition2 + relativeFactor;
        newBottomPosition = this.draggingStartPosition - relativeFactor;
      } else if (relative > 0) {
        newTopPosition = this.draggingStartPosition2 - relativeFactor;
        newBottomPosition = this.draggingStartPosition + relativeFactor;
      } else {
        return;
      }
      let currentGap = Math.abs(this.posY2 - (100 - this.posY));
      if (newTopPosition <= 0) newTopPosition = 0;
      if (newTopPosition >= 100) newTopPosition = 100;
      if (newBottomPosition <= 0) newBottomPosition = 0;
      if (newBottomPosition >= 100) newBottomPosition = 100;
      let newGap = Math.abs(newTopPosition - (100 - newBottomPosition));
      if (newGap != currentGap) {
        if (newBottomPosition <= 0) {
          newTopPosition = newTopPosition - Math.abs(currentGap - newGap);
        } else if (newTopPosition <= 0) {
          newBottomPosition = newBottomPosition - Math.abs(currentGap - newGap);
        }
      }
      this.m_local_altitude_top = this.getAltitudeFromPosition(newTopPosition);
      this.m_local_altitude_bottom = this.getAltitudeFromPosition(
        100 - newBottomPosition
      );
      this.render();
    };
    this.resizeTo = (clientY) => {
      if (!this.isConnected) return;
      clientY = clientY - this.parentElement.getBoundingClientRect().top;
      let relativeClientY =
        ((this.parentElement.getBoundingClientRect().height - clientY) /
          this.parentElement.getBoundingClientRect().height) *
        100;
      let relativeStartClientY =
        ((this.parentElement.getBoundingClientRect().height -
          this.resizingStartClientY) /
          this.parentElement.getBoundingClientRect().height) *
        100;
      let factor = relativeClientY - relativeStartClientY;
      if (this.resizingAltitude == "top") {
        let newTopPosition = this.resizingStartPosition2 - factor;
        if (newTopPosition <= 0) newTopPosition = 0;
        if (newTopPosition >= 100) newTopPosition = 100;
        if (newTopPosition >= 100 - this.posY) newTopPosition = 100 - this.posY;
        let newTopAltitude = this.getAltitudeFromPosition(newTopPosition);
        if (
          Math.abs(newTopAltitude.value - this.m_local_altitude_bottom.value) <=
          this.m_min_cloud_height.value
        ) {
          let minimumNewTopAltitude = Object.assign(
            {},
            this.m_local_altitude_bottom
          );
          minimumNewTopAltitude.value =
            minimumNewTopAltitude.value + this.m_min_cloud_height.value;
          newTopPosition = this.getPositionFromAltitude(minimumNewTopAltitude);
        }
        this.m_local_altitude_top =
          this.getAltitudeFromPosition(newTopPosition);
        this.render();
      } else if (this.resizingAltitude == "bottom") {
        let newBottomPosition = this.resizingStartPosition + factor;
        if (newBottomPosition <= 0) newBottomPosition = 0;
        if (newBottomPosition >= 100) newBottomPosition = 100;
        if (newBottomPosition >= 100 - this.posY2)
          newBottomPosition = 100 - this.posY2;
        let newBottomAltitude = this.getAltitudeFromPosition(
          100 - newBottomPosition
        );
        if (
          Math.abs(newBottomAltitude.value - this.m_local_altitude_top.value) <=
          this.m_min_cloud_height.value
        ) {
          let minimumBottomAltitude = Object.assign(
            {},
            this.m_local_altitude_top
          );
          minimumBottomAltitude.value =
            minimumBottomAltitude.value - this.m_min_cloud_height.value;
          newBottomPosition =
            100 - this.getPositionFromAltitude(minimumBottomAltitude);
        }
        this.m_local_altitude_bottom = this.getAltitudeFromPosition(
          100 - newBottomPosition
        );
        this.render();
      }
    };
    this.m_fisrtRender = true;
    this.onMouseEnterCallback = () => {
      this.focus();
      this.classList.toggle("focus", true);
      this.classList.toggle("Dragging", true);
    };
    this.onMouseLeaveCallback = () => {
      if (this.dragging || this.resizing) return;
      this.blur();
      this.classList.toggle("focus", false);
      this.classList.toggle("Dragging", false);
      this.resizingAltitude = "";
      Cursor.unsetCursor();
    };
    this.onMouseMoveCursorCallback = (e) => {
      if (e.clientX == this.m_oldMouseX && e.clientY == this.m_oldMouseY)
        return;
      this.m_oldMouseX = e.clientX;
      this.m_oldMouseY = e.clientY;
      let BBOX = this.getBoundingClientRect();
      let distanceFromTop = Math.abs(BBOX.top - e.clientY);
      let distanceFromBottom = Math.abs(BBOX.bottom - e.clientY);
      let distanceFromRight = BBOX.right - e.clientX;
      let newCursor;
      if (!this.resizing && !this.dragging) {
        if (distanceFromTop <= BBOX.height * 0.2 && distanceFromRight >= 0) {
          newCursor = "RESIZE_V";
          this.resizingAltitude = "top";
        } else if (
          distanceFromBottom <= BBOX.height * 0.2 &&
          distanceFromRight >= 0
        ) {
          newCursor = "RESIZE_V";
          this.resizingAltitude = "bottom";
        } else {
          newCursor = "DRAG";
          this.resizingAltitude = "";
        }
      } else if (this.dragging) {
        newCursor = "DRAG";
      } else if (this.resizing) {
        newCursor = "RESIZE_V";
      } else {
        newCursor = "DRAG";
      }
      if (this.m_oldCursor != newCursor) {
        this.m_oldCursor = newCursor;
        Cursor.setCursor(newCursor);
      }
    };
    this.onMouseMoveCallback = (
      e,
      fromHandle = false,
      handlePosition = "top"
    ) => {
      if (this.resizing) {
        this.resizeTo(e.clientY);
      } else if (!this.resizing && !this.resizingAltitude && this.dragging) {
        this.dragTo(e.clientY);
      }
    };
    this.onMouseDownCallback = (
      e,
      fromHandle = false,
      handlePosition = "top"
    ) => {
      this.select();
      if (fromHandle) {
        this.resizingAltitude = handlePosition;
      }
      if (this.resizingAltitude) {
        if (this instanceof WeatherPresetPlanCloudLayerLineElement) {
          this.resizing = true;
          this.resizingStartPosition = this.posY;
          this.resizingStartPosition2 = this.posY2;
          this.resizingStartClientY =
            e.clientY - this.parentElement.getBoundingClientRect().top;
          if (this.resizingAltitude == "top")
            this.m_tophandle.classList.add("CloudLayerIsResizing");
          if (this.resizingAltitude == "bottom")
            this.m_bothandle.classList.add("CloudLayerIsResizing");
        }
      } else {
        this.dragging = true;
        if (this instanceof WeatherPresetPlanCloudLayerLineElement) {
          this.draggingStartPosition2 = this.posY2;
          this.draggingStartPosition = this.posY;
          this.m_tophandle.classList.add("CloudLayerIsDragging");
          this.m_bothandle.classList.add("CloudLayerIsDragging");
        }
        if (this instanceof WeatherPresetPlanCloudLayerLineElement) {
          this.draggingStartPosition = this.posY;
        }
        this.draggingStartClientY =
          e.clientY - this.parentElement.getBoundingClientRect().top;
      }
      g_SoundMgr.PlaySound(SoundManager.SND_VALID, this.soundType);
    };
    this.onMouseUpCallback = (
      e,
      fromHandle = false,
      handlePosition = "top"
    ) => {
      this.resizing = false;
      this.dragging = false;
      this.m_oldCursor = null;
      this.tabIndex = 1;
      if (this.m_tophandle && this.m_bothandle) {
        this.m_tophandle.classList.remove("CloudLayerIsResizing");
        this.m_bothandle.classList.remove("CloudLayerIsResizing");
        this.m_tophandle.classList.remove("CloudLayerIsDragging");
        this.m_bothandle.classList.remove("CloudLayerIsDragging");
      }
    };
    this.m_tophandle = null;
    this.m_bothandle = null;
    this.m_min_cloud_height = m_min_cloud_height;
    this.m_f_onMouseEnterCallback = this.onMouseEnterCallback;
    this.m_f_onMouseLeaveCallback = this.onMouseLeaveCallback;
    this.m_draggable = true;
    this.m_selectable = true;
    this.dragging = false;
    this.resizing = false;
  }
  get templateID() {
    return "WeatherPresetPlanCloudLayerLineTemplate";
  }
  get altitude() {
    return this.m_local_altitude_bottom;
  }
  get altitudeTop() {
    return this.m_local_altitude_top;
  }
  get minCloudHeight() {
    return this.m_min_cloud_height;
  }
  set minCloudHeight(value) {
    this.m_min_cloud_height = value;
  }
  get posY() {
    return 100 - super.posY;
  }
  get posY2() {
    return this.getPositionFromAltitude(this.m_altitude_top);
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.m_altitude && this.m_altitude_top)
      this.setData(this.m_altitude, this.m_altitude_top);
    this.addEventListener("mousemove", this.onMouseMoveCursorCallback);
    this.addEventListener("mousedown", this.onMouseDownCallback);
    this.addEventListener("mouseenter", this.m_f_onMouseEnterCallback);
    this.addEventListener("mouseleave", this.m_f_onMouseLeaveCallback);
  }
  get height() {
    return this.getHeightFromAltitude(this.m_altitude);
  }
  getHeightFromAltitude(altitude) {
    let sqrtRange = new SqrtRange(
      this.m_min_drawableAltitude.value,
      this.m_max_drawableAltitude.value,
      this.m_max_drawableAltitude.value
    );
    let range = Math.abs(
      this.m_max_drawableAltitude.value - this.m_min_drawableAltitude.value
    );
    let rangeInput = sqrtRange.getInputValue(range);
    let topValueSqrt = sqrtRange.getInputValue(this.m_altitude_top.value);
    let altitudeValueSqrt = sqrtRange.getInputValue(altitude.value);
    let heightPrecentage =
      (100 * (this.m_altitude_top.value - altitude.value)) / range;
    let heightSqrtPrecentage =
      (100 * (topValueSqrt - altitudeValueSqrt)) / rangeInput;
    return heightSqrtPrecentage;
  }
  get resizing() {
    return this.getAttribute("resizing") == "true";
  }
  set resizing(value) {
    this.setAttribute("resizing", value ? "true" : "false");
  }
  get resizingAltitude() {
    return this.getAttribute("resizingAltitude");
  }
  set resizingAltitude(value) {
    this.setAttribute("resizingAltitude", value);
  }
  get resizingStartClientY() {
    return Number(this.getAttribute("resizingStartClientY"));
  }
  set resizingStartClientY(value) {
    this.setAttribute("resizingStartClientY", value.toString());
  }
  get resizingStartPosition() {
    return Number(this.getAttribute("resizingStartPosition"));
  }
  set resizingStartPosition(value) {
    this.setAttribute("resizingStartPosition", value.toString());
  }
  get resizingStartPosition2() {
    return Number(this.getAttribute("resizingStartPosition2"));
  }
  set resizingStartPosition2(value) {
    this.setAttribute("resizingStartPosition2", value.toString());
  }
  get draggingStartPosition2() {
    return Number(this.getAttribute("draggingStartPosition2"));
  }
  set draggingStartPosition2(value) {
    this.setAttribute("draggingStartPosition2", value.toString());
  }
  render() {
    if (Math.abs(this.posY2 - (100 - this.posY)) <= 1.2) {
      if (this.m_fisrtRender) {
        setTimeout(() => {
          this.style.top = `calc(${this.posY2}% - ${Utils.getSize(3)}px)`;
        }, 25);
      } else {
        this.style.top = `calc(${this.posY2}% - ${Utils.getSize(3)}px)`;
      }
      this.classList.add("offset-applied");
    } else {
      this.style.top = `${this.posY2}%`;
      this.classList.remove("offset-applied");
    }
    this.style.bottom = `${this.posY}%`;
    if (this.m_fisrtRender) this.m_fisrtRender = false;
  }
  onHover() {
    super.onHover();
    if (this.m_tophandle && this.m_bothandle) {
      this.m_tophandle.classList.add("CloudLayerIsFocused");
      this.m_bothandle.classList.add("CloudLayerIsFocused");
    }
  }
  onLeave() {
    super.onLeave();
    if (this.m_tophandle && this.m_bothandle) {
      this.m_tophandle.classList.remove("CloudLayerIsFocused");
      this.m_bothandle.classList.remove("CloudLayerIsFocused");
    }
  }
}
window.customElements.define(
  "weather-preset-plan-cloud-line",
  WeatherPresetPlanCloudLayerLineElement
);
class WeatherPresetPlanElement extends TemplateElement {
  constructor() {
    super();
    this.m_altitude_lines = [];
    this.m_altitude_lines_labels = [];
    this.m_wind_layer_lines = [];
    this.m_cloud_layer_lines = [];
    this.m_altitude_handles = [];
    this.getData = () => {
      return this.m_data;
    };
    this.setData = (data, clean = false) => {
      if (this.m_data && clean) this.clean();
      this.m_data = data;
      if (this.m_cloud_layer_count >= UIWeatherConfig.I_MAX_CLOUD_LAYERS) {
        this.m_d_addCloudLayerButton.disable(true);
      } else {
        this.m_d_addCloudLayerButton.disable(false);
      }
      if (this.m_wind_layer_count >= UIWeatherConfig.I_MAX_WIND_LAYERS) {
        this.m_d_addWindLayerButton.disable(true);
      } else {
        this.m_d_addWindLayerButton.disable(false);
      }
      this.draw();
    };
    this.setSelectedLayer = (index, type) => {
      var layer;
      switch (type) {
        case "windLayer":
          layer = this.querySelector(
            'weather-preset-plan-wind-line[index="' + index + '"]'
          );
          break;
        case "cloudLayer":
          layer = this.querySelector(
            'weather-preset-plan-cloud-line[index="' + index + '"]'
          );
          break;
      }
      if (!layer) return;
      layer.select();
    };
    this.unSelectLayer = () => {
      if (!this.m_selectedLayer) return;
      this.m_selectedLayer.unselect();
    };
    this.updateMeanGroundLevelPosition = (value) => {
      TemplateElement.call(this, () => {
        TemplateElement.call(this.m_mean_ground_level_line, () => {
          this.m_mean_ground_level_line.setData(value);
          this.m_mean_ground_level_line.updateName(
            Utils.Translate("TT:MENU.WEATHER_PRESETS_AMGL")
          );
        });
      });
    };
    this.toogleActiveSettingButtonState = (value) => {
      this.m_d_settingsButtons.selected = value;
    };
    this.clean = () => {
      this.m_altitude_lines = [];
      this.m_altitude_lines_labels = [];
      this.m_cloud_layer_lines = [];
      this.m_wind_layer_lines = [];
      Utils.RemoveAllChildren(this.m_d_altitude_lines_wrapper);
      Utils.RemoveAllChildren(this.m_d_altitude_lines_labels_wrapper);
      Utils.RemoveAllChildren(this.m_d_wind_layer_lines_wrapper);
      Utils.RemoveAllChildren(this.m_d_cloud_layer_lines_wrapper);
    };
    this.draw = () => {
      if (!this.m_altitude_lines.length) this.drawAltitudeLines();
      if (!this.m_altitude_lines_labels.length) this.drawAltitudeLinesLabel();
      let zeroLineLabel = this.m_altitude_lines_labels.find(
        (l) => l.isBaseLine
      );
      if (zeroLineLabel) {
        zeroLineLabel.updateName(
          this.m_data.oSettings.bIsAltitudeAMGL
            ? Utils.Translate("TT:MENU.WEATHER_PRESETS_GROUND_LEVEL")
            : Utils.Translate("TT:MENU.WEATHER_PRESETS_SEA_LEVEL")
        );
      }
      this.m_mean_ground_level_line.setVisible(
        !this.m_data.oSettings.bIsAltitudeAMGL
      );
      this.drawWindLayerLine();
      this.drawCloudLayerLines();
      this.drawAltitudeHandles();
    };
    this.drawAltitudeLines = () => {
      this.m_data.oConfig.daDvAltitudeLines.forEach((line, index) => {
        let altitudeLineElement = new WeatherPresetPlanAltitudeLineElement(
          index,
          this.m_data.oConfig.dvMinAltitude,
          this.m_data.oConfig.dvMaxAltitude
        );
        if (line.value == 0)
          line.name = this.m_data.oSettings.bIsAltitudeAMGL
            ? Utils.Translate("TT:MENU.WEATHER_PRESETS_GROUND_LEVEL")
            : Utils.Translate("TT:MENU.WEATHER_PRESETS_SEA_LEVEL");
        altitudeLineElement.setData(line);
        altitudeLineElement.isBaseLine = line.value == 0;
        altitudeLineElement.hideLine = false;
        altitudeLineElement.hideLabel = true;
        this.m_d_altitude_lines_wrapper.appendChild(altitudeLineElement);
        this.m_altitude_lines.push(altitudeLineElement);
      });
    };
    this.drawAltitudeLinesLabel = () => {
      this.m_data.oConfig.daDvAltitudeLines.forEach((line, index) => {
        let altitudeLineElement = new WeatherPresetPlanAltitudeLineElement(
          index,
          this.m_data.oConfig.dvMinAltitude,
          this.m_data.oConfig.dvMaxAltitude
        );
        if (line.value == 0)
          line.name = this.m_data.oSettings.bIsAltitudeAMGL
            ? Utils.Translate("TT:MENU.WEATHER_PRESETS_GROUND_LEVEL")
            : Utils.Translate("TT:MENU.WEATHER_PRESETS_SEA_LEVEL");
        line.valueStr = line.value.toString();
        altitudeLineElement.setData(line);
        altitudeLineElement.isBaseLine = line.value == 0;
        altitudeLineElement.hideLine = true;
        altitudeLineElement.hideLabel = false;
        this.m_d_altitude_lines_labels_wrapper.appendChild(altitudeLineElement);
        this.m_altitude_lines_labels.push(altitudeLineElement);
      });
      this.m_mean_ground_level_line = new WeatherPresetPlanAltitudeLineElement(
        1000,
        this.m_data.oConfig.dvMinAltitude,
        this.m_data.oConfig.dvMaxAltitude
      );
      TemplateElement.call(this.m_mean_ground_level_line, () => {
        this.m_mean_ground_level_line.isAMGL = true;
        this.m_mean_ground_level_line.hideLine = false;
        this.m_mean_ground_level_line.hideLabel = false;
        this.m_mean_ground_level_line.isDotted = true;
        this.m_mean_ground_level_line.inverted = true;
      });
      this.m_d_altitude_lines_labels_wrapper.appendChild(
        this.m_mean_ground_level_line
      );
    };
    this.drawAltitudeHandles = () => {
      this.m_data.tCloudLayers.forEach((c, i) => {
        let cloudLayer = this.m_d_cloud_layer_lines_wrapper.querySelector(
          '[index="' + i + '"]'
        );
        let topHandle = this.m_altitude_handles_wrapper.querySelector(
          '[cloudLayerIndex="' + i + '"].top'
        );
        if (!topHandle) {
          topHandle = new WeatherPresetPlanAltitudeHandleElement(
            i,
            this.m_data.oConfig.dvMinAltitude,
            this.m_data.oConfig.dvMaxAltitude
          );
          topHandle.setAttribute("cloudLayerIndex", i.toString());
          topHandle.classList.add("top");
          topHandle.addEventListener(
            "mouseover",
            this.onHandleLayerMouseOver.bind(this, cloudLayer)
          );
          topHandle.addEventListener(
            "mouseout",
            this.onHandleLayerMouseOut.bind(this, cloudLayer)
          );
          this.m_altitude_handles_wrapper.appendChild(topHandle);
          this.m_altitude_handles.push(topHandle);
        }
        topHandle.index = i;
        topHandle.cloudLayer = cloudLayer;
        topHandle.minDrawableAltitude = this.m_data.oConfig.dvMinAltitude;
        topHandle.maxDrawableAltitude = this.m_data.oConfig.dvMaxAltitude;
        topHandle.setData(
          c.dvAltitudeTop,
          cloudLayer.classList.contains("offset-applied")
        );
        let bottomHandle = this.m_altitude_handles_wrapper.querySelector(
          '[cloudLayerIndex="' + i + '"].bottom'
        );
        if (!bottomHandle) {
          bottomHandle = new WeatherPresetPlanAltitudeHandleElement(
            i,
            this.m_data.oConfig.dvMinAltitude,
            this.m_data.oConfig.dvMaxAltitude
          );
          bottomHandle.setAttribute("cloudLayerIndex", i.toString());
          bottomHandle.classList.add("bottom");
          bottomHandle.addEventListener(
            "mouseover",
            this.onHandleLayerMouseOver.bind(this, cloudLayer)
          );
          bottomHandle.addEventListener(
            "mouseout",
            this.onHandleLayerMouseOut.bind(this, cloudLayer)
          );
          this.m_altitude_handles_wrapper.appendChild(bottomHandle);
          this.m_altitude_handles.push(bottomHandle);
        }
        bottomHandle.index = i;
        bottomHandle.cloudLayer = cloudLayer;
        bottomHandle.minDrawableAltitude = this.m_data.oConfig.dvMinAltitude;
        bottomHandle.maxDrawableAltitude = this.m_data.oConfig.dvMaxAltitude;
        bottomHandle.setData(c.dvAltitudeBot, false);
        cloudLayer.m_tophandle = topHandle;
        cloudLayer.m_bothandle = bottomHandle;
      });
    };
    this.drawCloudLayerLines = () => {
      this.m_data.tCloudLayers.forEach((c, i) => {
        let cloudLayerLineElement =
          this.m_d_cloud_layer_lines_wrapper.querySelector(
            'weather-preset-plan-cloud-line[index="' + i + '"]'
          );
        if (!cloudLayerLineElement) {
          cloudLayerLineElement = new WeatherPresetPlanCloudLayerLineElement(
            i,
            this.m_data.oConfig.dvMinAltitude,
            this.m_data.oConfig.dvMaxAltitude,
            this.m_data.oConfig.dvMinCloudHeight
          );
          cloudLayerLineElement.addEventListener("selectLayer", (e) =>
            this.onLayerClick(e)
          );
          cloudLayerLineElement.addEventListener("unSelectLayer", (e) =>
            this.onLayerUnselect(e)
          );
          cloudLayerLineElement.addEventListener("updateCloudLayer", (e) =>
            this.dispatchEvent(e)
          );
          this.m_d_cloud_layer_lines_wrapper.appendChild(cloudLayerLineElement);
          this.m_cloud_layer_lines.push(cloudLayerLineElement);
        }
        cloudLayerLineElement.minCloudHeight =
          this.m_data.oConfig.dvMinCloudHeight;
        cloudLayerLineElement.minDrawableAltitude =
          this.m_data.oConfig.dvMinAltitude;
        cloudLayerLineElement.maxDrawableAltitude =
          this.m_data.oConfig.dvMaxAltitude;
        cloudLayerLineElement.setData(c.dvAltitudeBot, c.dvAltitudeTop);
      });
    };
    this.drawWindLayerLine = () => {
      this.m_data.tWindLayers.forEach((w, i) => {
        let windLayerElement = this.m_d_wind_layer_lines_wrapper.querySelector(
          'weather-preset-plan-wind-line[index="' + i + '"]'
        );
        if (!windLayerElement) {
          windLayerElement = new WeatherPresetPlanWindLayerLineElement(
            i,
            this.m_data.oConfig.dvMinAltitude,
            this.m_data.oConfig.dvMaxAltitude
          );
          windLayerElement.addEventListener("selectLayer", (e) =>
            this.onLayerClick(e)
          );
          windLayerElement.addEventListener("updateWindLayer", (e) =>
            this.dispatchEvent(e)
          );
          this.m_d_wind_layer_lines_wrapper.appendChild(windLayerElement);
          this.m_wind_layer_lines.push(windLayerElement);
        }
        windLayerElement.maxDrawableAltitude =
          this.m_data.oConfig.dvMaxAltitude;
        windLayerElement.setData(
          DataValue.fromValueWithUnit(w.dvAltitude.value, w.dvAltitude.unit)
        );
      });
    };
    this.onMouseDownCallback = (e) => {};
    this.onMouseMoveCallback = (e) => {
      let target = this.querySelector('[dragging="true"],[resizing="true"]');
      if (!target) return;
      if (target.tagName == "WEATHER-PRESET-PLAN-CLOUD-LINE") {
        let cloudLayer = target;
        cloudLayer.onMouseMoveCallback(e);
        cloudLayer.tabIndex = 1;
        if (
          (cloudLayer.dragging || cloudLayer.resizing) &&
          cloudLayer.altitude &&
          cloudLayer.altitudeTop
        ) {
          let topHandle = this.m_altitude_handles.find(
            (handle) =>
              handle.classList.contains("top") &&
              handle.getAttribute("cloudLayerIndex") ==
                cloudLayer.index.toFixed()
          );
          let bottomHandle = this.m_altitude_handles.find(
            (handle) =>
              handle.classList.contains("bottom") &&
              handle.getAttribute("cloudLayerIndex") ==
                cloudLayer.index.toFixed()
          );
          topHandle.setData(
            cloudLayer.altitudeTop,
            cloudLayer.classList.contains("offset-applied")
          );
          bottomHandle.setData(cloudLayer.altitude, false);
          this.dispatchEvent(
            new WeatherPresetPlanCloudLayerUpdateEvent(
              cloudLayer.index,
              cloudLayer.altitude,
              cloudLayer.altitudeTop
            )
          );
        }
      } else if (target.tagName == "WEATHER-PRESET-PLAN-WIND-LINE") {
        let windLayer = target;
        windLayer.onMouseMoveCallback(e);
        windLayer.tabIndex = 1;
        if (windLayer.dragging && windLayer.altitude) {
          this.dispatchEvent(
            new WeatherPresetPlanWindLayerUpdateEvent(
              windLayer.index,
              windLayer.altitude
            )
          );
        }
      }
      let targets = this.querySelectorAll(
        '[dragging]:not([dragging="true"]):not([resizing="true"]), [resizing]:not([dragging="true"]):not([resizing="true"])'
      );
      targets.forEach((t, tIndex) => {
        if (t.tagName == "WEATHER-PRESET-PLAN-CLOUD-LINE") {
          let cloudLayer = t;
          cloudLayer.tabIndex = null;
        } else if (t.tagName == "WEATHER-PRESET-PLAN-WIND-LINE") {
          let cloudLayer = t;
          cloudLayer.tabIndex = null;
        }
      });
    };
    this.onMouseUpCallback = (e) => {
      let targets = this.querySelectorAll("[dragging],[resizing]");
      targets.forEach((t, tIndex) => {
        if (t.tagName == "WEATHER-PRESET-PLAN-CLOUD-LINE") {
          let cloudLayer = t;
          if (
            (cloudLayer.dragging || cloudLayer.resizing) &&
            cloudLayer.altitude &&
            cloudLayer.altitudeTop
          ) {
            let topHandle = this.m_altitude_handles.find(
              (handle) =>
                handle.classList.contains("top") &&
                handle.getAttribute("cloudLayerIndex") ==
                  cloudLayer.index.toFixed()
            );
            let bottomHandle = this.m_altitude_handles.find(
              (handle) =>
                handle.classList.contains("bottom") &&
                handle.getAttribute("cloudLayerIndex") ==
                  cloudLayer.index.toFixed()
            );
            this.dispatchEvent(
              new WeatherPresetPlanCloudLayerUpdateEvent(
                cloudLayer.index,
                cloudLayer.altitude,
                cloudLayer.altitudeTop
              )
            );
          }
          cloudLayer.onMouseUpCallback(e);
        } else if (t.tagName == "WEATHER-PRESET-PLAN-WIND-LINE") {
          let windLayer = t;
          if (windLayer.dragging && windLayer.altitude) {
            this.dispatchEvent(
              new WeatherPresetPlanWindLayerUpdateEvent(
                windLayer.index,
                windLayer.altitude
              )
            );
          }
          windLayer.onMouseUpCallback(e);
        }
      });
    };
    this.onAddCloudLayerButtonClick = (e) => {
      if (this.m_cloud_layer_count >= UIWeatherConfig.I_MAX_CLOUD_LAYERS)
        return;
      this.dispatchEvent(new CustomEvent("createCloudLayer"));
    };
    this.onAddWindLayerButtonClick = (e) => {
      if (this.m_wind_layer_count >= UIWeatherConfig.I_MAX_WIND_LAYERS) return;
      this.dispatchEvent(new CustomEvent("createWindLayer"));
    };
    this.onLayerClick = (event) => {
      if (this.m_selectedLayer) this.m_selectedLayer.selected = false;
      event.layerElement.selected = true;
      this.m_selectedLayer = event.layerElement;
      if (
        this.m_selectedLayer instanceof WeatherPresetPlanCloudLayerLineElement
      ) {
        let topHandle = this.m_altitude_handles.find(
          (handle) =>
            handle.classList.contains("top") &&
            handle.getAttribute("cloudLayerIndex") ==
              this.m_selectedLayer.index.toFixed()
        );
        let bottomHandle = this.m_altitude_handles.find(
          (handle) =>
            handle.classList.contains("bottom") &&
            handle.getAttribute("cloudLayerIndex") ==
              this.m_selectedLayer.index.toFixed()
        );
        topHandle.setData(
          this.m_selectedLayer.altitudeTop,
          this.m_selectedLayer.classList.contains("offset-applied")
        );
        bottomHandle.setData(this.m_selectedLayer.altitude, false);
      }
      this.dispatchEvent(
        new WeatherPresetPlanLayerSelectEvent(event.layerElement)
      );
    };
    this.onLayerUnselect = (event) => {
      if (!this.m_selectedLayer) return;
      this.m_selectedLayer.selected = false;
      this.m_selectedLayer = null;
      this.dispatchEvent(new WeatherPresetPlanLayerUnselectEvent());
    };
    this.onHandleLayerMouseOver = (cloudLayer, event) => {
      cloudLayer.classList.add("hoveringHandle");
      cloudLayer.m_tophandle.classList.add("focusingAnHandle");
      cloudLayer.m_bothandle.classList.add("focusingAnHandle");
    };
    this.onHandleLayerMouseOut = (cloudLayer, event) => {
      cloudLayer.classList.remove("hoveringHandle");
      cloudLayer.m_tophandle.classList.remove("focusingAnHandle");
      cloudLayer.m_bothandle.classList.remove("focusingAnHandle");
    };
    this.onSettingButtonClickCallback = (e) => {
      if (this.m_selectedLayer) {
        this.m_selectedLayer.selected = false;
        this.m_selectedLayer = null;
      }
      this.dispatchEvent(new CustomEvent("settingClick"));
    };
  }
  get templateID() {
    return "WeatherPresetPlanTemplate";
  }
  get selectedLayer() {
    return this.m_selectedLayer;
  }
  set selectedLayer(value) {
    this.m_selectedLayer = value;
  }
  connectedCallback() {
    super.connectedCallback();
    this.m_d_altitude_lines_wrapper = this.querySelector(
      ".plan .altitude-lines.lines"
    );
    this.m_d_altitude_lines_labels_wrapper = this.querySelector(
      ".plan .altitude-lines.labels"
    );
    this.m_d_wind_layer_lines_wrapper = this.querySelector(".plan .wind-lines");
    this.m_d_cloud_layer_lines_wrapper =
      this.querySelector(".plan .cloud-lines");
    this.m_d_addCloudLayerButton = this.querySelector(".add-cloud");
    this.m_d_addWindLayerButton = this.querySelector(".add-wind");
    this.m_d_settingsButtons = this.querySelector("new-push-button.settings");
    this.m_altitude_handles_wrapper = this.querySelector(".handle-lines");
    this.addEventListener("mousedown", this.onMouseDownCallback);
    this.addEventListener("mousemove", this.onMouseMoveCallback);
    this.addEventListener("mouseup", this.onMouseUpCallback);
    window.addEventListener("mouseup", this.onMouseUpCallback);
    this.m_d_settingsButtons.addEventListener(
      "OnValidate",
      this.onSettingButtonClickCallback
    );
    this.m_d_addCloudLayerButton.addEventListener(
      "OnValidate",
      this.onAddCloudLayerButtonClick
    );
    this.m_d_addWindLayerButton.addEventListener(
      "OnValidate",
      this.onAddWindLayerButtonClick
    );
  }
  getAllFocusableChildren() {
    let ret = [this.m_d_settingsButtons];
    let allLines = this.m_wind_layer_lines;
    allLines = allLines.concat(this.m_cloud_layer_lines);
    allLines = allLines.sort((a, b) => {
      return a.posY - b.posY;
    });
    ret = ret.concat(allLines);
    ret.push(this.m_d_addWindLayerButton);
    return ret;
  }
  get m_cloud_layer_count() {
    if (!this.m_data) return null;
    return this.m_data.tCloudLayers.length;
  }
  get m_wind_layer_count() {
    if (!this.m_data) return null;
    return this.m_data.tWindLayers.length;
  }
}
Include.addImports(["/templates/OptionsMenu/Range/Range.html"], () => {
  window.customElements.define("weather-preset-plan", WeatherPresetPlanElement);
});
checkAutoload();
//# sourceMappingURL=WeatherPresetPlan.js.map
