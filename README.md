# VNDB List Export

This userscript allows you to export **any user's VNDB VN list and length vote list** to CSV format. It is a modified version of the old Vinfall's userscript, updated to work with the current VNDB website structure.

## Features
- Export **any user's VN list** or **length votes** to CSV.
- Handles pagination to fetch data from all pages.
- Adds an "Export as CSV" button to the relevant pages.
- Includes UTF-8 BOM for proper encoding in CSV files.

## Installation
1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Click [here](https://github.com/Kamikadashi/VNDB-List-Export/raw/refs/heads/main/VNDB%20List%20Export-1.5.9.user.js) to install the script.

## Usage
1. Navigate to **any user's VN list** or **length votes page** on VNDB (e.g., `https://vndb.org/u12345/ulist` or `https://vndb.org/u12345/lengthvotes`).
2. Click the "Export as CSV" button that appears on the page.
3. The CSV file will be downloaded automatically.

## Notes
- The script is based on the old Vinfall's userscript, with updates to ensure compatibility with the current VNDB site.
- You do not need to be logged in to export other users' lists.

## License
This script is licensed under the WTFPL license. Do whatever you want with it.
