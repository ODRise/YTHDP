# YouTube HD Premium

A reliable userscript that automatically switches YouTube to high quality (1080p+) with intelligent quality management and customizable settings.

## 🎯 Features

- **Automatic HD Quality**: Automatically sets videos to 1080p or higher quality when available
- **Force HD Mode**: Ensures minimum 1080p quality even in auto mode
- **Smart Quality Selection**: Intelligent quality selection with Premium format preference
- **Tampermonkey Menu Integration**: Easy-to-use menu system for quality configuration
- **Persistent Settings**: Reliable settings storage with automatic migration
- **Premium Format Detection**: Prioritizes Premium formats when available
- **Retry Logic**: Robust retry mechanisms for reliability
- **Debug Mode**: Comprehensive logging for troubleshooting
- **Cross-Platform**: Works on main YouTube, mobile, and embedded players
- **HD Only**: Focuses on HD resolutions (1080p, 1440p, 2160p, 4320p) for optimal experience

## 🚀 Installation

1. Install a userscript manager:
   - **Chrome/Edge**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - **Firefox**: [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
   - **Safari**: [Tampermonkey](https://apps.apple.com/us/app/tampermonkey/id1482490089)

2. Copy the script code from the details section below
3. Create a new userscript in your manager and paste the code
4. Save and enable the script
5. Reload YouTube and check the Tampermonkey menu for options

## 🎛️ Configuration Options

The script provides several configuration options accessible through the Tampermonkey menu:

### Quality Settings
- **4320p (8K)**: Ultra-high resolution for supported content
- **2160p (4K)**: High resolution for 4K displays
- **1440p (2K)**: Quad HD resolution
- **1080p (Full HD)**: Standard high definition (default)
- **Optimized Auto**: Intelligent automatic quality selection

### Advanced Options
- **Force HD**: Ensures minimum 1080p quality when available in auto mode
- **Debug Mode**: Enables detailed console logging for troubleshooting
- **Expandable Menu**: Show/hide advanced menu options (newer Tampermonkey versions)

## 📋 Script Code

<details>
<summary>Click to expand the complete userscript code</summary>

```javascript
// ==UserScript==
// @name                Youtube HD Premium
// @icon                https://www.youtube.com/img/favicon_48.png
// @version             v1
// @author              RM
// @match               *://www.youtube.com/*
// @match               *://m.youtube.com/*
// @match               *://www.youtube-nocookie.com/*
// @exclude             *://www.youtube.com/live_chat*
// @grant               GM.getValue
// @grant               GM.setValue
// @grant               GM.deleteValue
// @grant               GM.listValues
// @grant               GM.registerMenuCommand
// @grant               GM.unregisterMenuCommand
// @grant               GM.notification
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_deleteValue
// @grant               GM_listValues
// @grant               GM_registerMenuCommand
// @grant               GM_unregisterMenuCommand
// @grant               GM_notification
// @license             MIT
// @description         Automatically switches to high quality (1080p+)

// ==/UserScript==

/*jshint esversion: 11 */

(function () {
    "use strict";

    // -------------------------------
    // Default settings (for storage key "settings")
    // -------------------------------
    const DEFAULT_SETTINGS = {
        targetResolution: "hd1080", // Default to 1080p
        expandMenu: false,
        debug: false,
        forceHD: true // New option to force minimum 1080p when available
    };

    // -------------------------------
    // Translations - English only
    // -------------------------------
    const TRANSLATIONS = {
        tampermonkeyOutdatedAlertMessage: "It looks like you're using an older version of Tampermonkey that might cause menu issues. For the best experience, please update to version 5.4.6224 or later.",
        qualityMenu: 'Quality Menu',
        autoModeName: 'Optimized Auto',
        debug: 'DEBUG',
        forceHD: 'Force HD (min 1080p)'
    };

    // Keep only HD resolutions (1080p and above)
    const QUALITIES = {
        highres: 4320,
        hd2160: 2160,
        hd1440: 1440,
        hd1080: 1080,
        auto: 0
    };

    const PREMIUM_INDICATOR_LABEL = "Premium";

    // -------------------------------
    // Global variables
    // -------------------------------
    let userSettings = { ...DEFAULT_SETTINGS };
    let useCompatibilityMode = false;
    let menuItems = [];
    let moviePlayer = null;
    let isOldTampermonkey = false;
    const updatedVersions = {
        Tampermonkey: '5.4.624',
    };
    let isScriptRecentlyUpdated = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // -------------------------------
    // GM FUNCTION OVERRIDES
    // -------------------------------
    const GMCustomRegisterMenuCommand = useCompatibilityMode ? GM_registerMenuCommand : GM.registerMenuCommand;
    const GMCustomUnregisterMenuCommand = useCompatibilityMode ? GM_unregisterMenuCommand : GM.unregisterMenuCommand;
    const GMCustomGetValue = useCompatibilityMode ? GM_getValue : GM.getValue;
    const GMCustomSetValue = useCompatibilityMode ? GM_setValue : GM.setValue;
    const GMCustomDeleteValue = useCompatibilityMode ? GM_deleteValue : GM.deleteValue;
    const GMCustomListValues = useCompatibilityMode ? GM_listValues : GM.listValues;
    const GMCustomNotification = useCompatibilityMode ? GM_notification : GM.notification;

    // -------------------------------
    // Debug logging helper
    // -------------------------------
    function debugLog(message) {
        if (!userSettings.debug) return;
        const stack = new Error().stack;
        const stackLines = stack.split("\n");
        const callerLine = stackLines[2] ? stackLines[2].trim() : "Line not found";
        if (!message.endsWith(".")) {
            message += ".";
        }
        console.log(`[YTHD DEBUG] ${message} Function called ${callerLine}`);
    }

    // -------------------------------
    // Video quality functions
    // -------------------------------
    function setResolution(force = false) {
        try {
            if (!moviePlayer) throw "Movie player not found.";
            const videoQualityData = moviePlayer.getAvailableQualityData();
            const currentPlaybackQuality = moviePlayer.getPlaybackQuality();
            const currentQualityLabel = moviePlayer.getPlaybackQualityLabel();
            if (!videoQualityData.length) throw "Quality options missing.";

            // Get available quality levels
            const availableQualityLevels = moviePlayer.getAvailableQualityLevels();

            // Check if HD quality is available
            const hasHDQuality = availableQualityLevels.some(q => QUALITIES[q] >= 1080);

            if (userSettings.targetResolution === 'auto') {
                if (!currentPlaybackQuality || !currentQualityLabel) throw "Unable to determine current playback quality.";

                const currentQualityValue = QUALITIES[currentPlaybackQuality] || 0;
                const isHDQuality = currentQualityValue >= 1080;
                const isPremiumQuality = currentQualityLabel.trim().endsWith(PREMIUM_INDICATOR_LABEL);

                // If Force HD is enabled, check if we need to upgrade quality
                if (userSettings.forceHD && hasHDQuality && !isHDQuality) {
                    // Find the lowest HD quality available
                    const hdQuality = availableQualityLevels.find(q => QUALITIES[q] >= 1080);
                    if (hdQuality) {
                        const premiumData = videoQualityData.find(q =>
                            q.quality === hdQuality &&
                            q.qualityLabel.trim().endsWith(PREMIUM_INDICATOR_LABEL) &&
                            q.isPlayable
                        );
                        moviePlayer.setPlaybackQualityRange(hdQuality, hdQuality, premiumData?.formatId);
                        debugLog(`Force HD enabled: Setting quality to [${hdQuality}${premiumData ? " Premium" : ""}]`);
                        return;
                    }
                }

                const isOptimalQuality = videoQualityData.filter(q => q.quality == currentPlaybackQuality).length <= 1 ||
                    isPremiumQuality;
                if (!isOptimalQuality) moviePlayer.loadVideoById(moviePlayer.getVideoData().video_id);
                debugLog(`Setting quality to: [${TRANSLATIONS.autoModeName}]`);
            } else {
                let resolvedTarget = findNextAvailableQuality(userSettings.targetResolution, availableQualityLevels);
                if (!resolvedTarget) {
                    // Retry mechanism if target resolution is not found
                    if (retryCount < MAX_RETRIES) {
                        retryCount++;
                        debugLog(`Resolution not found, retrying... (${retryCount}/${MAX_RETRIES})`);
                        setTimeout(() => setResolution(force), 1000);
                        return;
                    } else {
                        debugLog("Max retries reached, using best available quality.");
                        resolvedTarget = availableQualityLevels[0] || 'auto';
                        retryCount = 0;
                    }
                } else {
                    retryCount = 0;
                }

                const premiumData = videoQualityData.find(q =>
                    q.quality === resolvedTarget &&
                    q.qualityLabel.trim().endsWith(PREMIUM_INDICATOR_LABEL) &&
                    q.isPlayable
                );
                moviePlayer.setPlaybackQualityRange(resolvedTarget, resolvedTarget, premiumData?.formatId);
                debugLog(`Setting quality to: [${resolvedTarget}${premiumData ? " Premium" : ""}]`);
            }
        } catch (error) {
            debugLog("Did not set resolution. " + error);
            // Retry on errors if we haven't exceeded max retries
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                debugLog(`Error encountered, retrying... (${retryCount}/${MAX_RETRIES})`);
                setTimeout(() => setResolution(force), 1000);
            } else {
                retryCount = 0;
            }
        }
    }

    function findNextAvailableQuality(target, availableQualities) {
        const targetValue = QUALITIES[target];
        return availableQualities
            .map(q => ({ quality: q, value: QUALITIES[q] || 0 }))
            .sort((a, b) => b.value - a.value) // Sort by highest to lowest
            .find(q => q.value <= targetValue)?.quality;
    }

    function processNewPage() {
        debugLog('Processing new page...');
        moviePlayer = document.querySelector('#movie_player');

        // If immediately available, set the resolution
        if (moviePlayer) {
            setResolution();
        } else {
            // If not available yet, try again after a short delay
            debugLog('Movie player not found, will retry...');
            setTimeout(() => {
                moviePlayer = document.querySelector('#movie_player');
                if (moviePlayer) {
                    setResolution();
                } else {
                    debugLog('Movie player still not found after delay');
                }
            }, 2000);
        }

        // Also listen for new video data to ensure resolution is applied
        document.addEventListener('yt-navigate-finish', () => {
            setTimeout(() => {
                if (!moviePlayer) moviePlayer = document.querySelector('#movie_player');
                setResolution();
            }, 1000);
        }, { once: true });
    }

    // -------------------------------
    // Menu functions
    // -------------------------------
    function processMenuOptions(options, callback) {
        Object.values(options).forEach(option => {
            if (!option.alwaysShow && !userSettings.expandMenu && !isOldTampermonkey) return;
            if (option.items) {
                option.items.forEach(item => callback(item));
            } else {
                callback(option);
            }
        });
    }

    // The menu callbacks now use the helper "updateSetting" to update the stored settings.
    function showMenuOptions() {
        const shouldAutoClose = isOldTampermonkey;
        removeMenuOptions();
        const menuExpandButton = isOldTampermonkey ? {} : {
            expandMenu: {
                alwaysShow: true,
                label: () => `${TRANSLATIONS.qualityMenu} ${userSettings.expandMenu ? "🔼" : "🔽"}`,
                menuId: "menuExpandBtn",
                handleClick: async function () {
                    userSettings.expandMenu = !userSettings.expandMenu;
                    await updateSetting('expandMenu', userSettings.expandMenu);
                    showMenuOptions();
                },
            },
        };
        const menuOptions = {
            ...menuExpandButton,
            qualities: {
                items: Object.entries(QUALITIES).map(([label, resolution]) => ({
                    label: () => `${resolution === 0 ? TRANSLATIONS.autoModeName : resolution + 'p'} ${label === userSettings.targetResolution ? "✅" : ""}`,
                    menuId: label,
                    handleClick: async function () {
                        if (userSettings.targetResolution === label) return;
                        userSettings.targetResolution = label;
                        await updateSetting('targetResolution', label);
                        setResolution(true);
                        showMenuOptions();
                    },
                })),
            },
            forceHD: {
                label: () => `${TRANSLATIONS.forceHD} ${userSettings.forceHD ? "✅" : ""}`,
                menuId: "forceHDBtn",
                handleClick: async function () {
                    userSettings.forceHD = !userSettings.forceHD;
                    await updateSetting('forceHD', userSettings.forceHD);
                    setResolution(true);
                    showMenuOptions();
                },
            },
            debug: {
                label: () => `${TRANSLATIONS.debug} ${userSettings.debug ? "✅" : ""}`,
                menuId: "debugBtn",
                handleClick: async function () {
                    userSettings.debug = !userSettings.debug;
                    await updateSetting('debug', userSettings.debug);
                    showMenuOptions();
                },
            },
        };

        processMenuOptions(menuOptions, (item) => {
            GMCustomRegisterMenuCommand(item.label(), item.handleClick, {
                id: item.menuId,
                autoClose: shouldAutoClose,
            });
            menuItems.push(item.menuId);
        });
    }

    function removeMenuOptions() {
        while (menuItems.length) {
            GMCustomUnregisterMenuCommand(menuItems.pop());
        }
    }

    // -------------------------------
    // GreaseMonkey / Tampermonkey version checks
    // -------------------------------
    function compareVersions(v1, v2) {
        try {
            if (!v1 || !v2) throw "Invalid version string.";
            if (v1 === v2) return 0;
            const parts1 = v1.split('.').map(Number);
            const parts2 = v2.split('.').map(Number);
            const len = Math.max(parts1.length, parts2.length);
            for (let i = 0; i < len; i++) {
                const num1 = parts1[i] || 0;
                const num2 = parts2[i] || 0;
                if (num1 > num2) return 1;
                if (num1 < num2) return -1;
            }
            return 0;
        } catch (error) {
            throw ("Error comparing versions: " + error);
        }
    }

    function hasGreasyMonkeyAPI() {
        if (typeof GM !== 'undefined') return true;
        if (typeof GM_info !== 'undefined') {
            useCompatibilityMode = true;
            debugLog("Running in compatibility mode.");
            return true;
        }
        return false;
    }

    function CheckTampermonkeyUpdated() {
        if (GM_info.scriptHandler === "Tampermonkey" &&
            compareVersions(GM_info.version, updatedVersions.Tampermonkey) !== 1) {
            isOldTampermonkey = true;
            if (isScriptRecentlyUpdated) {
                GMCustomNotification({
                    text: TRANSLATIONS.tampermonkeyOutdatedAlertMessage,
                    timeout: 15000
                });
            }
        }
    }

    // -------------------------------
    // Storage helper functions
    // -------------------------------

    /**
     * Load user settings from the "settings" key.
     * Ensures that only keys existing in DEFAULT_SETTINGS are kept.
     * If no stored settings are found, defaults are used.
     */
    async function loadUserSettings() {
        try {
            const storedSettings = await GMCustomGetValue('settings', {});

            // Check for the legacy versions without forceHD option
            if (storedSettings && !('forceHD' in storedSettings)) {
                storedSettings.forceHD = DEFAULT_SETTINGS.forceHD;
            }

            userSettings = Object.keys(DEFAULT_SETTINGS).reduce((accumulator, key) => {
                accumulator[key] = storedSettings.hasOwnProperty(key) ? storedSettings[key] : DEFAULT_SETTINGS[key];
                return accumulator;
            }, {});

            // Migration: If stored resolution is below 1080p, upgrade it
            const storedResolution = storedSettings.targetResolution;
            if (storedResolution && !QUALITIES.hasOwnProperty(storedResolution)) {
                userSettings.targetResolution = 'hd1080';
                debugLog(`Migrated resolution from ${storedResolution} to hd1080`);
            }

            await GMCustomSetValue('settings', userSettings);
            debugLog(`Loaded user settings: ${JSON.stringify(userSettings)}.`);
        } catch (error) {
            throw error;
        }
    }

    // Update one setting in the stored settings.
    async function updateSetting(key, value) {
        try {
            let currentSettings = await GMCustomGetValue('settings', DEFAULT_SETTINGS);
            currentSettings[key] = value;
            await GMCustomSetValue('settings', currentSettings);
        } catch (error) {
            debugLog("Error updating setting: " + error);
        }
    }

    async function updateScriptInfo() {
        try {
            const oldScriptInfo = await GMCustomGetValue('scriptInfo', null);
            debugLog(`Previous script info: ${JSON.stringify(oldScriptInfo)}`);
            const newScriptInfo = {
                version: getScriptVersionFromMeta(),
                lastRun: new Date().toISOString()
            };
            await GMCustomSetValue('scriptInfo', newScriptInfo);

            if (!oldScriptInfo || compareVersions(newScriptInfo.version, oldScriptInfo?.version) !== 0) {
                isScriptRecentlyUpdated = true;

                // Show update notification
                GMCustomNotification({
                    text: "YouTube HD Premium has been updated to remove resolutions below 1080p and add Force HD option",
                    title: "YouTube HD Premium Updated",
                    timeout: 10000
                });
            }
            debugLog(`Updated script info: ${JSON.stringify(newScriptInfo)}`);
        } catch (error) {
            debugLog("Error updating script info: " + error);
        }
    }

    // Cleanup any leftover keys from previous versions.
    async function cleanupOldStorage() {
        try {
            const allowedKeys = ['settings', 'scriptInfo'];
            const keys = await GMCustomListValues();
            for (const key of keys) {
                if (!allowedKeys.includes(key)) {
                    await GMCustomDeleteValue(key);
                    debugLog(`Deleted leftover key: ${key}`);
                }
            }
        } catch (error) {
            debugLog("Error cleaning up old storage keys: " + error);
        }
    }

    // -------------------------------
    // Script metadata extraction
    // -------------------------------
    function getScriptVersionFromMeta() {
        const meta = GM_info.scriptMetaStr;
        const versionMatch = meta.match(/@version\s+([^\r\n]+)/);
        return versionMatch ? versionMatch[1].trim() : null;
    }

    // -------------------------------
    // Enhanced event handling
    // -------------------------------
    function addEventListeners() {
        if (window.location.hostname === "m.youtube.com") {
            window.addEventListener('state-navigateend', processNewPage, true);
        } else {
            window.addEventListener('yt-player-updated', processNewPage, true);
            window.addEventListener('yt-page-data-updated', processNewPage, true);

            // Additional event listeners for better reliability
            window.addEventListener('yt-player-state-change', () => {
                if (moviePlayer && moviePlayer.getPlayerState() === 1) { // Playing state
                    setResolution();
                }
            }, true);
        }

        // Add mutation observer to detect player changes
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.addedNodes.length) {
                    const player = document.querySelector('#movie_player');
                    if (player && player !== moviePlayer) {
                        moviePlayer = player;
                        debugLog('Player detected via mutation observer');
                        setResolution();
                        break;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async function initialize() {
        try {
            if (!hasGreasyMonkeyAPI()) throw "Did not detect valid Grease Monkey API";
            await cleanupOldStorage();
            await loadUserSettings();
            await updateScriptInfo();
            CheckTampermonkeyUpdated();
        } catch (error) {
            debugLog(`Error loading user settings: ${error}. Loading with default settings.`);
        }
        if (window.self === window.top) {
            processNewPage(); // Ensure initial resolution update on first load.
            window.addEventListener('yt-navigate-finish', addEventListeners, { once: true });
            showMenuOptions();
        } else {
            window.addEventListener('loadstart', processNewPage, true);
            // Also process for embedded videos immediately
            processNewPage();
        }
    }

    // -------------------------------
    // Entry Point
    // -------------------------------
    initialize();
})();
```

</details>

## 🔧 Usage

Once installed, the script works automatically:

1. **Automatic Quality**: Videos automatically start in 1080p+ when available
2. **Menu Access**: Access settings through Tampermonkey menu (browser toolbar → Tampermonkey → YouTube HD Premium)
3. **Quality Selection**: Choose from 1080p, 1440p, 2160p, 4320p, or Optimized Auto
4. **Force HD**: Enable to ensure minimum 1080p quality even in auto mode
5. **Debug Mode**: Enable for detailed console logging

### Menu Options Explained

| Option | Description |
|--------|-------------|
| **4320p ✅** | Ultra HD (8K) - Currently selected |
| **2160p** | 4K Ultra HD - Available option |
| **1440p** | Quad HD (2K) - Available option |
| **1080p** | Full HD - Available option |
| **Optimized Auto** | Intelligent auto-selection with Premium preference |
| **Force HD ✅** | Minimum 1080p enabled |
| **Debug** | Console logging disabled |

*Note: ✅ indicates currently selected options*

### Quality Selection Process

1. **Click Tampermonkey icon** in browser toolbar
2. **Select quality option** from the menu
3. **Quality applies immediately** to the current video
4. **Menu updates** to show your new selection with ✅
5. **Settings persist** across browser sessions

### Verification

To verify the script is working:

1. **Play a video** on YouTube
2. **Check video quality** by right-clicking video → "Stats for nerds"
3. **Access Tampermonkey menu** to see current settings with ✅ indicators
4. **Look for console messages** (F12 → Console) if debug mode is enabled

## 🖥️ Browser Compatibility

- **Chrome/Chromium** ✅ Full support with Tampermonkey
- **Firefox** ✅ Full support with Tampermonkey/Greasemonkey  
- **Edge** ✅ Full support with Tampermonkey
- **Safari** ⚠️ Limited support (Tampermonkey required)

### Userscript Manager Compatibility

| Manager | Support Level | Notes |
|---------|---------------|-------|
| **Tampermonkey** | ✅ Full | Recommended - all features work including expandable menu |
| **Greasemonkey** | ⚠️ Limited | Basic functionality, simplified menu on older versions |
| **Violentmonkey** | ✅ Good | Most features work |

## 📊 How It Works

### Quality Detection
- **Player API Integration**: Uses YouTube's internal player API methods
- **Available Quality Scanning**: Checks `getAvailableQualityLevels()` for HD options
- **Premium Format Detection**: Identifies and prioritizes Premium formats
- **Fallback Logic**: Gracefully handles unavailable quality levels

### Smart Selection Logic
- **Auto Mode**: Uses "Optimized Auto" with Force HD when enabled
- **Manual Mode**: Sets specific resolution (1080p, 1440p, 2160p, 4320p)
- **Retry Mechanism**: Retries up to 3 times if quality setting fails
- **Player State Monitoring**: Reapplies quality on video state changes

### Force HD Feature
When enabled in Auto mode:
- **Scans for HD availability**: Checks if any 1080p+ quality is available
- **Upgrades quality**: Automatically upgrades from lower quality to HD
- **Finds optimal HD**: Selects the best available HD quality
- **Premium preference**: Chooses Premium format when available

## 🐛 Troubleshooting

### Quality Not Changing
1. **Check available quality**: Some videos don't have HD versions
2. **Enable debug mode**: Check console for detailed logs
3. **Verify Tampermonkey**: Ensure the script is enabled and running
4. **Try different quality**: Some videos may not support specific resolutions

### Menu Not Appearing
1. **Check Tampermonkey version**: Update to 5.4.6224+ for best compatibility
2. **Script permissions**: Ensure all GM permissions are granted
3. **Browser compatibility**: Some browsers have limited menu support
4. **Refresh page**: Try refreshing YouTube after script installation

### Force HD Not Working
1. **Video availability**: Not all videos have HD versions available
2. **Auto mode required**: Force HD only works when "Optimized Auto" is selected
3. **Check debug logs**: Enable debug mode to see Force HD decisions
4. **Player detection**: Script needs to detect the video player first

### Debug Commands

Enable debug logging:
```javascript
// Access Tampermonkey menu and enable "DEBUG" option
// Or open browser console (F12) and check for [YTHD DEBUG] messages
```

Check script functionality:
```javascript
// Look for these console messages when debug is enabled:
// "Processing new page..."
// "Setting quality to: [resolution]"
// "Force HD enabled: Setting quality to [resolution]"
```

## 🔧 Technical Details

### Core Functions
- **`setResolution()`**: Main quality setting logic with retry mechanism
- **`findNextAvailableQuality()`**: Finds best available quality for target resolution
- **`processNewPage()`**: Handles page navigation and player detection
- **`showMenuOptions()`**: Builds and displays the Tampermonkey menu

### Event Handling
- **YouTube Navigation**: Listens for `yt-player-updated`, `yt-page-data-updated`
- **Player State Changes**: Monitors video play state for quality reapplication
- **Mutation Observer**: Detects dynamic player element changes
- **Mobile Support**: Handles `state-navigateend` for mobile YouTube

### Storage System
- **Settings Persistence**: Uses GM storage API for reliable settings storage
- **Migration Support**: Automatically migrates from older script versions
- **Cleanup Logic**: Removes obsolete storage keys from previous versions
- **Default Fallbacks**: Uses sensible defaults when storage is unavailable

## 📝 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

Found a bug or have an improvement? Feel free to:

- **Report Issues**: Submit detailed bug reports with console logs
- **Feature Requests**: Suggest new quality management features
- **Testing**: Test on different browsers and YouTube layouts
- **Compatibility**: Help with userscript manager compatibility

### Known Limitations

- **API Dependency**: Relies on YouTube's internal player API which may change
- **HD Content Only**: Focuses on HD resolutions, doesn't handle lower qualities
- **Tampermonkey Recommended**: Best experience with Tampermonkey vs other managers
- **Live Streams**: May have limited functionality on live streaming content

---

**Note**: This script works by interfacing with YouTube's internal player API. It's designed to be reliable and non-intrusive, using YouTube's own quality selection mechanisms.