# YouTube HD Premium

A userscript that automatically switches YouTube to high quality (1080p+) with intelligent quality management.

## Features

- **Auto HD Quality**: Sets videos to 1080p+ when available
- **Force HD Mode**: Ensures minimum 1080p when "Auto" is selected
- **Smart Selection**: Prefers YouTube Premium formats
- **Menu Integration**: Easy Tampermonkey configuration
- **HD Focus**: Prioritizes 1080p, 1440p, 2160p, 4320p resolutions

## Installation

1. **Install userscript manager**: [Tampermonkey](https://tampermonkey.net)
2. **Install script**: [YouTube HD Premium](https://raw.githubusercontent.com/OD728/YTHDP/main/youtube-hd-premium.user.js)
3. Reload YouTube pages

## Configuration

Access via Tampermonkey menu:
- **Quality Options**: 1080p (default), 1440p, 2160p, 4320p, Auto
- **Force HD**: Ensures min 1080p when Auto is selected
- **Debug Mode**: Console logging for troubleshooting

## Troubleshooting

- **Quality not changing**: Enable Debug mode, check console for `[YTHDP DEBUG]` messages
- **Menu issues**: Update Tampermonkey to v5.4.6224+
- **Conflicts**: Disable other YouTube extensions temporarily

## License

MIT License

## Contributing

Issues and PRs welcome at: [GitHub Repository](https://github.com/OD728/YTHDP)
