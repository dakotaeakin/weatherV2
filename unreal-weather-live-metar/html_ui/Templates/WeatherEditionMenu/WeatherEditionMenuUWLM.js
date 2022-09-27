//UPDATED 9/24/22 12:34PM MST

// Unreal Weather - Live METAR
// Version 1.7
// For MSFS 2020 version 1.18.13.0 or newer
//
// https://unrealweather.blogspot.com/
//
// *** WARNING ***
//
// Be very careful when making changes to this file.
// JavaScript code is easy to break, and misplaced quotes, commas, brackets, etc.
// will invalidate the whole file, which, in turn, will make your Flight Simulator inoperable.
// When in doubt, just restore this file from a backup and start over.
//
// If you decide to make any changes here,
// you will need to restart Flight Sumulator for the changes to take effect.
//

/*
Dakota's notes:
  To Do:
  See line 974
  Need to add weatherprestplan to init for cloud and wind
  Need to add oSettings object to be passed to this.m_c_settings
    How it works:
        This appears to work by getting updated weather from the API, formatting it to the 
        preset then spoofing the weather menu to reselect and therfore dispatch the new weather 
        as a preset.

        updateSnapshot updates config.menu which is then included in the call to dispatchNewPreset 
        which pushes weather to the sim.

        For debugging, the coherent debugger doesn't seem to work as there is no .pdb file present. 
        However you can use safari on an apple device, preferably a mac, and type the ip address of the 
        computer running msfs and port 19999, for example: 192.168.0.113:19999 and it will work as a
        full debugger for the ui including console.log from the ui JS.

    Reasons it doesn't work currently:
        The biggest reason this no longer works seems to be simply because the games WeatherEditionMenu.js 
        has been changed and this addon's WeatherEditionMenu is using some deprecated functions and/or 
        variables.
        
        Also identified issue with how InGamePanels are formatted. Will need to find out how to compile spb 
        in correct format in order to fix in game weather menu.

    How to fix it:
        -First, the class "WeatherEditionMenuElement" will need updated to match what is currently being 
        used in the sim.
        -Second, any additional issues can then be identified and solutioned.
        -Third, once the base fuunctionality of the addon is working. Refractor the code to improve 
        results if needed and also add hirstorical weather.

*/
var uwm = (() => {
  var poll,
    refreshWeather,
    successHandler,
    errorHandler,
    configErrorHandler,
    state_map,
    config,
    loadMetar,
    loadParsedMetar,
    initModule,
    run,
    stop,
    startPolling,
    isInitialized,
    diag,
    insertWeatherUwm;

  config = {
    metar_polling_frequency_minutes: null,
    menu: null,
  };

  state_map = {
    is_initialized: false,
    stop_polling: true,
    poll_timer: null,
  };

  startPolling = (weatherEditionMenu, m_c_settings, m_c_presetplan) => {
    setInterval(() => {
      console.log("working");
      insertWeatherUwm(weatherEditionMenu, m_c_settings, m_c_presetplan);
    }, 3000);
    console.log("worked once");
  };

  run = (weatherEditionMenu, m_c_settings, m_c_presetplan) => {
    state_map.stop_polling = false;
    console.log(state_map.stop_polling);
    try {
      startPolling(weatherEditionMenu, m_c_settings, m_c_presetplan);
    } catch (err) {
      console.log(err);
      diag(err.message);
      diag(JSON.stringify(err));
    }
  }; // run

  stop = () => {
    state_map.stop_polling = true;

    try {
      if (state_map.poll_timer) {
        state_map.stop_polling = true;
        clearInterval(state_map.poll_timer);
        state_map.poll_timer = null;
        diag("Polling stopped.");
      }

      uwm.snapshot_manager.reset();
      uwm.metar_panel.remove();
    } catch (err) {
      console.log(err);
      diag(err.message);
      diag(JSON.stringify(err));
    }
  }; // stop

  isInitialized = () => {
    return state_map.is_initialized;
  };

  initModule = (settings, weather_menu, settings_element, element) => {
    config.metar_polling_frequency_minutes =
      settings.metar_polling_frequency_minutes;
    config.menu = weather_menu;

    uwm.web_diag.initModule(settings.diagnostics_base_uri);
    uwm.metar_panel.initModule(
      "weather-settings-main",
      refreshWeather,
      uwm.web_diag.get
    );
    uwm.metar_parser.initModule(
      uwm.web_diag.get,
      settings.features.enable_snow_cover_from_precipitation
    );
    uwm.metar_provider.initModule(
      settings.metar_api_base_uri,
      settings.metar_api_key,
      settings.features.enable_cached_metar_reports,
      configErrorHandler
    );
    uwm.snapshot_manager.initModule(
      settings,
      weather_menu,
      settings_element,
      element,
      uwm.web_diag.get,
      uwm.metar_panel.setMetarData,
      uwm.metar_panel.setInfo
    );

    state_map.is_initialized = true;
    diag("Unreal Weather initialized.");

    return true;
  }; // initModule
  var ran = false;
  insertWeatherUwm = (weatherEditionMenu, m_c_settings, m_c_presetplan) => {
    weather_data = {
      __Type: "WeatherPresetData",
      tCloudLayers: [
        {
          __Type: "CloudLayerData",
          dvDensityMultiplier: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_DENSITY",
            valueStr: "",
            value: 1,
            type: "",
            unit: "",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 5,
            step: 0.009999999776482582,
            clamp_min: 0,
            clamp_max: 5,
            percent: 0,
          },
          dvCoverageRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "Coverage : Clear",
            valueStr: "",
            value: 0,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvCloudScatteringRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_SCATTER",
            valueStr: "",
            value: 0,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvAltitudeBot: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_BOT",
            valueStr: "",
            value: 8202.099737532808,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: -1640,
            clamp_max: 8202.099609375,
            percent: 0,
          },
          dvAltitudeTop: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_TOP",
            valueStr: "",
            value: 8202.099737532808,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: 8202.099609375,
            clamp_max: 60000,
            percent: 0,
          },
        },
        {
          __Type: "CloudLayerData",
          dvDensityMultiplier: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_DENSITY",
            valueStr: "",
            value: 1,
            type: "",
            unit: "",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 5,
            step: 0.009999999776482582,
            clamp_min: 0,
            clamp_max: 5,
            percent: 0,
          },
          dvCoverageRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "Coverage : Clear",
            valueStr: "",
            value: 0,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvCloudScatteringRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_SCATTER",
            valueStr: "",
            value: 0,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvAltitudeBot: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_BOT",
            valueStr: "",
            value: 22965.879265091862,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: -1640,
            clamp_max: 22965.87890625,
            percent: 0,
          },
          dvAltitudeTop: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_TOP",
            valueStr: "",
            value: 22965.879265091862,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: 22965.87890625,
            clamp_max: 60000,
            percent: 0,
          },
        },
        {
          __Type: "CloudLayerData",
          dvDensityMultiplier: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_DENSITY",
            valueStr: "",
            value: 1,
            type: "",
            unit: "",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 5,
            step: 0.009999999776482582,
            clamp_min: 0,
            clamp_max: 5,
            percent: 0,
          },
          dvCoverageRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "Coverage : Overcast",
            valueStr: "",
            value: 91,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvCloudScatteringRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_SCATTER",
            valueStr: "",
            value: 50,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvAltitudeBot: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_BOT",
            valueStr: "",
            value: 32808.39895013123,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: -1640,
            clamp_max: 33628.609375,
            percent: 0,
          },
          dvAltitudeTop: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_TOP",
            valueStr: "",
            value: 33628.60892388451,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: 32808.3984375,
            clamp_max: 60000,
            percent: 0,
          },
        },
      ],
      tWindLayers: [
        {
          __Type: "WindLayerData",
          gustWaveData: {
            __Type: "GustWaveData",
            dvAngleRad: {
              __Type: "RangeDataValue",
              ID: 0,
              icon: "",
              name: "TT:MENU.WEATHER_WIND_FROM",
              valueStr: "",
              value: 4.71238899230957,
              type: "",
              unit: "°",
              quality: 0,
              html: "",
              userTag: 0,
              min: 0,
              max: 6.2831854820251465,
              step: 0.01745329238474369,
              clamp_min: 0,
              clamp_max: 6.2831854820251465,
              percent: 0,
            },
            dvIntervalS: {
              __Type: "RangeDataValue",
              ID: 0,
              icon: "",
              name: "TT:MENU.WEATHER_TOOLBAR_PANEL_WIND_LAYER_SETTINGS_GUST_PER_MINUTE",
              valueStr: "",
              value: 35,
              type: "",
              unit: "",
              quality: 0,
              html: "",
              userTag: 0,
              min: 1,
              max: 18,
              step: 1,
              clamp_min: 1,
              clamp_max: 18,
              percent: 0,
            },
            dvSpeedMultiplier: {
              __Type: "RangeDataValue",
              ID: 0,
              icon: "",
              name: "TT:MENU.WEATHER_TOOLBAR_PANEL_WIND_LAYER_SETTINGS_SPEED",
              valueStr: "",
              value: 1,
              type: "",
              unit: "M/s",
              quality: 0,
              html: "",
              userTag: 0,
              min: 0,
              max: 2,
              step: 0.009999999776482582,
              clamp_min: 0,
              clamp_max: 2,
              percent: 0,
            },
          },
          dvAltitude: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "ALTITUDE",
            valueStr: "",
            value: 0,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: -1640,
            clamp_max: 60000,
            percent: 0,
          },
          dvAngleRad: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_WIND_FROM",
            valueStr: "",
            value: 4.71238899230957,
            type: "",
            unit: "°",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 6.2831854820251465,
            step: 0.01745329238474369,
            clamp_min: 0,
            clamp_max: 6.2831854820251465,
            percent: 0,
          },
          dvSpeed: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_WIND_LAYER_SETTINGS_SPEED",
            valueStr: "",
            value: 0.5144444704055786,
            type: "",
            unit: "M/s",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 77.16999816894531,
            step: 1,
            clamp_min: 0,
            clamp_max: 77.16999816894531,
            percent: 0,
          },
        },
      ],
      index: 2,
      bIsRemovable: false,
      bIsValid: true,
      sPresetName: "Unreal Weather - Live METAR",
      oSettings: {
        __Type: "WeatherPresetSettingData",
        dvPrecipitation: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "TT:MENU.WEATHER_TOOLBAR_PANEL_SETTINGS_PRECIPITATIONS",
          valueStr: "",
          value: 0,
          type: "",
          unit: "mm/h",
          quality: 0,
          html: "",
          userTag: 0,
          min: 0,
          max: 30,
          step: 0.10000000149011612,
          clamp_min: 0,
          clamp_max: 30,
          percent: 0,
        },
        dvMSLPressure: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "Pressure MSL",
          valueStr: "",
          value: 1013.25,
          type: "",
          unit: "hPa",
          quality: 0,
          html: "",
          userTag: 0,
          min: 948,
          max: 1084,
          step: 0.25,
          clamp_min: 948,
          clamp_max: 1084,
          percent: 0,
        },
        dvMSLGLTemperature: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "Temperature MSL / ISA + 10",
          valueStr: "",
          value: 30,
          type: "",
          unit: "°C",
          quality: 0,
          html: "",
          userTag: 0,
          min: -90,
          max: 60,
          step: 0.5,
          clamp_min: -90,
          clamp_max: 60,
          percent: 0,
        },
        dvPollution: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_POLLUTION",
          valueStr: "",
          value: 0,
          type: "",
          unit: "%",
          quality: 0,
          html: "",
          userTag: 0,
          min: 0,
          max: 100,
          step: 1,
          clamp_min: 0,
          clamp_max: 100,
          percent: 0,
        },
        dvSnowCover: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "TT:MENU.WEATHER_TOOLBAR_PANEL_SETTINGS_GROUND_SNOW",
          valueStr: "",
          value: 0,
          type: "",
          unit: "cm",
          quality: 0,
          html: "",
          userTag: 0,
          min: 0,
          max: 75,
          step: 1,
          clamp_min: 0,
          clamp_max: 75,
          percent: 0,
        },
        dvHumidityMultiplier: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "TT:MENU.WEATHER_TOOLBAR_PANEL_SETTINGS_HUMIDITY",
          valueStr: "",
          value: 1,
          type: "",
          unit: "",
          quality: 0,
          html: "",
          userTag: 0,
          min: 1,
          max: 20,
          step: 0.10000000149011612,
          clamp_min: 1,
          clamp_max: 20,
          percent: 0,
        },
        dvThunderstormRatio: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "Lightning",
          valueStr: "",
          value: 0,
          type: "",
          unit: "%",
          quality: 0,
          html: "",
          userTag: 0,
          min: 0,
          max: 100,
          step: 1,
          clamp_min: 0,
          clamp_max: 100,
          percent: 0,
        },
        bIsAltitudeAMGL: true,
      },
      oConfig: {
        __Type: "WeatherPresetConfigData",
        dvMinAltitude: {
          __Type: "DataValue",
          ID: 0,
          icon: "",
          name: "MINIMAL_ALTITUDE",
          valueStr: "",
          value: -1640,
          type: "",
          unit: "Ft",
          quality: 0,
          html: "",
          userTag: 0,
        },
        dvMaxAltitude: {
          __Type: "DataValue",
          ID: 0,
          icon: "",
          name: "MAXIMAL_ALTITUDE",
          valueStr: "",
          value: 60000,
          type: "",
          unit: "Ft",
          quality: 0,
          html: "",
          userTag: 0,
        },
        daDvAltitudeLines: [
          {
            __Type: "DataValue",
            ID: 0,
            icon: "",
            name: "Mean Ground Level",
            valueStr: "0",
            value: 0,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
          {
            __Type: "DataValue",
            ID: 1,
            icon: "",
            name: "ALTITUDE LINE",
            valueStr: "10000",
            value: 10000,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
          {
            __Type: "DataValue",
            ID: 2,
            icon: "",
            name: "ALTITUDE LINE",
            valueStr: "20000",
            value: 20000,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
          {
            __Type: "DataValue",
            ID: 3,
            icon: "",
            name: "ALTITUDE LINE",
            valueStr: "30000",
            value: 30000,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
          {
            __Type: "DataValue",
            ID: 4,
            icon: "",
            name: "ALTITUDE LINE",
            valueStr: "40000",
            value: 40000,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
          {
            __Type: "DataValue",
            ID: 5,
            icon: "",
            name: "ALTITUDE LINE",
            valueStr: "50000",
            value: 50000,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
        ],
        dvMinCloudHeight: {
          __Type: "DataValue",
          ID: 0,
          icon: "",
          name: "MIN_CLOUD_HEIGHT",
          valueStr: "",
          value: 0,
          type: "",
          unit: "Ft",
          quality: 0,
          html: "",
          userTag: 0,
        },
        dvMaxWindSpeed: {
          __Type: "DataValue",
          ID: 0,
          icon: "",
          name: "MAXIMAL_WIND_SPEED",
          valueStr: "",
          value: 77.16999498155383,
          type: "",
          unit: "Km/h",
          quality: 0,
          html: "",
          userTag: 0,
        },
        fMaxGustSpeedRatio: 2,
        fMinGustSpeedRatio: 0.5,
      },
    };

    weather_data_run = {
      __Type: "WeatherPresetData",
      tCloudLayers: [
        {
          __Type: "CloudLayerData",
          dvDensityMultiplier: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_DENSITY",
            valueStr: "",
            value: 1,
            type: "",
            unit: "",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 5,
            step: 0.009999999776482582,
            clamp_min: 0,
            clamp_max: 5,
            percent: 0,
          },
          dvCoverageRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "Coverage : Clear",
            valueStr: "",
            value: 0,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvCloudScatteringRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_SCATTER",
            valueStr: "",
            value: 0,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvAltitudeBot: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_BOT",
            valueStr: "",
            value: 8202.099737532808,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: -1640,
            clamp_max: 8202.099609375,
            percent: 0,
          },
          dvAltitudeTop: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_TOP",
            valueStr: "",
            value: 8202.099737532808,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: 8202.099609375,
            clamp_max: 60000,
            percent: 0,
          },
        },
        {
          __Type: "CloudLayerData",
          dvDensityMultiplier: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_DENSITY",
            valueStr: "",
            value: 1,
            type: "",
            unit: "",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 5,
            step: 0.009999999776482582,
            clamp_min: 0,
            clamp_max: 5,
            percent: 0,
          },
          dvCoverageRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "Coverage : Clear",
            valueStr: "",
            value: 0,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvCloudScatteringRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_SCATTER",
            valueStr: "",
            value: 0,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvAltitudeBot: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_BOT",
            valueStr: "",
            value: 22965.879265091862,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: -1640,
            clamp_max: 22965.87890625,
            percent: 0,
          },
          dvAltitudeTop: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_TOP",
            valueStr: "",
            value: 22965.879265091862,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: 22965.87890625,
            clamp_max: 60000,
            percent: 0,
          },
        },
        {
          __Type: "CloudLayerData",
          dvDensityMultiplier: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_DENSITY",
            valueStr: "",
            value: 1,
            type: "",
            unit: "",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 5,
            step: 0.009999999776482582,
            clamp_min: 0,
            clamp_max: 5,
            percent: 0,
          },
          dvCoverageRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "Coverage : Overcast",
            valueStr: "",
            value: 91,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvCloudScatteringRatio: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_SCATTER",
            valueStr: "",
            value: 50,
            type: "",
            unit: "%",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 100,
            step: 1,
            clamp_min: 0,
            clamp_max: 100,
            percent: 0,
          },
          dvAltitudeBot: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_BOT",
            valueStr: "",
            value: 32808.39895013123,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: -1640,
            clamp_max: 33628.609375,
            percent: 0,
          },
          dvAltitudeTop: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_TOP",
            valueStr: "",
            value: 33628.60892388451,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: 32808.3984375,
            clamp_max: 60000,
            percent: 0,
          },
        },
      ],
      tWindLayers: [
        {
          __Type: "WindLayerData",
          gustWaveData: {
            __Type: "GustWaveData",
            dvAngleRad: {
              __Type: "RangeDataValue",
              ID: 0,
              icon: "",
              name: "TT:MENU.WEATHER_WIND_FROM",
              valueStr: "",
              value: 4.71238899230957,
              type: "",
              unit: "°",
              quality: 0,
              html: "",
              userTag: 0,
              min: 0,
              max: 6.2831854820251465,
              step: 0.01745329238474369,
              clamp_min: 0,
              clamp_max: 6.2831854820251465,
              percent: 0,
            },
            dvIntervalS: {
              __Type: "RangeDataValue",
              ID: 0,
              icon: "",
              name: "TT:MENU.WEATHER_TOOLBAR_PANEL_WIND_LAYER_SETTINGS_GUST_PER_MINUTE",
              valueStr: "",
              value: 35,
              type: "",
              unit: "",
              quality: 0,
              html: "",
              userTag: 0,
              min: 1,
              max: 18,
              step: 1,
              clamp_min: 1,
              clamp_max: 18,
              percent: 0,
            },
            dvSpeedMultiplier: {
              __Type: "RangeDataValue",
              ID: 0,
              icon: "",
              name: "TT:MENU.WEATHER_TOOLBAR_PANEL_WIND_LAYER_SETTINGS_SPEED",
              valueStr: "",
              value: 1,
              type: "",
              unit: "M/s",
              quality: 0,
              html: "",
              userTag: 0,
              min: 0,
              max: 2,
              step: 0.009999999776482582,
              clamp_min: 0,
              clamp_max: 2,
              percent: 0,
            },
          },
          dvAltitude: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "ALTITUDE",
            valueStr: "",
            value: 0,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
            min: -1640,
            max: 60000,
            step: 10,
            clamp_min: -1640,
            clamp_max: 60000,
            percent: 0,
          },
          dvAngleRad: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_WIND_FROM",
            valueStr: "",
            value: 4.71238899230957,
            type: "",
            unit: "°",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 6.2831854820251465,
            step: 0.01745329238474369,
            clamp_min: 0,
            clamp_max: 6.2831854820251465,
            percent: 0,
          },
          dvSpeed: {
            __Type: "RangeDataValue",
            ID: 0,
            icon: "",
            name: "TT:MENU.WEATHER_TOOLBAR_PANEL_WIND_LAYER_SETTINGS_SPEED",
            valueStr: "",
            value: 0.5144444704055786,
            type: "",
            unit: "M/s",
            quality: 0,
            html: "",
            userTag: 0,
            min: 0,
            max: 77.16999816894531,
            step: 1,
            clamp_min: 0,
            clamp_max: 77.16999816894531,
            percent: 0,
          },
        },
      ],
      index: 2,
      bIsRemovable: false,
      bIsValid: true,
      sPresetName: "Unreal Weather - Live METAR",
      oSettings: {
        __Type: "WeatherPresetSettingData",
        dvPrecipitation: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "TT:MENU.WEATHER_TOOLBAR_PANEL_SETTINGS_PRECIPITATIONS",
          valueStr: "",
          value: 0,
          type: "",
          unit: "mm/h",
          quality: 0,
          html: "",
          userTag: 0,
          min: 0,
          max: 30,
          step: 0.10000000149011612,
          clamp_min: 0,
          clamp_max: 30,
          percent: 0,
        },
        dvMSLPressure: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "Pressure MSL",
          valueStr: "",
          value: 1013.25,
          type: "",
          unit: "hPa",
          quality: 0,
          html: "",
          userTag: 0,
          min: 948,
          max: 1084,
          step: 0.25,
          clamp_min: 948,
          clamp_max: 1084,
          percent: 0,
        },
        dvMSLGLTemperature: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "Temperature MSL / ISA + 10",
          valueStr: "",
          value: 20,
          type: "",
          unit: "°C",
          quality: 0,
          html: "",
          userTag: 0,
          min: -90,
          max: 60,
          step: 0.5,
          clamp_min: -90,
          clamp_max: 60,
          percent: 0,
        },
        dvPollution: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "TT:MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_POLLUTION",
          valueStr: "",
          value: 0,
          type: "",
          unit: "%",
          quality: 0,
          html: "",
          userTag: 0,
          min: 0,
          max: 100,
          step: 1,
          clamp_min: 0,
          clamp_max: 100,
          percent: 0,
        },
        dvSnowCover: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "TT:MENU.WEATHER_TOOLBAR_PANEL_SETTINGS_GROUND_SNOW",
          valueStr: "",
          value: 0,
          type: "",
          unit: "cm",
          quality: 0,
          html: "",
          userTag: 0,
          min: 0,
          max: 75,
          step: 1,
          clamp_min: 0,
          clamp_max: 75,
          percent: 0,
        },
        dvHumidityMultiplier: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "TT:MENU.WEATHER_TOOLBAR_PANEL_SETTINGS_HUMIDITY",
          valueStr: "",
          value: 1,
          type: "",
          unit: "",
          quality: 0,
          html: "",
          userTag: 0,
          min: 1,
          max: 20,
          step: 0.10000000149011612,
          clamp_min: 1,
          clamp_max: 20,
          percent: 0,
        },
        dvThunderstormRatio: {
          __Type: "RangeDataValue",
          ID: 0,
          icon: "",
          name: "Lightning",
          valueStr: "",
          value: 0,
          type: "",
          unit: "%",
          quality: 0,
          html: "",
          userTag: 0,
          min: 0,
          max: 100,
          step: 1,
          clamp_min: 0,
          clamp_max: 100,
          percent: 0,
        },
        bIsAltitudeAMGL: true,
      },
      oConfig: {
        __Type: "WeatherPresetConfigData",
        dvMinAltitude: {
          __Type: "DataValue",
          ID: 0,
          icon: "",
          name: "MINIMAL_ALTITUDE",
          valueStr: "",
          value: -1640,
          type: "",
          unit: "Ft",
          quality: 0,
          html: "",
          userTag: 0,
        },
        dvMaxAltitude: {
          __Type: "DataValue",
          ID: 0,
          icon: "",
          name: "MAXIMAL_ALTITUDE",
          valueStr: "",
          value: 60000,
          type: "",
          unit: "Ft",
          quality: 0,
          html: "",
          userTag: 0,
        },
        daDvAltitudeLines: [
          {
            __Type: "DataValue",
            ID: 0,
            icon: "",
            name: "Mean Ground Level",
            valueStr: "0",
            value: 0,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
          {
            __Type: "DataValue",
            ID: 1,
            icon: "",
            name: "ALTITUDE LINE",
            valueStr: "10000",
            value: 10000,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
          {
            __Type: "DataValue",
            ID: 2,
            icon: "",
            name: "ALTITUDE LINE",
            valueStr: "20000",
            value: 20000,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
          {
            __Type: "DataValue",
            ID: 3,
            icon: "",
            name: "ALTITUDE LINE",
            valueStr: "30000",
            value: 30000,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
          {
            __Type: "DataValue",
            ID: 4,
            icon: "",
            name: "ALTITUDE LINE",
            valueStr: "40000",
            value: 40000,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
          {
            __Type: "DataValue",
            ID: 5,
            icon: "",
            name: "ALTITUDE LINE",
            valueStr: "50000",
            value: 50000,
            type: "",
            unit: "Ft",
            quality: 0,
            html: "",
            userTag: 0,
          },
        ],
        dvMinCloudHeight: {
          __Type: "DataValue",
          ID: 0,
          icon: "",
          name: "MIN_CLOUD_HEIGHT",
          valueStr: "",
          value: 0,
          type: "",
          unit: "Ft",
          quality: 0,
          html: "",
          userTag: 0,
        },
        dvMaxWindSpeed: {
          __Type: "DataValue",
          ID: 0,
          icon: "",
          name: "MAXIMAL_WIND_SPEED",
          valueStr: "",
          value: 77.16999498155383,
          type: "",
          unit: "Km/h",
          quality: 0,
          html: "",
          userTag: 0,
        },
        fMaxGustSpeedRatio: 2,
        fMinGustSpeedRatio: 0.5,
      },
    };
    console.log(ran);
    const success = () => console.log("yep");
    const fail = () => console.log("nope");
    if (ran) {
      m_c_settings.setData(weather_data.oSettings);
      m_c_presetplan.setData(weather_data, true);
      weatherEditionMenu.m_weather_listener.updateTempWeatherPreset(
        weather_data,
        success,
        fail
      );
      ran = ran !== true;
    } else {
      m_c_settings.setData(weather_data_run.oSettings);
      m_c_presetplan.setData(weather_data_run, true);
      weatherEditionMenu.m_weather_listener.updateTempWeatherPreset(
        weather_data_run,
        success,
        fail
      );
      ran = ran !== true;
    }

    // weatherEditionMenu.setData(weather_data);
  }; //InsertWeatherUwm
  return {
    initModule: initModule,
    run: run,
    stop: stop,
    isInitialized: isInitialized,
    insertWeatherUwm: insertWeatherUwm,
  };
})(); // uwm
//---
console.log("yeah baby");
//---
//////////////////////////////////
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
      console.log(weatherPreset);
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
      //--------------------------------
      if (typeof SimVar !== "undefined" && SimVar) {
        if (
          // typeof UnrealWeatherSettings !== "undefined" &&
          // UnrealWeatherSettings &&
          // typeof uwm !== "undefined" &&
          // uwm
          true
        ) {
          if (
            this.m_w_local_preset.sPresetName === "Unreal Weather - Live METAR"
          ) {
            // if (true) {
            //   uwm.insertWeatherUwm(
            //     this,
            //     this.m_c_settings,
            //     this.m_c_presetplan
            //   );
            //   // uwmInjected = true;
            // }
            this.uiHeader = document.querySelector("ingame-ui-header"); //Needs to be added to run call so it can be stopped
            this.closeButton = this.uiHeader.querySelector(".Close");
            this.closeButton.removeEventListener(
              //Add this eventListner back in when uwm is stopped
              "OnValidate",
              this.uiHeader.handle
            );
            uwm.run(this, this.m_c_settings, this.m_c_presetplan);
          }
          // else {
          //   if (true) {
          //     uwm.stop(); //Not working!
          //   }
          // }
        }
      }
      //--------------------------------
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
            console.log(newPreset);
            console.log(data);
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
