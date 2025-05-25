# YouTube HD Premium

A reliable userscript that automatically switches YouTube to high quality (1080p+) with intelligent quality management and customizable settings.

## 🎯 Features

- **Automatic HD Quality**: Automatically sets videos to 1080p or higher quality (up to 8K) when available.
- **Force HD Mode**: Ensures minimum 1080p quality even when "Optimized Auto" is selected, if HD is available.
- **Smart Quality Selection**: Intelligent quality selection with preference for YouTube Premium formats if detected.
- **Tampermonkey Menu Integration**: Easy-to-use menu system for quality configuration and other settings.
- **Persistent Settings**: Reliable settings storage with automatic migration for new options.
- **Premium Format Awareness**: Considers "Premium" labeled formats when available for the chosen quality.
- **Robust Retry Logic**: Implements retries if quality setting fails initially.
- **Debug Mode**: Comprehensive console logging for troubleshooting.
- **Update Checker**: Option to manually check for new script versions.
- **HD Focus**: Prioritizes HD resolutions (1080p, 1440p, 2160p, 4320p) for an optimal viewing experience.
- **Compatibility**: Works on main YouTube site and YouTube embeds (youtube-nocookie.com).

## 🚀 Installation

1.  **Install a userscript manager** (if you don't have one already):
    * **Chrome/Edge**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
    * **Firefox**: [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
    * **Safari**: [Tampermonkey](https://apps.apple.com/us/app/tampermonkey/id1482490089)

2.  **Click the link below to install the script**:
    * [**Install YouTube HD Premium**](https://raw.githubusercontent.com/ODRise/YTHDP/main/youtube-hd-premium.user.js)

3.  Your userscript manager should prompt you to confirm the installation.
4.  Once installed, the script should be automatically enabled.
5.  Reload any open YouTube pages and check the Tampermonkey menu (usually accessible via the extension icon in your browser's toolbar) for "YouTube HD Premium" options.

## 🎛️ Configuration Options

The script provides several configuration options accessible through the Tampermonkey menu:

### Quality Menu (Expandable)
Click the "Quality Menu 🔽" (or 🔼 if expanded) to show/hide quality options.

### Quality Settings
-   **4320p (8K)**: Ultra-high resolution for supported content.
-   **2160p (4K)**: High resolution for 4K displays.
-   **1440p (2K)**: Quad HD resolution.
-   **1080p (Full HD)**: Standard high definition (default).
-   **Optimized Auto**: Intelligent automatic quality selection by YouTube, potentially enhanced by "Force HD".

### Options
-   **Force HD (min 1080p)**: When "Optimized Auto" quality is selected, this option ensures the quality is at least 1080p if an HD version is available.
-   **DEBUG**: Enables detailed console logging for troubleshooting.

### Script Updates
-   **Check for Updates**: Manually triggers a check for a newer version of the script.

*A ✅ next to an option indicates it is currently active/selected.*

## 🔧 Usage

Once installed, the script works automatically:

1.  **Automatic Quality**: Videos automatically attempt to start in your selected HD quality (default: 1080p) or higher, when available.
2.  **Menu Access**: Access settings through the Tampermonkey menu. Click the Tampermonkey icon in your browser toolbar, and you should see "YouTube HD Premium" with its submenu options.
3.  **Quality Selection**: Choose your preferred resolution (1080p, 1440p, 2160p, 4320p) or "Optimized Auto".
4.  **Force HD**: Enable this if you use "Optimized Auto" but still want to ensure at least 1080p playback when possible.
5.  **Debug Mode**: Enable for troubleshooting if you encounter issues. Check the browser console (F12) for logs prefixed with `[YTHDP DEBUG]`.

### Quality Selection Process

1.  Click the Tampermonkey icon in your browser toolbar.
2.  Find "YouTube HD Premium" in the menu.
3.  If quality options are hidden, click "Quality Menu 🔽" to expand them.
4.  Select your desired quality option. The menu will update with a ✅ next to your choice.
5.  The script will attempt to apply this quality to the current video (if playing) and future videos.
6.  Settings are saved and persist across browser sessions.

### Verification

To verify the script is working:

1.  Play a video on YouTube.
2.  Check the video quality by clicking the gear icon in the YouTube player, then "Quality". Your selected quality (or higher, if YouTube picked a better "Auto" option influenced by "Force HD") should be active or available.
3.  For more detailed info, right-click the video and select "Stats for nerds". Look at "Current / Optimal Res".
4.  Access the Tampermonkey menu to see current settings with ✅ indicators.
5.  Enable "DEBUG" mode and check the browser console (F12) for messages from the script.

## 🖥️ Browser Compatibility

-   **Chrome/Chromium** ✅ Full support with Tampermonkey.
-   **Firefox** ✅ Full support with Tampermonkey. Greasemonkey might have limitations with menu features.
-   **Edge** ✅ Full support with Tampermonkey.
-   **Safari** ⚠️ Limited support (Tampermonkey required, menu features may vary).

### Userscript Manager Compatibility

| Manager         | Support Level | Notes                                                              |
| --------------- | ------------- | ------------------------------------------------------------------ |
| **Tampermonkey** | ✅ Full       | Recommended - all features work including expandable dynamic menu. |
| **Greasemonkey** | ⚠️ Limited    | Basic functionality works. Menu might be static or less dynamic.     |
| **Violentmonkey** | ✅ Good       | Most features should work, menu behavior might vary slightly.        |

## 📊 How It Works

### Quality Detection & Setting
-   **Player API Integration**: Uses YouTube's internal player API methods like `getAvailableQualityData()`, `getAvailableQualityLevels()`, and `setPlaybackQualityRange()`.
-   **Available Quality Scanning**: Checks available qualities to find the best match for the user's target resolution.
-   **Premium Format Awareness**: When setting quality, it checks if a "Premium" labeled format is available for the target resolution and attempts to use it.
-   **Fallback Logic**: If the exact target quality isn't available, it tries to select the next best available quality that is still equal to or lower than the target. If all else fails, it may fall back to YouTube's auto or the highest available.
-   **Retry Mechanism**: If setting the quality fails (e.g., player not ready), it retries a few times with increasing delays.

### Smart Selection & "Force HD"
-   **Optimized Auto Mode**: When selected, it generally lets YouTube decide the quality.
-   **Force HD Feature**: If "Optimized Auto" is selected AND "Force HD" is enabled, the script checks if the current quality is below 1080p. If HD (1080p+) is available, it forces an upgrade to at least 1080p, preferring a Premium version if available.

### Event Handling & Dynamic Content
-   **YouTube Navigation**: Listens for YouTube's specific navigation events (`yt-navigate-finish`, `yt-player-updated`) to re-apply settings on new videos or when the player updates.
-   **Player State Changes**: Monitors video play state (e.g., when a video starts playing) to ensure quality is set correctly.
-   **Mutation Observer**: A fallback mechanism to detect dynamic changes to the player element in the DOM.

## 🐛 Troubleshooting

### Quality Not Changing
1.  **Check Video Availability**: Not all videos are uploaded in all HD qualities. The script can only select qualities that YouTube makes available for that specific video.
2.  **Enable Debug Mode**: Access the Tampermonkey menu, enable "DEBUG", and open your browser console (F12). Look for messages from `[YTHDP DEBUG]` which might explain why a quality was or wasn't set.
3.  **Verify Script is Active**: Ensure "YouTube HD Premium" is enabled in your Tampermonkey dashboard.
4.  **Internet Connection**: A slow or unstable connection might cause YouTube to override quality settings.
5.  **Conflicting Extensions/Scripts**: Try disabling other YouTube-related extensions or userscripts to see if there's a conflict.

### Menu Not Appearing or Behaving Oddly
1.  **Tampermonkey Version**: For the best menu experience (expandable options), ensure your Tampermonkey is up to date (v5.4.6224 or later is a good target). Older versions might show a more basic, static menu.
2.  **Script Permissions**: In Tampermonkey, check that the script has all necessary permissions granted (usually related to `GM.*` functions).
3.  **Refresh Page**: After installation or significant changes, a hard refresh (Ctrl+F5 or Cmd+Shift+R) of the YouTube page might be needed.

### "Force HD" Not Working
1.  **"Optimized Auto" Must Be Selected**: The "Force HD" option only applies when your target quality is set to "Optimized Auto".
2.  **HD Must Be Available**: If the video itself doesn't have any 1080p or higher qualities, "Force HD" cannot create them.
3.  **Check Debug Logs**: Enable "DEBUG" mode to see if the script attempts to apply "Force HD" and what decisions it makes.

## 📝 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

Found a bug or have an improvement? Please feel free to:
-   Open an issue on the [GitHub repository](https://github.com/ODRise/YTHDP).
-   Submit a pull request with your changes.

### Known Limitations
-   **API Dependency**: Relies on YouTube's internal player API, which can change without notice, potentially breaking script functionality until updated.
-   **Live Streams**: Quality selection on live streams can be limited by YouTube.
-   **Dynamic Menu Updates**: While settings apply immediately, the visual checkmarks (✅) in the Tampermonkey menu might only update after the menu is closed and reopened, or in some cases, after a page refresh, depending on the userscript manager.

---

**Note**: This script aims to enhance your viewing by prioritizing high-definition playback. It works by interacting with YouTube's existing player controls and respecting the available quality options for each video.