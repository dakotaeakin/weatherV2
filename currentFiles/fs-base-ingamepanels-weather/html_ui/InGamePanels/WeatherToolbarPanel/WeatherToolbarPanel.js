class WeatherToolbarPanelElement extends UIElement {
    connectedCallback() {
        super.connectedCallback();
    }
}
window.customElements.define("weather-toolbar-panel", WeatherToolbarPanelElement);
checkAutoload();
if (EDITION_MODE()) {
    document.documentElement.style.backgroundColor = "teal";
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            document.querySelector('ingame-ui').classList.remove('panelInvisible');
            document.querySelector('ingame-ui').classList.add('attached');
        }, 200);
    });
}
//# sourceMappingURL=WeatherToolbarPanel.js.map