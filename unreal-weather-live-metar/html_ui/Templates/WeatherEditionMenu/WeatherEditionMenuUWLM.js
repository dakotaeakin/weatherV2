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
const UnrealWeatherSettings = {
  //
  // Insert your METAR API key between the quotes below:
  //
  metar_api_key: "SXGKdGWRj-EVYKYIJsQkJgLk5uL0gUjFEFYI9mZWZZY", //Sample only, active token should be replaced locally
  metar_api_base_uri: "https://avwx.rest/api/",
  diagnostics_base_uri: "",
  metar_polling_frequency_minutes: 3,
  weather_transition_span_seconds: 160,
  weather_transition_step_seconds: 0.5, // <-- Going below 0.1 sec is not recommended

  //
  // If you want to enable/disable certain features, set the corresponding flag(s) in this section:
  //  1 - feature is enabled
  //  0 - feature is disabled
  //
  features: {
    //------------------
    enable_humidity: 1,
    enable_pollution: 1,
    //------------------
    enable_temperature: 1,
    enable_precipitation: 1,
    enable_aerosol_density: 0, // <-- Handles fog, mist, smoke, dust, haze, sand, etc. May cause serious stutter during transitions.
    enable_aerosol_density_instant_change: 0,
    enable_pressure: 1,
    enable_snow_cover: 1,
    enable_snow_cover_from_precipitation: 1,
    enable_lightning: 1,
    enable_clouds: 1,
    enable_wind: 1,
    enable_high_elevation_wind: 1,
    enable_cached_metar_reports: 1,
  },
};

// console.log(UnrealWeatherSettings.metar_api_key);

const MathExt = {
  clamp: (val, min, max) => {
    return Math.min(Math.max(min, val), max);
  },
  lerp: (start, end, t) => {
    return start + (end - start) * t;
  },
  lerpAngle: (start, end, t) => {
    return (
      (start +
        (((((end - start + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
          (2 * Math.PI)) -
          Math.PI) *
          t +
        2 * Math.PI) %
      (2 * Math.PI)
    );
  },
  lerpAngleDeg: (start, end, t) => {
    return (
      (start + (((((end - start + 180) % 360) + 360) % 360) - 180) * t + 360) %
      360
    );
  },
  random2: (start, end) => {
    return start + (end - start) * Math.random();
  },
  angleDiff: (start, end) => {
    return (
      ((((end - start + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
        (2 * Math.PI)) -
      Math.PI
    );
  },
  angleDiffDeg: (start, end) => {
    return ((((end - start + 180) % 360) + 360) % 360) - 180;
  },
  normAngleDeg: (angle) => {
    angle = angle % 360;
    return angle < 0 ? angle + 360 : angle;
  },
};

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
    diag;

  config = {
    metar_polling_frequency_minutes: null,
    menu: null,
  };

  state_map = {
    is_initialized: false,
    stop_polling: true,
    poll_timer: null,
  };

  successHandler = (data) => {
    var metar;
    console.log("data", data);

    try {
      metar = JSON.parse(data);
      diag(metar["raw"]);
      uwm.snapshot_manager.applyMetar(metar);
    } catch (err) {
      console.log(err);
      diag(err.message);
      diag(JSON.stringify(err));
    }
  }; // successHandler

  errorHandler = (status, status_text, data) => {
    if (status === 400) {
      diag("HTTP " + status + " " + status_text + ", " + data);
      uwm.metar_panel.setInfo(
        "HTTP " + status + " " + status_text + ", " + data,
        true
      );
    } else if (status === 401 || status === 403) {
      diag("HTTP " + status + " " + status_text + ", " + data);
      uwm.metar_panel.setInfo("HTTP " + status + " Invalid API token?", true);
    } else {
      diag("HTTP " + status + " " + status_text);
      uwm.metar_panel.setInfo("HTTP " + status + " " + status_text, true);
    }
  }; // errorHandler

  configErrorHandler = (message) => {
    uwm.metar_panel.setInfo(message, true);
  }; // configErrorHandler

  refreshWeather = () => {
    uwm.snapshot_manager.refreshWeather();
  }; // refreshWeather

  poll = () => {
    if (state_map.stop_polling) {
      return;
    }

    if (!state_map.poll_timer) {
      state_map.poll_timer = setInterval(() => {
        poll();
      }, config.metar_polling_frequency_minutes * 60 * 1000);
      diag("Polling started. (" + String(state_map.poll_timer) + ")");
    }

    setTimeout(() => {
      if (typeof SimVar !== "undefined" && SimVar) {
        const latitude = SimVar.GetSimVarValue(
          "PLANE LATITUDE",
          "degree latitude"
        );
        const longitude = SimVar.GetSimVarValue(
          "PLANE LONGITUDE",
          "degree longitude"
        );

        const loc = String(latitude) + "," + String(longitude);
        diag("pos: " + loc);

        if (
          latitude != null &&
          longitude != null &&
          !isNaN(latitude) &&
          !isNaN(longitude) &&
          (Math.abs(latitude) > 0.05 || Math.abs(longitude) > 0.05)
        ) {
          uwm.metar_provider.loadMetar(loc, successHandler, errorHandler);
        }
      }
    }, 25);
  }; // poll

  startPolling = () => {
    if (state_map.poll_timer) {
      clearInterval(state_map.poll_timer);
      state_map.poll_timer = null;
      diag("Polling stopped, restarting . . .");
    }

    state_map.stop_polling = false;
    setTimeout(() => {
      poll();
    }, 3000);

    diag("Initial poll");
  };

  run = () => {
    diag("run()");

    try {
      startPolling();
    } catch (err) {
      console.log(err);
      diag(err.message);
      diag(JSON.stringify(err));
    }
  }; // run

  stop = () => {
    diag("stop()");

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

  loadMetar = (loc, onSuccess, onError) => {
    return uwm.metar_provider.loadMetar(loc, onSuccess, onError);
  };

  loadParsedMetar = (loc, onSuccess, onError) => {
    return uwm.metar_provider.loadParsedMetar(loc, onSuccess, onError);
  };

  isInitialized = () => {
    return state_map.is_initialized;
  };

  diag = (s) => {
    uwm.web_diag.get(s);
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

  return {
    initModule: initModule,
    run: run,
    stop: stop,
    loadMetar: loadMetar,
    loadParsedMetar: loadParsedMetar,
    isInitialized: isInitialized,
    diag: diag,
  };
})(); // uwm

uwm.metar_provider = (() => {
  var loadMetar,
    loadParsedMetar,
    initModule,
    config = {
      metar_api_base_uri: null,
      metar_api_key: null,
      enable_cached_metar_reports: true,
    };
  loadMetar = (loc, onSuccess = null, onError = null) => {
    if (!config.metar_api_base_uri || !config.metar_api_key) return;

    const url =
      config.metar_api_base_uri +
      "metar/" +
      encodeURI(loc) +
      "?options=info&airport=false&reporting=true&format=json&onfail=" +
      (config.enable_cached_metar_reports ? "cache" : "error");
    const xhttp = new XMLHttpRequest();
    xhttp.open("GET", url, true);
    xhttp.setRequestHeader("Authorization", config.metar_api_key);

    xhttp.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          if (onSuccess) {
            console.log(this.response);
            onSuccess(this.responseText);
          }
        } else {
          if (onError) {
            onError(this.status, this.statusText, this.responseText);
          }
        }
      }
    };

    xhttp.send();
  };

  loadParsedMetar = (metar, onSuccess = null, onError = null) => {
    if (!config.metar_api_base_uri || !config.metar_api_key) return;

    const url =
      config.metar_api_base_uri + "parse/metar?options=info&airport=true";
    const xhttp = new XMLHttpRequest();
    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Authorization", config.metar_api_key);

    xhttp.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          if (onSuccess) {
            onSuccess(this.responseText);
          }
        } else {
          if (onError) {
            onError(this.status, this.statusText, this.responseText);
          }
        }
      }
    };

    xhttp.send(metar);
  };

  initModule = (
    metar_api_base_uri,
    metar_api_key,
    enable_cached_metar_reports,
    configErrorHandler
  ) => {
    if (!metar_api_base_uri) {
      if (configErrorHandler) {
        configErrorHandler("Missing API base URI; check settings.");
      }
      return;
    }
    if (!metar_api_key || metar_api_key.length < 40) {
      if (configErrorHandler) {
        configErrorHandler("Missing API token; check settings.");
      }
      return;
    }

    config.metar_api_base_uri = metar_api_base_uri;
    config.metar_api_key = metar_api_key;
    config.enable_cached_metar_reports = enable_cached_metar_reports;
  };

  return {
    loadMetar: loadMetar,
    loadParsedMetar: loadParsedMetar,
    initModule: initModule,
  };
})(); // uwm.metar_provider

uwm.metar_parser = (() => {
  var diag, config, parseMetar, initModule;

  config = {
    diagCallback: null,
    enable_snow_cover_from_precipitation: null,
  };

  diag = (s) => {
    if (config.diagCallback) config.diagCallback(s);
  };

  parseMetar = (metar) => {
    var weather_info, tmp, tmp2;

    weather_info = {
      fHumidity: 1,
      fPollution: 0,
      fPressurePa: 101325.0, // Pa
      fTemperatureC: 15.0, // 15C
      fAerosolDensity: 1.0, // m
      fPrecipitation: 0.0, // mm/h
      fSnowCoverM: 0.0, // m
      fThunderstormIntensity: 0.0, // 0-1
      weatherCodes: [],
      cloudLayers: [],
      windDirectionDeg: 270.0,
      windDirectionVaries: false,
      windSpeedKts: 0.0,
      windGustSpeedKts: 0.0,

      station: metar["station"],
      stationName: metar["info"] ? metar["info"]["name"] : "",
      elevationFt: metar["info"] ? metar["info"]["elevation_ft"] : null,
      city: metar["info"]
        ? metar["info"]["city"]
          ? metar["info"]["city"]
          : ""
        : "",
      country: metar["info"]
        ? metar["info"]["country"]
          ? metar["info"]["country"]
          : ""
        : "",
      time: metar["time"]["dt"],
      raw: metar["raw"],
    };

    if (
      metar["units"] &&
      metar["temperature"] &&
      metar["temperature"] === "F"
    ) {
      weather_info.fTemperatureC =
        ((parseFloat(metar["temperature"]["value"]) - 32.0) * 5) / 9;
    } else {
      // Assume C
      weather_info.fTemperatureC = parseFloat(metar["temperature"]["value"]);
    }

    if (
      metar["info"] &&
      metar["info"]["elevation_ft"] &&
      !isNaN(metar["info"]["elevation_ft"])
    ) {
      weather_info.fTemperatureC +=
        parseInt(metar["info"]["elevation_ft"]) * 0.00198;
    }

    if (metar["wx_codes"]) {
      metar["wx_codes"].forEach((code) => {
        weather_info.weatherCodes.push(code["value"]);
      });
    }

    weather_info.weatherCodes.forEach((code) => {
      if (code) {
        code = code.toLowerCase();

        if (code.indexOf("showers") >= 0) {
          weather_info.fPrecipitation = MathExt.random2(0.5, 2.0);
        }

        if (
          code.indexOf("rain") >= 0 ||
          code.indexOf("drizzle") >= 0 ||
          code.indexOf("thunderstorm") >= 0 ||
          code.indexOf("snow") >= 0 ||
          code.indexOf("hail") >= 0
        ) {
          weather_info.fPrecipitation = MathExt.random2(4.0, 6.5);

          if (code.indexOf("light") >= 0) {
            weather_info.fPrecipitation = MathExt.random2(2.0, 3.5);
          }

          if (code.indexOf("heavy") >= 0) {
            weather_info.fPrecipitation = MathExt.random2(7.5, 9.9);
          }

          if (
            code.indexOf("snow") >= 0 &&
            config.enable_snow_cover_from_precipitation
          ) {
            if (code.indexOf("light") >= 0) {
              weather_info.fSnowCoverM = MathExt.random2(0.2, 0.3);
            } else if (code.indexOf("heavy") >= 0) {
              weather_info.fSnowCoverM = MathExt.random2(0.7, 1.0);
            } else {
              weather_info.fSnowCoverM = MathExt.random2(0.4, 0.6);
            }
          }
        }

        if (code.indexOf("thunderstorm") >= 0) {
          weather_info.fThunderstormIntensity =
            weather_info.fPrecipitation * 0.04;
        }

        if (code.indexOf("mist") >= 0) {
          weather_info.fAerosolDensity = MathExt.random2(1.0, 4.0);
        }

        if (
          code.indexOf("fog") >= 0 ||
          code.indexOf("smoke") >= 0 || // incl. sandstorm
          code.indexOf("dust") >= 0 || // incl. duststorm
          code.indexOf("sand") >= 0 ||
          code.indexOf("haze") >= 0 ||
          code.indexOf("spray") >= 0 ||
          code.indexOf("ash") >= 0
        ) {
          weather_info.fAerosolDensity = MathExt.random2(7.0, 19.0);
        }
      }
    });

    if (metar["remarks"]) {
      if (metar["remarks"].indexOf("FG") >= 0) {
        weather_info.fAerosolDensity = MathExt.random2(7.0, 19.0);
      }
      if (metar["remarks"].indexOf("FU") >= 0) {
        weather_info.fAerosolDensity = MathExt.random2(7.0, 19.0);
      }
      if (metar["remarks"].indexOf("VA") >= 0) {
        weather_info.fAerosolDensity = MathExt.random2(7.0, 19.0);
      }
      if (metar["remarks"].indexOf("DU") >= 0) {
        weather_info.fAerosolDensity = MathExt.random2(7.0, 19.0);
      }
      if (metar["remarks"].indexOf("SA") >= 0) {
        weather_info.fAerosolDensity = MathExt.random2(7.0, 19.0);
      }
      if (metar["remarks"].indexOf("HZ") >= 0) {
        weather_info.fAerosolDensity = MathExt.random2(7.0, 19.0);
      }
      if (metar["remarks"].indexOf("PY") >= 0) {
        weather_info.fAerosolDensity = MathExt.random2(7.0, 19.0);
      }
    }

    tmp = metar["raw"].match(/\bA([0-9]{4})\b/);
    if (tmp) {
      weather_info.fPressurePa = parseInt(tmp[0].substr(1, 4)) * 33.863886667;
      diag("AltP: " + weather_info.fPressurePa);
    } else {
      tmp = metar["raw"].match(/\bQ([0-9]{4})\b/);
      if (tmp) {
        weather_info.fPressurePa = parseInt(tmp[0].substr(1, 4)) * 100;
        diag("Q: " + weather_info.fPressurePa);
      } else {
        tmp = metar["raw"].match(/\bSLP([0-9]{3})\b/);
        if (tmp) {
          tmp2 = parseInt(tmp[0].substr(3, 3));
          if (tmp2 < 870) {
            weather_info.fPressurePa = parseInt(
              "10" + tmp[0].substr(3, 3) + "0"
            );
          } else {
            weather_info.fPressurePa = parseInt(tmp[0].substr(3, 3) + "00");
          }

          diag("SLP: " + weather_info.fPressurePa);
        }
      }
    }

    if (metar["remarks"]) {
      tmp = metar["remarks"].match(/\bSOG\b/);
      if (tmp) {
        weather_info.fSnowCoverM = MathExt.random2(0.3, 1.0);
      }

      tmp = metar["remarks"].match(/\SNINCR\b/);
      if (tmp) {
        weather_info.fSnowCoverM = MathExt.random2(0.3, 1.0);
      }

      tmp = metar["remarks"].match(/\b4\/([0-9]{3})\b/);
      if (tmp) {
        weather_info.fSnowCoverM = parseInt(tmp[0].substr(2, 3)) * 0.0254;
      }
    }

    if (metar["clouds"]) {
      for (var i = 0; i < metar["clouds"].length; ++i) {
        if (
          metar["clouds"][i]["altitude"] !== null &&
          !isNaN(metar["clouds"][i]["altitude"])
        ) {
          // ///
          let cloudLayer = {
            type: metar["clouds"][i]["type"],
            altitude: parseInt(metar["clouds"][i]["altitude"]) * 100,
            towering:
              metar["clouds"][i]["modifier"] &&
              ["ACC", "ACSL", "CB", "CBMAM", "CCSL", "SCSL", "TCU"].includes(
                metar["clouds"][i]["modifier"]
              ),
          };
          weather_info.cloudLayers.push(cloudLayer);
        }
      }
    }

    if (metar["wind_direction"]) {
      if (metar["wind_direction"]["value"] !== null) {
        if (!isNaN(metar["wind_direction"]["value"])) {
          weather_info.windDirectionDeg = MathExt.normAngleDeg(
            parseInt(metar["wind_direction"]["value"])
          );
        }
      } else if (metar["wind_direction"]["repr"] === "VRB") {
        weather_info.windDirectionDeg = parseInt(MathExt.random2(0, 359.999));
        weather_info.windDirectionVaries = true;
      }

      tmp = null;
      tmp2 = 0;

      if (
        metar["wind_gust"] &&
        metar["wind_gust"]["value"] !== null &&
        !isNaN(metar["wind_gust"]["value"])
      ) {
        tmp2 = parseInt(metar["wind_gust"]["value"]);
      }

      if (metar["units"]) {
        tmp = metar["units"]["wind_speed"];
      }

      if (tmp && tmp === "m/s") {
        weather_info.windSpeedKts =
          1.94384 * parseInt(metar["wind_speed"]["value"]);
        weather_info.windGustSpeedKts = 1.94384 * tmp2;
      } else {
        weather_info.windSpeedKts = parseInt(metar["wind_speed"]["value"]);
        weather_info.windGustSpeedKts = tmp2;
      }
    }
    return weather_info;
  }; // parseMetar

  initModule = (diagCallback, enable_snow_cover_from_precipitation) => {
    config.diagCallback = diagCallback;
    config.enable_snow_cover_from_precipitation =
      enable_snow_cover_from_precipitation;
  }; // initModule

  return {
    parseMetar: parseMetar,
    initModule: initModule,
  };
})(); // uwm.metar_parser

uwm.snapshot_manager = (() => {
  var generateBlankSnapshot,
    generateSnapshot,
    interpolateSnapshots,
    diag,
    createMap,
    align,
    applySnapshot,
    applyTransition,
    applyMetar,
    refreshWeather,
    reset,
    initModule,
    config,
    state_map;

  config = {
    features: {
      //-----------------------
      enable_pollution: null,
      enable_humidity: null,
      //------------------------
      enable_temperature: null,
      enable_precipitation: null,
      enable_aerosol_density: null,
      enable_aerosol_density_instant_change: null,
      enable_pressure: null,
      enable_snow_cover: null,
      enable_snow_cover_from_precipitation: null,
      enable_lightning: null,
      enable_clouds: null,
      enable_wind: null,
      enable_high_elevation_wind: null,
    },
    weather_transition_span_seconds: null,
    weather_transition_step_seconds: null,
    diagCallback: null,
    setDataCallback: null,
    setInfoCallback: null,
    menu: null,
    settings_element: null,
    final_data: {},
    element: null,
  };

  state_map = {
    current_metar: null,
    current_raw_metar: null,
    current_snapshot: null,
    in_transition: false,
    stop_transition: false,
  };

  diag = (s) => {
    if (config.diagCallback) config.diagCallback(s);
  };

  generateBlankSnapshot = (wind_layers) => {
    var i;

    snapshot = {
      //-----------------------------
      __Type: "WeatherPresetData",

      fGroundTemperature: {
        //Upadted to match new required values in sim. Vars will need updated to call [key].value
        ID: 0,
        __Type: "RangeDataValue",
        clamp_max: 60,
        clamp_min: -90,
        html: "",
        icon: "",
        max: 60,
        min: -90,
        name: "Temperature MSL / ISA + 10",
        percent: 0,
        quality: 0,
        step: 0.5,
        type: "",
        unit: "°C",
        userTag: 0,
        value: 15,
        valueStr: "",
      },
      fGroundPressure: {
        ID: 0,
        __Type: "RangeDataValue",
        clamp_max: 32.01062774658203,
        clamp_min: 27.994535446166992,
        html: "",
        icon: "",
        max: 32.01062774658203,
        min: 27.994535446166992,
        name: "Pressure MSL",
        percent: 0,
        quality: 0,
        step: 0.007372525131106377,
        type: "",
        unit: "inHg",
        userTag: 0,
        value: 29.921373825,
        valueStr: "",
      },
      fPrecipitation: {
        ID: 0,
        __Type: "RangeDataValue",
        clamp_max: 30,
        clamp_min: 0,
        html: "",
        icon: "",
        max: 30,
        min: 0,
        name: "TT.MENU.WEATHER_TOOLBAR_PANEL_SETTINGS_PRECIPITATIONS",
        percent: 0,
        quality: 0,
        step: 0.10000000149011612,
        type: "",
        unit: "mm/h",
        userTag: 0,
        value: 0,
        valueStr: "",
      },
      fPollution: {
        ID: 0,
        __Type: "RangeDataValue",
        clamp_max: 100,
        clamp_min: 0,
        html: "",
        icon: "",
        max: 100,
        min: 0,
        name: "TT.MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_POLLUTION",
        percent: 0,
        quality: 0,
        step: 1,
        type: "",
        unit: "%",
        userTag: 0,
        value: 0,
        valueStr: "",
      },
      fThunderstormIntensity: {
        ID: 0,
        __Type: "RangeDataValue",
        clamp_max: 100,
        clamp_min: 0,
        html: "",
        icon: "",
        max: 100,
        min: 0,
        name: "Lightning",
        percent: 0,
        quality: 0,
        step: 1,
        type: "",
        unit: "%",
        userTag: 0,
        value: 0,
        valueStr: "",
      },
      fAerosolDensity: 0,
      fSnowCover: {
        ID: 0,
        __Type: "RangeDataValue",
        clamp_max: 75,
        clamp_min: 0,
        html: "",
        icon: "",
        max: 75,
        min: 0,
        name: "TT.MENU.WEATHER_TOOLBAR_PANEL_SETTINGS_GROUND_SNOW",
        percent: 0,
        quality: 0,
        step: 1,
        type: "",
        unit: "cm",
        userTag: 0,
        value: 0,
        valueStr: "",
      },
      fHumidity: {
        ID: 0,
        __Type: "RangeDataValue",
        clamp_max: 20,
        clamp_min: 1,
        html: "",
        icon: "",
        max: 20,
        min: 1,
        name: "TT.MENU.WEATHER_TOOLBAR_PANEL_SETTING_HUMIDITY",
        percent: 0,
        quality: 0,
        step: 0.10000000149011612,
        type: "",
        unit: "",
        userTag: 0,
        value: 1,
        valueStr: "",
      },
      // fGroundTemperature: 0,
      // fPrecipitation: 0,
      // fThunderstormIntensity: 0,
      // fAerosolDensity: 0,
      // fSnowCover: 0,
      // tCloudLayers: [],
      // tWindLayers: [],
      // raw: "",
      // stationName: "",
      // elevationFt: 0,
      // city: "",
      // fGroundTemperature: 0,
      // fGroundPressure: 0,
      // fPrecipitation: 0,
      // fThunderstormIntensity: 0,
      // fAerosolDensity: 0,
      // fSnowCover: 0,
      //-----------------------------
      tCloudLayers: [],
      tWindLayers: [],
      raw: "",
      stationName: "",
      elevationFt: 0,
      city: "",
    };

    for (i = 0; i < 3; ++i) {
      snapshot.tCloudLayers.push({
        //Define initial cloud layer objects
        __Type: "CloudLayerData",
        fAltitudeBot: {
          ID: 0,
          __Type: "RangeDataValue",
          clamp_max: 5182.18212890625, //Should be set to the value of dvAltitude.value... Need to implement.
          clamp_min: -1640,
          html: "",
          icon: "",
          max: 60000,
          min: -1640,
          name: "TT.MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_BOT",
          percent: 0,
          quality: 0,
          step: 10,
          type: "",
          unit: "Ft",
          userTag: 0,
          value: 508,
          valueStr: "",
        },
        fAltitudeTop: {
          ID: 0,
          __Type: "RangeDataValue",
          clamp_max: 60000,
          clamp_min: -1640,
          html: "",
          icon: "",
          max: 60000,
          min: -1640,
          name: "TT.MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_ALT_TOP",
          percent: 0,
          quality: 0,
          step: 10,
          type: "",
          unit: "Ft",
          userTag: 0,
          value: 5182.18212890625,
          valueStr: "",
        },
        fScattering: {
          ID: 0,
          __Type: "RangeDataValue",
          clamp_max: 100,
          clamp_min: 0,
          html: "",
          icon: "",
          max: 100,
          min: 0,
          name: "TT.MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_SCATTER",
          percent: 0,
          quality: 0,
          step: 1,
          type: "",
          unit: "%",
          userTag: 0,
          value: 85,
          valueStr: "",
        },
        dvCoverageRatio: {
          //Set value only need to implement logic to work with scattering value
          ID: 0,
          __Type: "RangeDataValue",
          clamp_max: 100,
          clamp_min: 0,
          html: "",
          icon: "",
          max: 100,
          min: 0,
          name: "Coverage : Broken", //Will need to be updated with value?
          percent: 0,
          quality: 0,
          step: 1,
          type: "",
          unit: "%",
          userTag: 0,
          value: 66,
          valueStr: "",
        },
        fDensity: {
          ID: 0,
          __Type: "RangeDataValue",
          clamp_max: 5,
          clamp_min: 0,
          html: "",
          icon: "",
          max: 5,
          min: 0,
          name: "TT.MENU.WEATHER_TOOLBAR_PANEL_CLOUD_LAYER_SETTINGS_DENSITY",
          percent: 0,
          quality: 0,
          step: 0.009999999776482582,
          type: "",
          unit: "",
          userTag: 0,
          value: 1,
          valueStr: "",
        },
        // fAltitudeBot: 50000 + i * 1000,
        // fAltitudeTop: 50000 + i * 1000 + 150,
        // fDensity: 0,
        // fScattering: 0,
        type: null,
      });
    }

    if (wind_layers) {
      //Fix these like cloud layers above
      for (i = 0; i < wind_layers.length; ++i) {
        snapshot.tWindLayers.push({
          __Type: "WindLayerData",
          fAltitude: {
            ID: 0,
            __Type: "RangeDataValue",
            clamp_max: 60000,
            clamp_min: -1640,
            html: "",
            icon: "",
            max: 60000,
            min: -1640,
            name: "ALTITUDE",
            percent: 0,
            quality: 0,
            step: 10,
            type: "",
            unit: "fT",
            userTag: 0,
            value: 0,
            valueStr: "",
          },
          fAngle: {
            //Units may need adjusted
            ID: 0,
            __Type: "RangeDataValue",
            clamp_max: 6.283185482051465,
            clamp_min: 0,
            html: "",
            icon: "",
            max: 6.283185482051465,
            min: 0,
            name: "TT.MENU.WEATHER_WIND_FROM",
            percent: 0,
            quality: 0,
            step: 0.01745329238474369,
            type: "",
            unit: "°",
            userTag: 0,
            value: 4.71238899238474369,
            valueStr: "",
          },
          fSpeed: {
            ID: 0,
            __Type: "RangeDataValue",
            clamp_max: 77.16999816894531,
            clamp_min: 0,
            html: "",
            icon: "",
            max: 77.16999816894531,
            min: 0,
            name: "TT.MENU.WEATHER_TOOLBAR_PANEL_WIND_LAYER_SETTINGS_SPEED",
            percent: 0,
            quality: 0,
            step: 1,
            type: "",
            unit: "M/s",
            userTag: 0,
            value: 3,
            valueStr: "",
          },
          gustWave: {
            __Type: "GustWaveData",
            fAngle: {
              //Units may need adjusted
              ID: 0,
              __Type: "RangeDataValue",
              clamp_max: 6.283185482051465,
              clamp_min: 0,
              html: "",
              icon: "",
              max: 6.283185482051465,
              min: 0,
              name: "TT.MENU.WEATHER_WIND_FROM",
              percent: 0,
              quality: 0,
              step: 0.01745329238474369,
              type: "",
              unit: "°",
              userTag: 0,
              value: 4.71238899238474369,
              valueStr: "",
            },
            fIntervalS: {
              ID: 0,
              __Type: "RangeDataValue",
              clamp_max: 18,
              clamp_min: 1,
              html: "",
              icon: "",
              max: 18,
              min: 1,
              name: "TT.MENU.WEATHER_TOOLBAR_PANEL_WIND_LAYER_SETTINGS_GUST_PER_MINUTE",
              percent: 0,
              quality: 0,
              step: 1,
              type: "",
              unit: "",
              userTag: 0,
              value: 35,
              valueStr: "",
            },
            fSpeedRatio: {
              ID: 0,
              __Type: "RangeDataValue",
              clamp_max: 2,
              clamp_min: 0,
              html: "",
              icon: "",
              max: 2,
              min: 0,
              name: "TT.MENU.WEATHER_TOOLBAR_PANEL_WIND_LAYER_SETTINGS_SPEED",
              percent: 0,
              quality: 0,
              step: 0.009999999776482582,
              type: "",
              unit: "M/s",
              userTag: 0,
              value: 1,
              valueStr: "",
            },
          },
          // fAltitude: wind_layers[i].fAltitude,
          // fSpeed: 0,
          // fAngle: 0,
          // gustWave: {
          //   fAngle: 0,
          //   fSpeedRatio: 0,
          //   fIntervalS: 0,
        });
      }
    }

    return snapshot;
  };

  generateSnapshot = (weather_info, wind_layers) => {
    //This is where snapshot data is defined from the API response.
    //Currently the wind and cloud layers need updated from their current state to objects.
    var snapshot, i, lastCeilingFt, snapshot_wl;

    if (!weather_info) return null;

    snapshot = generateBlankSnapshot(wind_layers);
    console.log("weather_info", weather_info.fTemperatureC);
    //------------------------------------------
    snapshot.fPollution.value = weather_info.fPollution; //set value of 0 for now
    snapshot.fHumidity.value = weather_info.fHumidity; //set value of 1 for now
    snapshot.fGroundTemperature.value = weather_info.fTemperatureC;

    // snapshot.fGroundTemperature = MathExt.clamp(
    //   weather_info.fTemperatureC + 273.15,
    //   183.15,
    //   333.15
    // ); // C to K
    snapshot.fGroundPressure.value = weather_info.fPressurePa; //Wrong unit?
    // snapshot.fGroundPressure = MathExt.clamp(
    //   weather_info.fPressurePa,
    //   87000,
    //   108500
    // );
    snapshot.fPrecipitation.value = weather_info.fPrecipitation;
    // snapshot.fPrecipitation = MathExt.clamp(
    //   weather_info.fPrecipitation,
    //   0,
    //   9.9
    // );
    snapshot.fThunderstormIntensity.value = weather_info.fThunderstormIntensity;
    // snapshot.fThunderstormIntensity = MathExt.clamp(
    //   weather_info.fThunderstormIntensity,
    //   0,
    //   0.99
    // );
    snapshot.fAerosolDensity = weather_info.fAerosolDensity;
    // snapshot.fAerosolDensity = MathExt.clamp(
    //   weather_info.fAerosolDensity,
    //   0,
    //   19.9
    // );
    snapshot.fSnowCover.value = weather_info.fSnowCoverM;
    // snapshot.fSnowCover = MathExt.clamp(weather_info.fSnowCoverM, 0, 0.99);
    //-------------------------------------------
    snapshot.raw = weather_info.raw;
    snapshot.stationName = weather_info.stationName;
    snapshot.elevationFt =
      weather_info.elevationFt == null ? 0 : weather_info.elevationFt;
    snapshot.city = weather_info.city + " (" + weather_info.country + ")";

    lastCeilingFt = Number.MAX_VALUE;
    i = 0;

    weather_info.cloudLayers
      .slice()
      .reverse()
      .forEach((cloud_layer) => {
        var density, scattering, layerHeightFt, altitudeFt, topFt, snapshot_cl;

        if (i >= 3) return;

        snapshot_cl = snapshot.tCloudLayers[i];

        snapshot_cl.fAltitudeBot.value = 0;
        snapshot_cl.fAltitudeTop.value = 0;
        snapshot_cl.fDensity.value = 0;
        snapshot_cl.fScattering.value = 0;
        snapshot_cl.type = cloud_layer.type;

        density = 0.0;
        scattering = 0.0;
        layerHeightFt = 0.0;

        altitudeFt = cloud_layer.altitude;

        switch (cloud_layer.type) {
          case "FEW":
            // 1/8 to 2/8
            density = cloud_layer.towering
              ? MathExt.random2(0.1, 0.2)
              : MathExt.random2(0.0625, 0.3125);
            scattering = cloud_layer.towering ? MathExt.random2(0.5, 0.7) : 0.9;
            layerHeightFt = cloud_layer.towering
              ? MathExt.random2(30000, 50000)
              : MathExt.random2(2000, 10000);
            break;

          case "SCT":
            // 3/8 to 4/8
            density = MathExt.random2(0.3125, 0.5625);
            scattering = 0.9;
            layerHeightFt = cloud_layer.towering
              ? MathExt.random2(30000, 50000)
              : MathExt.random2(2000, 10000);
            break;

          case "BKN":
            // 5/8 to 7/8
            density = MathExt.random2(0.5625, 0.9);
            scattering = 0.8;
            layerHeightFt = cloud_layer.towering
              ? MathExt.random2(30000, 50000)
              : MathExt.random2(2500, 12000);
            break;

          case "OVC":
            // 7/8 to 1.0
            density = MathExt.random2(0.9, 1.0);
            scattering = 0.0;
            layerHeightFt = MathExt.random2(2000, 4000);
            break;

          default:
            break;
        }

        density = MathExt.clamp(density, 0.0, 1.0);
        scattering = MathExt.clamp(scattering, 0.0, 1.0);

        topFt = Math.min(altitudeFt + layerHeightFt, lastCeilingFt - 200.0);
        topFt = MathExt.clamp(topFt, 1, 60000);

        lastCeilingFt = altitudeFt;

        snapshot_cl.fAltitudeBot.value = altitudeFt;
        snapshot_cl.fAltitudeTop.value = topFt;
        snapshot_cl.fDensity.value = density;
        snapshot_cl.fScattering.value = scattering;
        snapshot_cl.type = cloud_layer.type;

        ++i;
      });

    if (snapshot.tWindLayers.length > 0) {
      for (i = 0; i < snapshot.tWindLayers.length; ++i) {
        snapshot_wl = snapshot.tWindLayers[i];
        if (snapshot_wl.fAltitude.value > snapshot.elevationFt + 3000) {
          snapshot_wl.fSpeed.value = MathExt.clamp(
            weather_info.windSpeedKts +
              Math.pow(
                Math.abs(
                  snapshot.tWindLayers[i].fAltitude.value - snapshot.elevationFt
                ),
                1.85
              ) *
                0.0000001,
            0,
            150
          );
          snapshot_wl.fAngle.value =
            MathExt.clamp(
              MathExt.normAngleDeg(
                weather_info.windDirectionDeg +
                  MathExt.random2(0.97, 1.03) * 360
              ),
              0,
              359
            ) * 0.017453292519943296; // rad
        } else {
          snapshot_wl.fSpeed.value = MathExt.clamp(
            weather_info.windSpeedKts -
              Math.pow(
                Math.abs(snapshot_wl.fAltitude - snapshot.elevationFt),
                1.85
              ) *
                0.0000001,
            0,
            150
          );
          snapshot_wl.fAngle.value =
            MathExt.clamp(weather_info.windDirectionDeg, 0, 359) *
            0.017453292519943296; // rad
        }

        snapshot_wl.gustWave.fAngle.value = snapshot_wl.fAngle.value; // rad
        if (
          weather_info.windSpeedKts > 0 &&
          weather_info.windGustSpeedKts > 0
        ) {
          snapshot_wl.gustWave.fSpeedRatio = MathExt.clamp(
            weather_info.windGustSpeedKts / weather_info.windSpeedKts -
              Math.pow(
                Math.abs(snapshot_wl.fAltitude.value - snapshot.elevationFt),
                1.6
              ) *
                0.000001,
            0.0,
            2.0
          ); // 0.5 - 2.0 (50-200%)
          snapshot_wl.gustWave.fIntervalS.value = MathExt.random2(55, 60); // frequency (sec) 10-60
        } else {
          snapshot_wl.gustWave.fSpeedRatio.value = 0.0; // 0.5 - 2.0 (50-200%)
          snapshot_wl.gustWave.fIntervalS.value = 60.0; // frequency (sec) 10-60
        }
      } // next wl
    }

    return snapshot;
  }; // generateSnapshot

  createMap = (from, to, t) => {
    var ii,
      min = Number.MAX_SAFE_INTEGER;
    const maps = [
      { map: new Map().set(0, 0).set(1, 1).set(2, 2), wt: 0 },
      { map: new Map().set(0, 0).set(1, 2).set(2, 1), wt: 0 },
      { map: new Map().set(0, 1).set(1, 0).set(2, 2), wt: 0 },
      { map: new Map().set(0, 1).set(1, 2).set(2, 0), wt: 0 },
      { map: new Map().set(0, 2).set(1, 0).set(2, 1), wt: 0 },
      { map: new Map().set(0, 2).set(1, 1).set(2, 0), wt: 0 },
    ];

    maps.forEach((x) => {
      var tmp;
      x.map.forEach((i, j) => {
        tmp = Math.abs(from[j].fAltitudeBot.value - to[i].fAltitudeBot.value);
        x.wt += from[j].type && to[i].type ? (tmp <= t ? 0 : tmp) : 1;
      });
    });

    maps.forEach((x, i) => {
      if (x.wt < min) {
        min = x.wt;
        ii = i;
      }
    });

    return maps[ii].map;
  }; // createMap

  align = (from, to, map) => {
    map.forEach((i, j) => {
      var height,
        from_layer = from[j],
        to_layer = to[i];

      if (!to_layer.type) {
        height = to_layer.fAltitudeTop.value - to_layer.fAltitudeBot.value;
        to_layer.fAltitudeBot.value = from_layer.fAltitudeBot.value;
        to_layer.fAltitudeTop.value = to_layer.fAltitudeBot.value + height;
      } else if (!from_layer.type && to_layer.type) {
        height = from_layer.fAltitudeTop.value - from_layer.fAltitudeBot.value;
        from_layer.fAltitudeBot.value = to_layer.fAltitudeBot.value;
        from_layer.fAltitudeTop.value = from_layer.fAltitudeBot.value + height;
      } else if (
        from_layer.type &&
        to_layer.type &&
        from_layer.type === to_layer.type
      ) {
        to_layer.fAltitudeTop.value =
          to_layer.fAltitudeBot.value +
          (from_layer.fAltitudeTop.value - from_layer.fAltitudeBot.value);
        to_layer.fScattering.value = from_layer.fScattering.value;
        to_layer.fDensity.value = from_layer.fDensity.value;
      }
    });
  }; // align

  interpolateSnapshots = (snapshot, from_snapshot, to_snapshot, t, map) => {
    var i;
    //----------------------------------------------
    snapshot.fGroundTemperature.value = MathExt.lerp(
      from_snapshot.fGroundTemperature.value,
      to_snapshot.fGroundTemperature.value,
      t
    );
    snapshot.fGroundPressure.value = MathExt.lerp(
      from_snapshot.fGroundPressure.value,
      to_snapshot.fGroundPressure.value,
      t
    );
    snapshot.fPrecipitation.value = MathExt.lerp(
      from_snapshot.fPrecipitation.value,
      to_snapshot.fPrecipitation.value,
      t
    );
    snapshot.fThunderstormIntensity.value = MathExt.lerp(
      from_snapshot.fThunderstormIntensity.value,
      to_snapshot.fThunderstormIntensity.value,
      t
    );
    snapshot.fAerosolDensity = MathExt.lerp(
      from_snapshot.fAerosolDensity,
      to_snapshot.fAerosolDensity,
      t
    );
    snapshot.fSnowCover.value = MathExt.lerp(
      from_snapshot.fSnowCover.value,
      to_snapshot.fSnowCover.value,
      t
    );
    snapshot.fHumidity.value = MathExt.lerp(
      from_snapshot.fHumidity.value,
      to_snapshot.fHumidity.value,
      t
    );
    snapshot.fPollution.value = MathExt.lerp(
      from_snapshot.fPollution.value,
      to_snapshot.fPollution.value,
      t
    );
    //----------------------------------------------
    snapshot.raw = to_snapshot.raw;
    snapshot.stationName = to_snapshot.stationName;
    snapshot.elevationFt = to_snapshot.elevationFt;
    snapshot.city = to_snapshot.city;

    for (i = 0; i < snapshot.tCloudLayers.length; ++i) {
      snapshot.tCloudLayers[i].fAltitudeBot.value.value = MathExt.lerp(
        from_snapshot.tCloudLayers[i].fAltitudeBot.value.value,
        to_snapshot.tCloudLayers[map.get(i)].fAltitudeBot.value.value,
        t
      );
      snapshot.tCloudLayers[i].fAltitudeTop.value = MathExt.lerp(
        from_snapshot.tCloudLayers[i].fAltitudeTop.value,
        to_snapshot.tCloudLayers[map.get(i)].fAltitudeTop.value,
        t
      );
      snapshot.tCloudLayers[i].fDensity.value = MathExt.lerp(
        from_snapshot.tCloudLayers[i].fDensity.value,
        to_snapshot.tCloudLayers[map.get(i)].fDensity.value,
        t
      );
      snapshot.tCloudLayers[i].fScattering.value = MathExt.lerp(
        from_snapshot.tCloudLayers[i].fScattering.value,
        to_snapshot.tCloudLayers[map.get(i)].fScattering.value,
        t
      );
      if (to_snapshot.tCloudLayers[map.get(i)].type) {
        snapshot.tCloudLayers[i].type =
          to_snapshot.tCloudLayers[map.get(i)].type;
      } else if (
        snapshot.tCloudLayers[i].fDensity.value < 0.1 &&
        snapshot.tCloudLayers[i].fScattering.value < 0.1
      ) {
        snapshot.tCloudLayers[i].type = null; //May need to be zero
      }
    }

    for (i = 0; i < snapshot.tWindLayers.length; ++i) {
      snapshot.tWindLayers[i].fAltitude =
        from_snapshot.tWindLayers[i].fAltitude.value;
      snapshot.tWindLayers[i].fSpeed.value = MathExt.lerp(
        from_snapshot.tWindLayers[i].fSpeed.value,
        to_snapshot.tWindLayers[i].fSpeed.value,
        t
      );
      snapshot.tWindLayers[i].fAngle.value = MathExt.lerpAngle(
        from_snapshot.tWindLayers[i].fAngle.value,
        to_snapshot.tWindLayers[i].fAngle.value,
        t
      );

      if (snapshot.tWindLayers[i].gustWave) {
        snapshot.tWindLayers[i].gustWave.fAngle.value = MathExt.lerpAngle(
          from_snapshot.tWindLayers[i].gustWave.fAngle.value,
          to_snapshot.tWindLayers[i].gustWave.fAngle.value,
          t
        );
        snapshot.tWindLayers[i].gustWave.fSpeedRatio.value = MathExt.lerp(
          from_snapshot.tWindLayers[i].gustWave.fSpeedRatio.value,
          to_snapshot.tWindLayers[i].gustWave.fSpeedRatio.value,
          t
        );
        snapshot.tWindLayers[i].gustWave.fIntervalS.value = MathExt.lerp(
          from_snapshot.tWindLayers[i].gustWave.fIntervalS.value,
          to_snapshot.tWindLayers[i].gustWave.fIntervalS.value,
          t
        );
      }
    }
  }; // interpolateSnapshots

  applyMetar = (metar) => {
    var weather_info;

    if (!state_map.current_raw_metar) {
      weather_info = uwm.metar_parser.parseMetar(metar);
      state_map.current_metar = metar;
      snapshot = generateSnapshot(
        weather_info,
        config.menu.localPreset.tWindLayers
      );
      diag("Initial snapshot");
      if (config.setInfoCallback) {
        config.setInfoCallback(metar["raw"].substr(0, 4) + " - new METAR");
      }
      if (config.setDataCallback) {
        config.setDataCallback(
          snapshot.raw,
          snapshot.stationName,
          snapshot.elevationFt,
          snapshot.city
        );
      }
      applySnapshot(snapshot);
    } else if (metar["raw"] !== state_map.current_raw_metar) {
      weather_info = uwm.metar_parser.parseMetar(metar);
      state_map.current_metar = metar;
      snapshot = generateSnapshot(
        weather_info,
        config.menu.localPreset.tWindLayers
      );

      if (state_map.in_transition) {
        state_map.stop_transition = true;
        diag("Stopping transition . . .");
      }

      setTimeout(() => {
        if (config.setInfoCallback) {
          config.setInfoCallback(metar["raw"].substr(0, 4) + " - new METAR");
        }
        if (config.setDataCallback) {
          config.setDataCallback(
            snapshot.raw,
            snapshot.stationName,
            snapshot.elevationFt,
            snapshot.city
          );
        }
        applyTransition(
          snapshot,
          config.weather_transition_span_seconds,
          config.weather_transition_step_seconds
        );
      }, config.weather_transition_step_seconds * 1000 + 500);
    }
  }; // applyMetar

  applySnapshot = (snapshot) => {
    var i;

    //These if statements to enable features will need updated to work as value must be passed to the sim
    if (!snapshot) return;
    //--------------------------------------------------
    console.log(config.menu.localPreset);
    if (config.features.enable_pollution) {
      config.menu.localPreset.fPollution = snapshot.fPollution;
    }
    if (config.features.enable_humidity) {
      config.menu.localPreset.fHumidity = snapshot.fHumidity;
    }
    if (config.features.enable_temperature) {
      config.menu.localPreset.fGroundTemperature = snapshot.fGroundTemperature;
    }
    if (config.features.enable_pressure) {
      config.menu.localPreset.fGroundPressure = snapshot.fGroundPressure;
    }
    if (config.features.enable_precipitation) {
      config.menu.localPreset.fPrecipitation = snapshot.fPrecipitation;
    }
    if (config.features.enable_lightning) {
      config.menu.localPreset.fThunderstormIntensity =
        snapshot.fThunderstormIntensity;
    }
    if (config.features.enable_aerosol_density) {
      config.menu.localPreset.fAerosolDensity = snapshot.fAerosolDensity;
    }
    if (config.features.enable_snow_cover) {
      config.menu.localPreset.fSnowCover = snapshot.fSnowCover;
    }
    //--------------------------------------------------

    if (config.features.enable_clouds) {
      //Define correct names to be pushed here for clouds
      for (i = 0; i < 3; ++i) {
        config.menu.localPreset.tCloudLayers[i].dvAltitudeBot =
          snapshot.tCloudLayers[i].fAltitudeBot.value;
        config.menu.localPreset.tCloudLayers[i].dvAltitudeTop =
          snapshot.tCloudLayers[i].fAltitudeTop.value;
        config.menu.localPreset.tCloudLayers[i].dvDensity =
          snapshot.tCloudLayers[i].fDensity.value;
        config.menu.localPreset.tCloudLayers[i].dvCloudScatteringRatio =
          snapshot.tCloudLayers[i].fScattering.value;
        // config.menu.tCloudLayers[i].dvCoverageRatio =
        //   snapshot.tCloudLayers[i].dvCoverageRatio;
      }
    }

    if (config.features.enable_wind) {
      //Define correct names to be pushed here for clouds
      if (config.menu.localPreset.tWindLayers) {
        for (i = 0; i < config.menu.localPreset.tWindLayers.length; ++i) {
          if (
            config.features.enable_high_elevation_wind ||
            config.menu.localPreset.tWindLayers[i].dvAltitude.value <=
              snapshot.elevationFt + 5000
          ) {
            config.menu.localPreset.tWindLayers[i].dvSpeed =
              snapshot.tWindLayers[i].fSpeed.value;
            config.menu.localPreset.tWindLayers[i].dvAngleRad =
              snapshot.tWindLayers[i].fAngle.value;
            //------------------
            config.menu.localPreset.tWindLayers[i].__Type =
              snapshot.tWindLayers[i].__Type;
            //------------------

            if (config.menu.localPreset.tWindLayers[i].gustWave) {
              config.menu.localPreset.tWindLayers[i].gustWaveData.dvAngleRad =
                snapshot.tWindLayers[i].gustWave.fAngle.value;
              config.menu.localPreset.tWindLayers[
                i
              ].gustWaveData.dvSpeedMulitplier =
                snapshot.tWindLayers[i].gustWave.fSpeedRatio.value;
              config.menu.localPreset.tWindLayers[i].gustWaveData.dvIntervalS =
                snapshot.tWindLayers[i].gustWave.fIntervalS.value;
              //------------------
              config.menu.localPreset.tWindLayers[i].gustWaveData.__Type =
                snapshot.tWindLayers[i].gustWave.__Type;
              //------------------
            }
          }
        }
      }
    }
    state_map.current_snapshot = snapshot;
    state_map.current_raw_metar = snapshot.raw;

    console.log(config.menu.localPreset);

    final_data = {
      __Type: "WeatherPresetData",
      bIsRemovable: false,
      bIsValid: true,
      index: 1,
      oConfig: {
        __Type: "WeatherPresetConfigData",
        daDvAltitudeLines: [
          {
            ID: 0,
            __Type: "DataValue",
            html: "",
            icon: "",
            name: "Mean Ground Level",
            quality: 0,
            type: "",
            unit: "Ft",
            userTag: 0,
            value: 0,
            valueStr: "0",
          },
          {
            ID: 1,
            __Type: "DataValue",
            html: "",
            icon: "",
            name: "ALTITUDE LINE",
            quality: 0,
            type: "",
            unit: "Ft",
            userTag: 0,
            value: 0,
            valueStr: "0",
          },
        ],
        dvMaxAltitude: {},
        dvMaxWindSpeed: {},
        dvMinAltitude: {},
        dvMinCloudHeight: {},
        fMaxGustSpeedRatio: 2,
        fMinGustSpeedRation: 0.5,
      },
      oSettings: {
        __Type: "WeatherPresetSettingData",
        bIsAltitudeAMGL: config.menu.localPreset.bIsAltitudeAMGL,
        fAerosolDensity: config.menu.localPreset.fAerosolDensity,
        dvMSLPressure: config.menu.localPreset.fGroundPressure,
        dvMSLGLTemperature: config.menu.localPreset.fGroundTemperature,
        dvThunderstormRatio: config.menu.localPreset.fThunderstormIntensity,
        dvPrecipitation: config.menu.localPreset.fPrecipitation,
        dvSnowCover: config.menu.localPreset.fSnowCover,
        bCanEditSnow: config.menu.localPreset.bCanEditSnow,
        dvPollution: config.menu.localPreset.fPollution,
        dvHumidityMultiplier: config.menu.localPreset.fHumidity,
      },
      sPresetName: "Unreal Weather - Live METAR",
      tCloudLayers: config.menu.localPreset.tCloudLayers,
      tWindLayers: config.menu.localPreset.tWindLayer,
    };

    if (config.settings_element) {
      config.settings_element.setData({
        bIsAltitudeAMGL: config.menu.localPreset.bIsAltitudeAMGL,
        bIsInMeters: config.menu.localPreset.bIsInMeters,
        bIsValid: config.menu.localPreset.bIsValid,
        bIsRemovable: config.menu.localPreset.bIsRemovable,
        fAerosolDensity: config.menu.localPreset.fAerosolDensity,
        dvMSLPressure: config.menu.localPreset.fGroundPressure,
        dvMSLGLTemperature: config.menu.localPreset.fGroundTemperature,
        dvThunderstormRatio: config.menu.localPreset.fThunderstormIntensity,
        dvPrecipitation: config.menu.localPreset.fPrecipitation,
        dvSnowCover: config.menu.localPreset.fSnowCover,
        bCanEditSnow: config.menu.localPreset.bCanEditSnow,
        dvPollution: config.menu.localPreset.fPollution,
        dvHumidityMultiplier: config.menu.localPreset.fHumidity,
        // bIsAltitudeAMGL: config.menu.localPreset.bIsAltitudeAMGL,
        // bIsInMeters: config.menu.localPreset.bIsInMeters,
        // bIsValid: config.menu.localPreset.bIsValid,
        // bIsRemovable: config.menu.localPreset.bIsRemovable,
        // fAerosolDensity: config.menu.localPreset.fAerosolDensity,
        // fGroundPressure: config.menu.localPreset.fGroundPressure,
        // fGroundTemperature: config.menu.localPreset.fGroundTemperature,
        // fThunderstormIntensity: config.menu.localPreset.fThunderstormIntensity,
        // fPrecipitation: config.menu.localPreset.fPrecipitation,
        // fSnowCover: config.menu.localPreset.fSnowCover,
        // bCanEditSnow: config.menu.localPreset.bCanEditSnow,
      });
    }
    if (config.element) {
      //Need to define
      config.element.setData(config.menu.localPreset);
    }

    config.menu.dispatchNewPreset();
  }; // applySnapshot

  applyTransition = (to_snapshot, span_seconds, step_seconds) => {
    var iterations,
      iteration = 0,
      snapshot,
      t,
      update_timer,
      from_snapshot,
      map;

    step_seconds = step_seconds <= 0 ? 1 : step_seconds;
    iterations = parseInt(span_seconds / step_seconds);

    if (iterations <= 1) {
      state_map.in_transition = false;
      state_map.stop_transition = false;
      applySnapshot(to_snapshot);
      return;
    }

    state_map.in_transition = true;
    state_map.stop_transition = false;

    diag("Starting transition.");

    from_snapshot = state_map.current_snapshot;
    snapshot = generateBlankSnapshot(from_snapshot.tWindLayers);
    map = createMap(from_snapshot.tCloudLayers, to_snapshot.tCloudLayers, 300);
    align(from_snapshot.tCloudLayers, to_snapshot.tCloudLayers, map);

    update_timer = setInterval(() => {
      try {
        if (iteration >= iterations || state_map.stop_transition) {
          clearInterval(update_timer);
          state_map.in_transition = false;
          state_map.stop_transition = false;

          diag("Stopped transition.");
          return;
        }

        ++iteration;
        t = iteration / iterations;
        interpolateSnapshots(snapshot, from_snapshot, to_snapshot, t, map);
        if (config.features.enable_aerosol_density_instant_change) {
          snapshot.fAerosolDensity = to_snapshot.fAerosolDensity;
        }
        applySnapshot(snapshot);
      } catch (err) {
        console.log(err);
        diag(err.message);
        diag(JSON.stringify(err));
      }
    }, step_seconds * 1000); // ms
  }; // applyTransition

  refreshWeather = () => {
    var weather_info, snapshot;

    if (state_map.current_metar) {
      if (state_map.in_transition) {
        state_map.stop_transition = true;
        diag("Stopping transition . . .");
      }

      weather_info = uwm.metar_parser.parseMetar(state_map.current_metar);
      snapshot = generateSnapshot(
        weather_info,
        config.menu.localPreset.tWindLayers
      );
      if (config.setDataCallback) {
        config.setDataCallback(
          snapshot.raw,
          snapshot.stationName,
          snapshot.elevationFt,
          snapshot.city
        );
      }

      setTimeout(() => {
        applySnapshot(snapshot);
      }, config.weather_transition_step_seconds * 1000 + 500);
    }
  }; // refreshWeather

  reset = () => {
    state_map.current_raw_metar = null;
    state_map.current_metar = null;
    state_map.stop_transition = true;
    state_map.current_snapshot = null;
  }; // reset

  initModule = (
    settings,
    weather_menu,
    settings_element,
    final_data,
    element,
    diagCallback,
    setDataCallback,
    setInfoCallback
  ) => {
    //--------------------------------------
    config.features.enable_humidity = settings.features.enable_humidity;
    config.features.enable_pollution = settings.features.enable_pollution;
    //--------------------------------------
    config.weather_transition_span_seconds =
      settings.weather_transition_span_seconds;
    config.weather_transition_step_seconds =
      settings.weather_transition_step_seconds;
    config.features.enable_temperature = settings.features.enable_temperature;
    config.features.enable_precipitation =
      settings.features.enable_precipitation;
    config.features.enable_aerosol_density =
      settings.features.enable_aerosol_density;
    config.features.enable_aerosol_density_instant_change =
      settings.features.enable_aerosol_density_instant_change;
    config.features.enable_pressure = settings.features.enable_pressure;
    config.features.enable_snow_cover = settings.features.enable_snow_cover;
    config.features.enable_snow_cover_from_precipitation =
      settings.features.enable_snow_cover_from_precipitation;
    config.features.enable_lightning = settings.features.enable_lightning;
    config.features.enable_clouds = settings.features.enable_clouds;
    config.features.enable_wind = settings.features.enable_wind;
    config.features.enable_high_elevation_wind =
      settings.features.enable_high_elevation_wind;
    config.menu = weather_menu;
    config.final_data = final_data;
    config.settings_element = settings_element;
    (config.element = element), (config.diagCallback = diagCallback);
    config.setDataCallback = setDataCallback;
    config.setInfoCallback = setInfoCallback;
  }; // initModule

  return {
    applyMetar: applyMetar,
    refreshWeather: refreshWeather,
    reset: reset,
    initModule: initModule,
  };
})(); // uwm.snapshot_manager

uwm.web_diag = (() => {
  var config = {
      base_uri: null,
    },
    get,
    post,
    initModule;

  get = (s) => {
    if (!config.base_uri) {
      return;
    }

    const xhttp = new XMLHttpRequest();

    xhttp.open("GET", config.base_uri + "data=" + encodeURI(String(s)), true);
    xhttp.onreadystatechange = function () {
      //..
    };
    xhttp.send();
  };

  post = (obj) => {
    if (!config.base_uri) {
      return;
    }

    const xhttp = new XMLHttpRequest();

    xhttp.open("POST", config.base_uri, true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.onreadystatechange = function () {
      //..
    };
    xhttp.send(JSON.stringify(obj));
  };

  initModule = (base_uri) => {
    config.base_uri = base_uri;
  };

  return {
    get: get,
    post: post,
    initModule: initModule,
  };
})(); // uwm.web_diag

uwm.metar_panel = (() => {
  var createPanel,
    diag,
    exists,
    setMetarData,
    setInfo,
    remove,
    initModule,
    config = {
      container_class: null,
      refreshCallback: null,
      diagCallback: null,
      html:
        String() +
        '<div style="display:table;width:100%;">' +
        '<div style="display:table-row;">' +
        '<div style="display:table-cell;border: 1px solid white; font-size: smaller; padding: 0.3em;width:90%" id="_raw-metar"></div>' +
        '<div style="display:table-cell;">' +
        '<button type="button" style="font-size:1.0em;font-weight:bold;background-color:#00b4ff;overflow:hidden;color:#fff;border:none;height:1.3em;width:1.3em;margin-left:0.2em">&gt;&gt;</button></div>' +
        "</div>" +
        '<div style="display:table-row;"><div style="display:table-cell;font-size: smaller; padding: 0.1em 0.3em"></div></div>' +
        '<div style="display:table-row;"><div style="display:table-cell;font-size: smaller; padding: 0.1em 0.3em"></div></div>' +
        '<div style="display:table-row;"><div style="display:table-cell;font-size: small; padding: 0.4em 0.4em; color: #fa0; background: rgba(0, 63, 127, 0.5);">...</div></div>' +
        "</div>",
    },
    state_map = {
      panel_elem: null,
      refresh_elem: null,
      metar_elem: null,
      station_elem: null,
      city_elem: null,
      info_elem: null,
      info_lines: [],
    };
  diag = (s) => {
    if (config.diagCallback) config.diagCallback(s);
  };

  createPanel = () => {
    const panel_class = "uw-metar-raw";
    var elem,
      coll = document.getElementsByClassName(panel_class);

    if (coll.length > 0) {
      return coll[0];
    }

    coll = document.getElementsByClassName(config.container_class);

    if (coll.length > 0) {
      elem = document.createElement("div");
      elem.innerHTML = config.html;
      elem.className = panel_class;
      coll[0].appendChild(elem);

      state_map.metar_elem = elem.children[0].children[0].children[0];
      state_map.station_elem = elem.children[0].children[1].children[0];
      state_map.city_elem = elem.children[0].children[2].children[0];
      state_map.info_elem = elem.children[0].children[3].children[0];
      state_map.refresh_elem =
        elem.children[0].children[0].children[1].children[0];

      state_map.refresh_elem.addEventListener("mouseover", () => {
        state_map.refresh_elem.style.color = "#00b4ff";
        state_map.refresh_elem.style.backgroundColor = "#fff";
      });
      state_map.refresh_elem.addEventListener("mouseout", () => {
        state_map.refresh_elem.style.color = "#fff";
        state_map.refresh_elem.style.backgroundColor = "#00b4ff";
      });
      state_map.refresh_elem.addEventListener("mousedown", () => {
        state_map.refresh_elem.style.color = "#fff";
        state_map.refresh_elem.style.backgroundColor = "transparent";
      });
      state_map.refresh_elem.addEventListener("mouseup", () => {
        state_map.refresh_elem.style.color = "#00b4ff";
        state_map.refresh_elem.style.backgroundColor = "#fff";
      });
      state_map.refresh_elem.addEventListener("click", () => {
        try {
          if (config.refreshCallback) {
            config.refreshCallback();
          }
        } catch (err) {
          diag(err.message);
          diag(JSON.stringify(err));
        }
      });

      diag("METAR panel added.");
      return elem;
    }

    diag("Settings panel not found.");
    return null;
  };

  exists = () => {
    return state_map.panel_elem !== null;
  };

  setMetarData = (raw_metar, station, elevationFt, city) => {
    if (!state_map.panel_elem) {
      state_map.panel_elem = createPanel();
    }

    if (state_map.panel_elem) {
      state_map.metar_elem.innerText = raw_metar;
      state_map.station_elem.innerText =
        station + (elevationFt != null ? " (" + elevationFt + " ft MSL)" : "");
      state_map.city_elem.innerText = city;
    }
  };

  setInfo = (info, is_error = false) => {
    var dt, timestamp;
    if (!state_map.panel_elem) {
      state_map.panel_elem = createPanel();
    }

    if (state_map.panel_elem) {
      dt = new Date();
      timestamp =
        dt.getHours().toString().padStart(2, "0") +
        ":" +
        dt.getMinutes().toString().padStart(2, "0") +
        ":" +
        dt.getSeconds().toString().padStart(2, "0");
      if (state_map.info_lines.length >= 5) {
        state_map.info_lines.shift();
      }
      if (is_error) {
        state_map.info_lines.push(
          '<span style="color: #f55; font-weight: bold;">[' +
            timestamp +
            "] " +
            info +
            "</span>"
        );
      } else {
        state_map.info_lines.push("[" + timestamp + "] " + info);
      }

      state_map.info_elem.innerHTML = "";
      for (var i = 0; i < state_map.info_lines.length; ++i) {
        state_map.info_elem.innerHTML += state_map.info_lines[i] + "<br/>";
      }
    }
  };

  remove = () => {
    if (state_map.panel_elem) {
      state_map.metar_elem = null;
      state_map.station_elem = null;
      state_map.city_elem = null;
      state_map.info_elem = null;
      state_map.info_lines = [];
      state_map.refresh_elem = null;
      state_map.panel_elem.remove();
      state_map.panel_elem = null;
      diag("METAR panel removed.");
    }
  };

  initModule = (container_class, refreshCallback, diagCallback) => {
    config.container_class = container_class;
    config.refreshCallback = refreshCallback;
    config.diagCallback = diagCallback;
  };

  return {
    exists: exists,
    setMetarData: setMetarData,
    setInfo: setInfo,
    remove: remove,
    initModule: initModule,
  };
})(); // uwm.metar_panel
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
          typeof UnrealWeatherSettings !== "undefined" &&
          UnrealWeatherSettings &&
          typeof uwm !== "undefined" &&
          uwm
        ) {
          if (
            this.m_w_local_preset.sPresetName === "Unreal Weather - Live METAR"
          ) {
            if (!uwm.isInitialized()) {
              uwm.initModule(
                UnrealWeatherSettings,
                this,
                this.m_c_settings,
                this.m_c_presetplan
              );
            }
            uwm.run();
          } else {
            if (uwm.isInitialized()) {
              uwm.stop();
            }
          }
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
