import * as React from "react";
import { Route, Switch, Redirect } from "react-router-dom";
import RyzenControllerAppContext, {
  defaultRyzenControllerAppContext,
  defaultPreset,
  persistentSave,
  getSettingDefinition,
  app_version_as_string,
  executeRyzenAdjUsingPreset,
} from "../contexts/RyzenControllerAppContext";
import RyzenAdjScene from "../scenes/RyzenAdjScene";
import PresetsScene from "../scenes/PresetsScene";
import SettingsScene from "../scenes/SettingsScene";
import NotificationContext from "../contexts/NotificationContext";
import { getTranslation } from "../contexts/LocaleContext";
const electronSettings = window.require("electron-settings");
const powerMonitor = window.require("electron").remote.powerMonitor;

class Scene extends React.Component<{}, RyzenControllerAppContextType> {
  state: RyzenControllerAppContextType = {
    ...defaultRyzenControllerAppContext,
    updateLatestSettings: this.updateLatestSettings.bind(this),
    updateCurrentSettings: this.updateCurrentSettings.bind(this),
    addPreset: this.addPreset.bind(this),
    removePreset: this.removePreset.bind(this),
    updateSettings: this.updateSettings.bind(this),
  };

  componentDidMount() {
    let settings = electronSettings.get(app_version_as_string);
    if (settings) {
      settings = settings.settings;
    } else {
      settings = defaultRyzenControllerAppContext.settings;
    }
    let newSettingsPromises: Array<Promise<string | boolean>> = [];

    for (const key in settings) {
      if (settings.hasOwnProperty(key)) {
        // @ts-ignore
        const arg: RyzenControllerSettingsNames = key;
        const settingValue = settings[arg];
        const settingDef = getSettingDefinition(arg);
        if (settingDef && typeof settingValue !== "undefined") {
          newSettingsPromises.push(settingDef.apply(settingValue));
        }

        if (arg === "onRCStart" && settingValue !== false && settingValue !== "") {
          executeRyzenAdjUsingPreset(settingValue);
        }
      }
    }

    if (newSettingsPromises.length > 0) {
      Promise.all(newSettingsPromises).catch((error: string) => {
        NotificationContext.error(error);
      });
    }

    powerMonitor.on("unlock-screen", () => {
      const presetName = electronSettings.get(app_version_as_string)?.settings?.onSessionResume;
      if (presetName) {
        executeRyzenAdjUsingPreset(presetName);
      }
    });

    if (window.require("os").platform() === "win32") {
      this.handleBatteryStatusChange();
    }
  }

  componentDidUpdate() {
    persistentSave(this.state);
  }

  handleBatteryStatusChange() {
    powerMonitor.on("on-ac", () => {
      const presetName = electronSettings.get(app_version_as_string)?.settings?.onLaptopPluggedIn;
      if (presetName !== false && presetName !== "") {
        executeRyzenAdjUsingPreset(presetName);
      }
    });

    powerMonitor.on("on-battery", () => {
      const presetName = electronSettings.get(app_version_as_string)?.settings?.onLaptopPluggedOut;
      if (presetName !== false && presetName !== "") {
        executeRyzenAdjUsingPreset(presetName);
      }
    });
  }

  updateLatestSettings() {
    const newLatestSettings: RyzenAdjOptionListType = {
      ...defaultPreset,
      ...this.state.currentSettings,
    };
    this.setState({
      latestSettings: newLatestSettings,
    });
  }

  updateCurrentSettings(list: PartialRyzenAdjOptionListType) {
    const newCurrentSettings: RyzenAdjOptionListType = {
      ...defaultPreset,
      ...this.state.currentSettings,
      ...list,
    };
    this.setState({
      currentSettings: newCurrentSettings,
    });
  }

  addPreset(name: string, preset: PartialRyzenAdjOptionListType) {
    const newPreset = {
      [name]: {
        ...defaultPreset,
        ...preset,
      },
    };

    if (this.state.presets.hasOwnProperty(name)) {
      // @TODO handle preset creation when name already existing.
    }

    this.setState({
      presets: {
        ...this.state.presets,
        ...newPreset,
      },
    });
  }

  removePreset(name: keyof RyzenAdjOptionListNamedType) {
    let newState = { ...this.state };
    delete newState.presets[name];
    this.setState(newState);
  }

  updateSettings(settings: Partial<RyzenControllerSettings>) {
    let newSettings = {
      ...this.state.settings,
      ...settings,
    };
    let newSettingsPromises: Array<Promise<string | boolean>> = [];

    for (const key in settings) {
      if (settings.hasOwnProperty(key)) {
        // @ts-ignore
        const arg: RyzenControllerSettingsNames = key;
        const newSettingValue = settings[arg];
        const settingDef = getSettingDefinition(arg);
        if (settingDef && typeof newSettingValue !== "undefined") {
          newSettingsPromises.push(settingDef.apply(newSettingValue));
        }
      }
    }

    if (newSettingsPromises.length > 0) {
      Promise.all(newSettingsPromises)
        .then(results => {
          NotificationContext.success(
            getTranslation("notification.settingsSaveSuccess", "Settings has been saved successfully"),
            "settings_applied"
          );
          this.setState({ settings: newSettings });
        })
        .catch((error: string) => {
          NotificationContext.error(error);
        });
    }
  }

  render() {
    return (
      <RyzenControllerAppContext.Provider value={this.state}>
        <Switch>
          <Redirect exact from="/" to="/cpu" />
          <Route exact path="/cpu" render={() => <RyzenAdjScene filter="cpu" />} />
          <Route exact path="/gpu" render={() => <RyzenAdjScene filter="gpu" />} />
          <Route exact path="/power" render={() => <RyzenAdjScene filter="power" />} />
          <Route exact path="/presets">
            <PresetsScene />
          </Route>
          <Route exact path="/settings">
            <SettingsScene />
          </Route>
        </Switch>
      </RyzenControllerAppContext.Provider>
    );
  }
}

export default Scene;