// ==UserScript==
// @name                Youtube HD Premium
// @icon                https://www.youtube.com/img/favicon_48.png
// @version             3.1.2
// @author              RM
// @homepageURL         https://github.com/OD728/YTHDP
// @match               *://*.www.youtube.com/*
// @match               *://*.youtube-nocookie.com/embed/*
// @exclude             *://music.www.youtube.com/*
// @exclude             *://studio.www.youtube.com/*
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
// @grant               GM_info
// @grant               GM_xmlhttpRequest
// @license             MIT
// @description         Automatically switches to high quality (1080p+)
// @downloadURL         https://raw.githubusercontent.com/OD728/YTHDP/main/youtube-hd-premium.user.js
// @updateURL           https://raw.githubusercontent.com/OD728/YTHDP/main/youtube-hd-premium.user.js
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
        forceHD: 'Force HD (min 1080p)',
        checkForUpdates: 'Check for Updates', // New translation
        scriptUpdates: '─ Script Updates ─' // New translation
    };

    // Keep only HD resolutions (1080p and above)
    const QUALITIES = {
        highres: 4320, // 8K
        hd2160: 2160,  // 4K
        hd1440: 1440,  // 2K
        hd1080: 1080,  // Full HD
        auto: 0
    };

    const PREMIUM_INDICATOR_LABEL = "Premium";
    const SCRIPT_NAME_FOR_NOTIFICATIONS = "YouTube HD Premium"; // For notifications

    // -------------------------------
    // Global variables
    // -------------------------------
    let userSettings = { ...DEFAULT_SETTINGS };
    let useCompatibilityMode = typeof GM?.info === 'undefined'; // Check for GM.info for modern GM object
    let menuItems = [];
    let moviePlayer = null;
    let isOldTampermonkey = false;
    const updatedVersions = {
        Tampermonkey: '5.4.624', // Target Tampermonkey version for full menu features
    };
    let isScriptRecentlyUpdated = false; // Tracks if script was updated based on local version storage
    let retryCount = 0;
    const MAX_RETRIES = 3;


    // -------------------------------
    // GM FUNCTION OVERRIDES / HELPERS
    // -------------------------------
    // For GM functions, prefer GM.* if available, fallback to GM_*
    const _GM = {
        getValue: useCompatibilityMode ? GM_getValue : GM.getValue,
        setValue: useCompatibilityMode ? GM_setValue : GM.setValue,
        deleteValue: useCompatibilityMode ? GM_deleteValue : GM.deleteValue,
        listValues: useCompatibilityMode ? GM_listValues : GM.listValues,
        registerMenuCommand: useCompatibilityMode ? GM_registerMenuCommand : GM.registerMenuCommand,
        unregisterMenuCommand: useCompatibilityMode ? GM_unregisterMenuCommand : GM.unregisterMenuCommand,
        notification: useCompatibilityMode ? GM_notification : GM.notification,
        xmlHttpRequest: useCompatibilityMode ? GM_xmlhttpRequest : GM.xmlHttpRequest, // Added for updater
        info: useCompatibilityMode ? GM_info : GM.info // Added for updater
    };


    // -------------------------------
    // Debug logging helper
    // -------------------------------
    function debugLog(message) {
        if (!userSettings.debug) return;
        // Optional: Add more detailed caller info if needed, but basic is fine.
        console.log(`[YTHDP DEBUG ${new Date().toLocaleTimeString()}] ${message}`);
    }

    // -------------------------------
    // Video quality functions
    // -------------------------------
    function setResolution(force = false) {
        try {
            if (!moviePlayer || typeof moviePlayer.getAvailableQualityData !== 'function') {
                debugLog("Movie player not found or not ready for quality adjustment.");
                return;
            }
            const videoQualityData = moviePlayer.getAvailableQualityData();
            if (!videoQualityData || !videoQualityData.length) {
                debugLog("Quality options missing or not available yet.");
                return;
            }

            const currentPlaybackQuality = moviePlayer.getPlaybackQuality();
            const currentQualityLabel = moviePlayer.getPlaybackQualityLabel ? moviePlayer.getPlaybackQualityLabel() : currentPlaybackQuality; // Fallback for older players
            const availableQualityLevels = moviePlayer.getAvailableQualityLevels();

            if (!availableQualityLevels || !availableQualityLevels.length) {
                debugLog("Available quality levels array is empty.");
                return;
            }

            const hasHDQuality = availableQualityLevels.some(q => QUALITIES[q] >= 1080);

            if (userSettings.targetResolution === 'auto') {
                if (!currentPlaybackQuality || !currentQualityLabel) {
                    debugLog("Unable to determine current playback quality for auto mode.");
                    return;
                }

                const currentQualityValue = QUALITIES[currentPlaybackQuality] || 0;
                const isHDQuality = currentQualityValue >= 1080;
                const isPremiumQuality = typeof currentQualityLabel === 'string' && currentQualityLabel.trim().endsWith(PREMIUM_INDICATOR_LABEL);

                if (userSettings.forceHD && hasHDQuality && !isHDQuality) {
                    const hdQualityOptions = availableQualityLevels.filter(q => QUALITIES[q] >= 1080).sort((a,b) => QUALITIES[a] - QUALITIES[b]);
                    const targetHdQuality = hdQualityOptions[0]; // Lowest HD

                    if (targetHdQuality) {
                        const premiumData = videoQualityData.find(q => q.quality === targetHdQuality && q.qualityLabel.trim().endsWith(PREMIUM_INDICATOR_LABEL) && q.isPlayable);
                        moviePlayer.setPlaybackQualityRange(targetHdQuality, targetHdQuality, premiumData?.formatId);
                        debugLog(`Force HD: Auto mode upgraded to [${targetHdQuality}${premiumData ? " Premium" : ""}]`);
                        return;
                    }
                }
                // If not forcing HD or already HD, let YouTube decide or re-evaluate if not optimal
                const isOptimalQuality = videoQualityData.filter(q => q.quality === currentPlaybackQuality).length <= 1 || isPremiumQuality;
                if (!isOptimalQuality && moviePlayer.getVideoData) { // Ensure getVideoData exists
                     // This might cause a reload, use cautiously or only if strictly necessary
                     // moviePlayer.loadVideoById(moviePlayer.getVideoData().video_id);
                     debugLog(`Auto mode: Optimal quality check. Current: ${currentPlaybackQuality}. Premium: ${isPremiumQuality}`);
                }
                debugLog(`Setting quality to: [${TRANSLATIONS.autoModeName}] (current: ${currentPlaybackQuality})`);

            } else { // Manual target resolution
                let resolvedTarget = findNextAvailableQuality(userSettings.targetResolution, availableQualityLevels);
                if (!resolvedTarget) {
                    if (retryCount < MAX_RETRIES) {
                        retryCount++;
                        debugLog(`Target resolution ${userSettings.targetResolution} not found, retrying... (${retryCount}/${MAX_RETRIES})`);
                        setTimeout(() => setResolution(force), 1000);
                        return;
                    } else {
                        debugLog(`Max retries for ${userSettings.targetResolution}. Using best available: ${availableQualityLevels[0]}.`);
                        resolvedTarget = availableQualityLevels[0] || 'auto'; // Fallback to highest available
                        retryCount = 0; // Reset for next attempt
                    }
                } else {
                    retryCount = 0; // Success, reset retry count
                }

                if (resolvedTarget === 'auto') { // If fallback is auto, handle as auto
                     moviePlayer.setPlaybackQualityRange(undefined, undefined); // Let YouTube choose
                     debugLog(`Setting quality to: [${TRANSLATIONS.autoModeName}] after fallback.`);
                     return;
                }

                const premiumData = videoQualityData.find(q => q.quality === resolvedTarget && q.qualityLabel.trim().endsWith(PREMIUM_INDICATOR_LABEL) && q.isPlayable);
                moviePlayer.setPlaybackQualityRange(resolvedTarget, resolvedTarget, premiumData?.formatId);
                debugLog(`Setting quality to: [${resolvedTarget}${premiumData ? " Premium" : ""}]`);
            }
        } catch (error) {
            debugLog("Error in setResolution: " + error.message + (error.stack ? `\nStack: ${error.stack}`: ""));
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                debugLog(`Error encountered, retrying setResolution... (${retryCount}/${MAX_RETRIES})`);
                setTimeout(() => setResolution(force), 1000 + (retryCount * 500)); // Incremental backoff
            } else {
                debugLog("Max retries reached after error in setResolution.");
                retryCount = 0;
            }
        }
    }


    function findNextAvailableQuality(targetResolutionKey, availableQualities) {
        const targetValue = QUALITIES[targetResolutionKey];
        if (typeof targetValue === 'undefined') return null; // Invalid target key

        return availableQualities
            .map(qKey => ({ key: qKey, value: QUALITIES[qKey] || -1 })) // Map to objects with values, invalid to -1
            .filter(q => q.value !== -1) // Filter out qualities not in our QUALITIES map
            .sort((a, b) => b.value - a.value) // Sort from highest to lowest actual resolution value
            .find(q => q.value <= targetValue)?.key; // Find the best available that is <= target
    }

    function processNewPage() {
        debugLog('Processing new page or player update...');
        moviePlayer = document.querySelector('#movie_player, .html5-video-player'); // More generic player selector

        if (moviePlayer && typeof moviePlayer.getAvailableQualityData === 'function') {
            // Wait a bit for player to be fully ready, especially on SPA navigations
            setTimeout(() => {
                if (moviePlayer.getPlayerState && moviePlayer.getPlayerState() === 0) { // Ended state, possibly an ad
                    debugLog("Player in ended state, likely an ad. Waiting for main video content.");
                    // Could add a listener for state change here if needed
                } else {
                    setResolution();
                }
            }, 500); // Delay for player readiness
        } else {
            debugLog('Movie player not found or not ready on page load, will rely on event listeners or mutation observer.');
        }
    }

    // -------------------------------
    // Menu functions
    // -------------------------------
     function showMenuOptions() {
        const shouldAutoClose = isOldTampermonkey;
        removeMenuOptions(); // Clear existing before re-adding

        const menuStructure = [];

        // Expand/Collapse Menu Button
        if (!isOldTampermonkey) {
            menuStructure.push({
                label: () => `${TRANSLATIONS.qualityMenu} ${userSettings.expandMenu ? "🔼" : "🔽"}`,
                menuId: "menuExpandBtn",
                alwaysShow: true,
                handleClick: async function () {
                    userSettings.expandMenu = !userSettings.expandMenu;
                    await updateSetting('expandMenu', userSettings.expandMenu);
                    showMenuOptions(); // Rebuild menu
                },
            });
        }

        // Quality Options
        Object.entries(QUALITIES).forEach(([key, resolutionValue]) => {
            menuStructure.push({
                label: () => `${resolutionValue === 0 ? TRANSLATIONS.autoModeName : resolutionValue + 'p'} ${key === userSettings.targetResolution ? "✅" : ""}`,
                menuId: `quality_${key}`,
                handleClick: async function () {
                    if (userSettings.targetResolution === key) return;
                    userSettings.targetResolution = key;
                    await updateSetting('targetResolution', key);
                    setResolution(true); // Force set
                    showMenuOptions(); // Rebuild menu
                },
            });
        });

        // Separator for options
        menuStructure.push({ label: () => `─ Options ─`, menuId: "separator_options", alwaysShow: true, handleClick: () => {} });


        // Force HD Toggle
        menuStructure.push({
            label: () => `${TRANSLATIONS.forceHD} ${userSettings.forceHD ? "✅" : ""}`,
            menuId: "forceHDBtn",
            handleClick: async function () {
                userSettings.forceHD = !userSettings.forceHD;
                await updateSetting('forceHD', userSettings.forceHD);
                setResolution(true); // Re-evaluate with new Force HD setting
                showMenuOptions();
            },
        });

        // Debug Toggle
        menuStructure.push({
            label: () => `${TRANSLATIONS.debug} ${userSettings.debug ? "✅" : ""}`,
            menuId: "debugBtn",
            handleClick: async function () {
                userSettings.debug = !userSettings.debug;
                await updateSetting('debug', userSettings.debug);
                // No need to call showMenuOptions if debugLog itself checks userSettings.debug
                showMenuOptions(); // Still refresh menu for checkmark
            },
        });

        // Update Checker
        menuStructure.push({ label: () => TRANSLATIONS.scriptUpdates, menuId: "separator_updates", alwaysShow: true, handleClick: () => {} });
        menuStructure.push({
            label: () => TRANSLATIONS.checkForUpdates,
            menuId: "checkForUpdatesBtn",
            alwaysShow: true, // Always show update checker
            handleClick: async function () {
                await checkForOnlineUpdates();
            },
        });


        // Process and register menu items
        menuStructure.forEach(item => {
            // Show item if it's always shown, or if menu is expanded, or if old Tampermonkey (no expand concept)
            if (item.alwaysShow || userSettings.expandMenu || isOldTampermonkey) {
                const commandId = _GM.registerMenuCommand(item.label(), item.handleClick, {
                    id: item.menuId, // Use a unique ID if your GM supports it for unregistering
                    autoClose: shouldAutoClose,
                });
                menuItems.push(commandId || item.menuId); // Store commandId or menuId for unregistering
            }
        });
    }

    function removeMenuOptions() {
        while (menuItems.length) {
            const itemToRemove = menuItems.pop();
            try {
                // GM.unregisterMenuCommand might take the command ID returned by registerMenuCommand,
                // or the caption string if ID wasn't supported/returned.
                _GM.unregisterMenuCommand(itemToRemove);
            } catch (e) {
                debugLog(`Could not unregister menu item: ${itemToRemove} - ${e.message}`);
            }
        }
    }

    // -------------------------------
    // GreaseMonkey / Tampermonkey version checks
    // -------------------------------
    function compareVersionsUtil(v1, v2) { // Renamed to avoid conflict if global one exists
        try {
            if (!v1 || !v2) { debugLog("Invalid version string for comparison."); return 0; }
            if (v1 === v2) return 0;
            const parts1 = String(v1).split('.').map(Number);
            const parts2 = String(v2).split('.').map(Number);
            const len = Math.max(parts1.length, parts2.length);
            for (let i = 0; i < len; i++) {
                const num1 = parts1[i] || 0;
                const num2 = parts2[i] || 0;
                if (num1 > num2) return 1;
                if (num1 < num2) return -1;
            }
            return 0;
        } catch (error) {
            debugLog("Error comparing versions: " + error);
            return 0; // Treat as equal on error to avoid unintended behavior
        }
    }


    function hasGreasyMonkeyAPI() { // Remains similar, but use _GM.info
        if (typeof GM !== 'undefined' && typeof GM.info !== 'undefined') { // Modern GM object
            useCompatibilityMode = false;
            return true;
        }
        if (typeof GM_info !== 'undefined') { // Legacy GM_ functions
            useCompatibilityMode = true;
            debugLog("Running in GM_ compatibility mode.");
            return true;
        }
        debugLog("No recognized Greasemonkey API found.");
        return false;
    }


    function CheckTampermonkeyUpdated() {
        try {
            if (_GM.info.scriptHandler === "Tampermonkey" &&
                compareVersionsUtil(_GM.info.version, updatedVersions.Tampermonkey) < 0) { // Use < 0 for "less than"
                isOldTampermonkey = true;
                if (isScriptRecentlyUpdated) { // Only notify if script itself was just updated
                    _GM.notification({
                        text: TRANSLATIONS.tampermonkeyOutdatedAlertMessage,
                        title: SCRIPT_NAME_FOR_NOTIFICATIONS,
                        timeout: 15000
                    });
                }
            }
        } catch (e) {
            debugLog("Could not check Tampermonkey version: " + e.message);
        }
    }


    // -------------------------------
    // Storage helper functions
    // -------------------------------
    async function loadUserSettings() {
        try {
            const storedSettings = await _GM.getValue('settings', {}); // Default to empty object
            const tempSettings = { ...DEFAULT_SETTINGS }; // Start with defaults

            // Merge stored settings, ensuring only valid keys are used
            for (const key in DEFAULT_SETTINGS) {
                if (storedSettings.hasOwnProperty(key) && typeof storedSettings[key] === typeof DEFAULT_SETTINGS[key]) {
                    tempSettings[key] = storedSettings[key];
                }
            }
            // Handle specific migrations or validations
            if (!('forceHD' in tempSettings)) { // Example: if forceHD was added later
                tempSettings.forceHD = DEFAULT_SETTINGS.forceHD;
            }
            if (tempSettings.targetResolution && !QUALITIES.hasOwnProperty(tempSettings.targetResolution)) {
                 debugLog(`Migrated invalid resolution ${tempSettings.targetResolution} to default hd1080`);
                tempSettings.targetResolution = DEFAULT_SETTINGS.targetResolution;
            }

            userSettings = tempSettings;
            await _GM.setValue('settings', userSettings); // Save potentially migrated/validated settings
            debugLog(`Loaded user settings: ${JSON.stringify(userSettings)}.`);
        } catch (error) {
            debugLog("Error loading user settings: " + error.message + ". Using defaults.");
            userSettings = { ...DEFAULT_SETTINGS }; // Fallback to defaults on error
        }
    }

    async function updateSetting(key, value) {
        try {
            // Fetch current settings to ensure atomicity, though not strictly needed if userSettings is master
            let currentSettings = await _GM.getValue('settings', { ...DEFAULT_SETTINGS });
            currentSettings[key] = value;
            userSettings[key] = value; // Update in-memory copy too
            await _GM.setValue('settings', currentSettings);
            debugLog(`Setting updated: ${key} = ${value}`);
        } catch (error) {
            debugLog("Error updating setting: " + error.message);
        }
    }

    async function updateScriptInfo() { // Checks local script version against previously stored one
        try {
            const oldScriptInfo = await _GM.getValue('scriptInfo', null);
            const currentVersionFromMeta = getScriptVersionFromMeta(); // Get actual current version

            const newScriptInfo = {
                version: currentVersionFromMeta, // Use version from metadata
                lastRun: new Date().toISOString()
            };

            if (!oldScriptInfo || compareVersionsUtil(newScriptInfo.version, oldScriptInfo.version) !== 0) {
                isScriptRecentlyUpdated = true;
                // Consider if a notification for local version change is still desired,
                // now that there's an online update checker.
                // It can be useful to inform users of changes after their script manager auto-updates.
                 _GM.notification({
                     text: `Script updated to version ${newScriptInfo.version}. Key change: Focus on HD (1080p+) resolutions and improved 'Force HD'.`,
                     title: `${SCRIPT_NAME_FOR_NOTIFICATIONS} Updated`,
                     timeout: 10000
                 });
                debugLog(`Script version changed or first run. New version: ${newScriptInfo.version}`);
            }
            await _GM.setValue('scriptInfo', newScriptInfo);
        } catch (error) {
            debugLog("Error updating script info: " + error.message);
        }
    }


    async function cleanupOldStorage() {
        try {
            const allowedKeys = ['settings', 'scriptInfo']; // Define keys current script uses
            const keys = await _GM.listValues();
            for (const key of keys) {
                if (!allowedKeys.includes(key)) {
                    await _GM.deleteValue(key);
                    debugLog(`Deleted unused/old storage key: ${key}`);
                }
            }
        } catch (error) {
            debugLog("Error cleaning up old storage keys: " + error.message);
        }
    }

    // -------------------------------
    // Script metadata extraction
    // -------------------------------
    function getScriptVersionFromMeta() {
        try {
            const meta = _GM.info.scriptMetaStr || ""; // GM.info.script.header on modern TM
            const versionMatch = meta.match(/@version\s+([\w\d.-]+)/); // More specific version matching
            return versionMatch ? versionMatch[1].trim() : (_GM.info.script.version || "unknown"); // Fallback to GM.info.script.version
        } catch (e) {
            debugLog("Could not extract script version from metadata: " + e.message);
            return "unknown";
        }
    }

    // -------------------------------
    // NEW: Online Update Checker
    // -------------------------------
    async function checkForOnlineUpdates() {
        debugLog('Checking for online updates...');
        try {
            const currentVersion = getScriptVersionFromMeta();
            const updateURL = _GM.info.script.updateURL || _GM.info.script.downloadURL; // Use GM.info provided URLs

            if (!updateURL) {
                _GM.notification({ text: 'Update URL not defined in script metadata.', title: `${SCRIPT_NAME_FOR_NOTIFICATIONS} - Update Error`, timeout: 7000 });
                debugLog('Update URL is missing.');
                return;
            }

            _GM.xmlHttpRequest({
                method: 'GET',
                url: updateURL + '?_=' + Date.now(), // Cache buster
                headers: { 'Cache-Control': 'no-cache' },
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        const remoteVersionMatch = response.responseText.match(/@version\s+([\w\d.-]+)/);
                        if (remoteVersionMatch && remoteVersionMatch[1]) {
                            const remoteVersion = remoteVersionMatch[1].trim();
                            debugLog(`Current version: ${currentVersion}, Remote version: ${remoteVersion}`);
                            if (compareVersionsUtil(remoteVersion, currentVersion) > 0) {
                                _GM.notification({
                                    text: `A new version (${remoteVersion}) of ${SCRIPT_NAME_FOR_NOTIFICATIONS} is available! Click to install.`,
                                    title: `${SCRIPT_NAME_FOR_NOTIFICATIONS} - Update Available`,
                                    onclick: () => { window.open(_GM.info.script.downloadURL || updateURL, '_blank'); },
                                    timeout: 0 // Persist until clicked
                                });
                            } else {
                                _GM.notification({ text: `${SCRIPT_NAME_FOR_NOTIFICATIONS} (v${currentVersion}) is up to date.`, title: `${SCRIPT_NAME_FOR_NOTIFICATIONS} - Up to Date`, timeout: 5000 });
                            }
                        } else {
                            debugLog('Could not parse @version from remote script.');
                             _GM.notification({ text: 'Could not determine remote version.', title: `${SCRIPT_NAME_FOR_NOTIFICATIONS} - Update Check Failed`, timeout: 7000 });
                        }
                    } else {
                        debugLog(`Error fetching update: ${response.status} ${response.statusText}`);
                         _GM.notification({ text: `Error fetching update: ${response.statusText}`, title: `${SCRIPT_NAME_FOR_NOTIFICATIONS} - Update Check Failed`, timeout: 7000 });
                    }
                },
                onerror: function(error) {
                    debugLog(`Network error during update check: ${JSON.stringify(error)}`);
                     _GM.notification({ text: 'Network error during update check. See console.', title: `${SCRIPT_NAME_FOR_NOTIFICATIONS} - Update Check Failed`, timeout: 7000 });
                }
            });
        } catch(e) {
            debugLog("Error in checkForOnlineUpdates: " + e.message);
            _GM.notification({ text: 'Failed to check for updates. See console.', title: `${SCRIPT_NAME_FOR_NOTIFICATIONS} - Update Error`, timeout: 7000 });
        }
    }


    // -------------------------------
    // Enhanced event handling
    // -------------------------------
    function addEventListeners() {
        // Using a more robust way to detect player and page changes
        // Listen for yt-navigate-finish for SPA navigations
        window.addEventListener('yt-navigate-finish', processNewPageWithDelay, true);
        // Listen for yt-player-updated which signals player is ready or has changed
        window.addEventListener('yt-player-updated', processNewPageWithDelay, true);
        // Listen for player state changes, especially when video starts playing
        window.addEventListener('onStateChange', handlePlayerStateChange, true); // YouTube's own event
        // Sometimes 'yt-player-state-change' is used with detail object
        document.body.addEventListener('yt-player-state-change', handlePlayerStateChangeFromDetail, true);


        // Fallback MutationObserver for player element appearance/change
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.addedNodes.length) {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const playerElement = (node.id === 'movie_player' || node.classList?.contains('html5-video-player')) ? node : node.querySelector('#movie_player, .html5-video-player');
                            if (playerElement && playerElement !== moviePlayer) {
                                debugLog('Movie player detected or changed via MutationObserver.');
                                moviePlayer = playerElement;
                                processNewPageWithDelay(); // Process with delay
                                return; // Found player, no need to iterate further for this mutation batch
                            }
                        }
                    }
                }
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        debugLog("MutationObserver for player initialized.");
    }

    function processNewPageWithDelay() {
        // Debounce or delay to prevent rapid firing from multiple events
        setTimeout(() => {
            processNewPage();
        }, 300); // Adjust delay as needed
    }

    function handlePlayerStateChange(eventOrState) {
        // YouTube's onStateChange often passes state directly as number.
        // Custom events might pass it in event.detail.
        const state = typeof eventOrState === 'number' ? eventOrState : (eventOrState?.detail || -1);
        if (state === 1) { // Player state PLAYING
            debugLog("Player state changed to PLAYING. Re-evaluating resolution.");
            if (!moviePlayer) moviePlayer = document.querySelector('#movie_player, .html5-video-player');
            setResolution();
        }
    }
    function handlePlayerStateChangeFromDetail(event) {
        if(event.detail && typeof event.detail.newState === 'number'){ // Check specific structure of this event
            handlePlayerStateChange(event.detail.newState);
        } else if (typeof event.detail === 'number') { // Simpler case if detail is just the state number
            handlePlayerStateChange(event.detail);
        }
    }


    async function initialize() {
        debugLog("Initializing script...");
        try {
            if (!hasGreasyMonkeyAPI()) {
                console.error("YouTube HD Premium: Greasemonkey API not detected. Script cannot run.");
                return;
            }
            await cleanupOldStorage(); // Important to run early
            await loadUserSettings();   // Load settings before other operations
            await updateScriptInfo();   // Check local version, notify if changed
            CheckTampermonkeyUpdated(); // Check TM version

        } catch (error) {
            // debugLog already called in loadUserSettings on error, this is a higher level catch
            console.error("YouTube HD Premium: Critical error during initial settings load: " + error.message);
            // Fallback to default userSettings is handled within loadUserSettings
        }

        // Initial setup for the page
        // Run for top-level window (main page) and also for embeds if not an ad page
        const isEmbed = window.self !== window.top && !window.location.pathname.includes('/ads/');

        if (window.self === window.top || isEmbed) {
            processNewPage(); // Initial attempt to set resolution
            addEventListeners();  // Setup listeners for dynamic changes
            showMenuOptions();    // Setup menu commands
            debugLog("Initialization complete for main page or valid embed.");
        } else {
            debugLog("Script running in an iframe that is not a recognized embed, or an ad. No action taken.");
        }
    }

    // -------------------------------
    // Entry Point
    // -------------------------------
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initialize();
    } else {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    }

})();
