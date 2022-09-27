class ingameUiHeaderElement extends TemplateElement {
  constructor() {
    super();
    this.setStates = (
      minimized,
      collapsible,
      attached,
      forcedAttach,
      externalizable,
      active
    ) => {
      this._minimized = minimized;
      this._collapsible = collapsible;
      this._attached = attached;
      this._active = active;
      this._forcedAttach = forcedAttach;
      this._externalizable = externalizable;
      this.updateButtonsStatus();
    };
  }
  set title(val) {
    this.setTT(this.titleElement, val);
  }
  get title() {
    return this.getTT(this.titleElement);
  }
  set shortcut(val) {
    this.shortcutElem.innerHTML = val;
  }
  get templateID() {
    return "ingameUiHeader";
  }
  static get observedAttributes() {
    return super.observedAttributes.concat([
      "title",
      "externalizable",
      "shortcut",
    ]);
  }
  get canBeSelected() {
    return true;
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.parentElement.tagName != "INGAME-UI") {
      console.warn(
        "parent element is not ingame-io element (" +
          this.parentElement.tagName +
          ") found"
      );
    }
    this.shortcutElem = document.querySelector(".shortcut");
    this.titleElement = document.querySelector(".title");
    if (this.hasAttribute("title")) {
      this.title = this.getAttribute("title");
    }
    if (this.hasAttribute("shortcut")) {
      this.shortcut = this.getAttribute("shortcut");
    }
    if (!this._init) {
      this._init = true;
      this.addEventListener("dblclick", () => {
        if (this._collapsible) {
          this.parentElement.ToggleMinimized();
        }
      });
      this.HTMLbuttonReduce = this.querySelector(".Reduce");
      this.HTMLbuttonReduce.addEventListener("OnValidate", () => {
        this.parentElement.ToggleMinimized();
      });
      this.HTMLbuttonMaxim = this.querySelector(".Maximize");
      this.HTMLbuttonMaxim.addEventListener("OnValidate", () => {
        this.parentElement.ToggleMinimized();
      });
      //---------------------------------------------------------
      this.handle = () => {
        this.parentElement.closePanel();
        // null;
      };
      this.HTMLbuttonClose = this.querySelector(".Close");
      this.HTMLbuttonClose.addEventListener("OnValidate", this.handle);
      //   this.HTMLbuttonClose.addEventListener("OnValidate", () => {
      //     this.parentElement.closePanel();
      //   });
      //---------------------------------------------------------
      this.HTMLbuttonDetach = this.querySelector(".Detach");
      this.HTMLbuttonDetach.addEventListener("OnValidate", () => {
        this.parentElement.toggleDetachPanel();
      });
      this.HTMLbuttonExtern = this.querySelector(".Extern");
      this.HTMLbuttonExtern.addEventListener("OnValidate", () => {
        this.parentElement.toggleExternPanel();
      });
      this.headerButtonElement = this.querySelector(".wrap");
      this.headerButtonElement.classList.add(
        this.headerButtonElement.notHighlightableClassName
      );
    }
    this.setExternalizable(this.getAttribute("externalizable") == "true");
  }
  setMinimized(val) {
    this._minimized = val;
    this.updateButtonsStatus();
  }
  setCollapsible(val) {
    this._collapsible = val;
    this.updateButtonsStatus();
  }
  setAttached(val) {
    this._attached = val;
    this.updateButtonsStatus();
  }
  setForcedAttach(val) {
    this._forcedAttach = val;
    this.updateButtonsStatus();
  }
  setActive(val) {
    this._active = val;
    this.updateButtonsStatus();
  }
  setExternalizable(val) {
    this._externalizable = val;
    if (this.isConnected) {
      this.updateButtonsStatus();
    } else {
      this.setAttribute("externalizable", val.toString());
    }
  }
  setCloseable(val) {
    this._isPanelCloseable = val;
    this.updateButtonsStatus();
  }
  updateButtonsStatus() {
    if (this.HTMLbuttonExtern) {
      TemplateElement.call(this.HTMLbuttonExtern, () => {
        TemplateElement.call(this.HTMLbuttonReduce, () => {
          if (this.HTMLbuttonReduce)
            this.HTMLbuttonReduce.setVisible(
              this._active &&
                !this._attached &&
                this._collapsible &&
                !this._minimized
            );
        });
        TemplateElement.call(this.HTMLbuttonMaxim, () => {
          if (this.HTMLbuttonMaxim)
            this.HTMLbuttonMaxim.setVisible(
              this._active &&
                !this._attached &&
                this._collapsible &&
                this._minimized
            );
        });
        TemplateElement.call(this.HTMLbuttonExtern, () => {
          if (this.HTMLbuttonExtern)
            this.HTMLbuttonExtern.setVisible(
              this._active && !this._attached && this._externalizable
            );
        });
        TemplateElement.call(this.HTMLbuttonDetach, () => {
          if (this.HTMLbuttonDetach)
            this.HTMLbuttonDetach.setVisible(this._active && this._attached);
        });
        TemplateElement.call(this.HTMLbuttonClose, () => {
          if (this.HTMLbuttonClose)
            this.HTMLbuttonClose.setVisible(
              this._active && !this._attached && this._isPanelCloseable
            );
        });
      });
    }
  }
  setTT(elem, val) {
    if (elem) {
      elem.textContent = Coherent.translate(val);
    }
  }
  getTT(elem) {
    return elem.textContent;
  }
  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case "title":
        this.title = this.getAttribute("title");
        break;
      case "externalizable":
        if (newValue != oldValue) this.setExternalizable(newValue == "true");
        break;
      case "shortcut":
        this.shortcut = this.getAttribute("shortcut");
        break;
    }
  }
}
window.customElements.define("ingame-ui-header", ingameUiHeaderElement);
checkAutoload();
//# sourceMappingURL=ingameUiHeader.js.map
