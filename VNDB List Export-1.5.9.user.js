// ==UserScript==
// @name        VNDB List Export
// @namespace   https://github.com/Vinfall/UserScripts
// @match       https://vndb.org/u*
// @match       https://vndb.org/u*/ulist*
// @match       https://vndb.org/u*/lengthvotes
// @grant       GM_xmlhttpRequest
// @version     1.5.9
// @author      alvibo
// @license     WTFPL
// @description Export VNDB user VN & length vote list to CSV. Modified version of Vinfall's old script.
// ==/UserScript==

// Function to get table data in CSV format
function getTable(selector, doc = document) {
    // Get table element in user list
    var userListTable = doc.querySelector(selector);

    // Get table header
    var headers = Array.from(userListTable.querySelectorAll('thead tr')).map((row) => {
        return Array.from(row.querySelectorAll('td')).map((td) => {
            // this is weird, should be 'th' for real
            // Delete unwanted operator strings
            return td.textContent.trim().replace(/▴▾|Opt/g, '');
        });
    });

    // Get list
    var userData = Array.from(userListTable.querySelectorAll('tbody tr')).map((row) => {
        return Array.from(row.querySelectorAll('td')).map((td, index) => {
            // Delete unwanted string
            var cellData = td.textContent.trim().replace(/ 👁|▾/g, '');
            // Replace full-width space with normal one
            cellData = cellData.replace(/　/g, ' ');

            // Delete first row only if it's ulist table
            if (selector.includes('.ulist') && index === 0) {
                cellData = cellData.replace(/^\d+\/\d+/, '');
            }

            // Replace newlines with spaces to prevent splitting into multiple lines
            cellData = cellData.replace(/\n/g, ' ');

            // Wrap content with double quotes
            return '"' + cellData.replace(/"/g, '""') + '"';
        });
    });

    // Convert to CSV
    var csvContent = '';
    headers.forEach((row) => {
        csvContent += row.join(',') + '\n';
    });
    // Delete leading spaces in header
    csvContent = csvContent.replace(/ ,/g, ',');
    // DO NOT CHANGE THE LINE ABOVE

    userData.forEach((row) => {
        csvContent += row.join(',') + '\n';
    });
    // Delete leading spaces in table body
    csvContent = csvContent.replace(/\s+$/gm, '');
    csvContent = csvContent.replace(/^\s*,/gm, '');
    // Delete empty lines like ""
    csvContent = csvContent.replace(/\n"",/gm, '\n');
    csvContent = csvContent.replace(/^""$/gm, '');
    csvContent = csvContent.replace(/\n\n/gm, '\n');

    return csvContent;
}

// Fetch page content using GM_xmlhttpRequest with retry functionality
async function fetchPageContentWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const pageContent = await fetchPageContent(url);
            return pageContent;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed for URL: ${url}. Retrying...`);
            if (i < retries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retrying
            } else {
                throw error; // Throw error if all retries fail
            }
        }
    }
}

// Fetch page content using GM_xmlhttpRequest
function fetchPageContent(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url.startsWith('http') ? url : `https://vndb.org${url}`,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'text/html',
            },
            onload: function (response) {
                resolve(response.responseText);
            },
            onerror: function (error) {
                reject(error);
            },
        });
    });
}

// Fetch data from all pages with ulist handling
async function fetchAllPagesData(tableSelector) {
    let allData = '';
    let currentPage = 1;
    let hasNextPage = true;
    const url = new URL(window.location.href);
    let baseUrl = url.pathname; // Use 'let' instead of 'const'
    let params = new URLSearchParams(url.search); // Use 'let' instead of 'const'

    // Remove "p" from params
    params.delete('p');

    // Check if the initial URL is fake (e.g., contains "vnlist=1")
    if (params.has('vnlist')) {
        // Find the button leading to the first page on the CURRENT PAGE
        const firstPageButton = document.querySelector('.browsetabs a:first-child');
        if (firstPageButton) {
            const firstPageUrl = firstPageButton.href;
            console.log(`Detected fake URL. Redirecting to first page: ${firstPageUrl}`);
            const pageContent = await fetchPageContentWithRetry(firstPageUrl);
            const parser = new DOMParser();
            const doc = parser.parseFromString(pageContent, 'text/html');

            // Get CSV content for the first page
            const csvContent = getTable(tableSelector, doc);
            allData += csvContent;

            // Update the base URL and params for subsequent pages
            const newUrl = new URL(firstPageUrl);
            baseUrl = newUrl.pathname; // Reassign 'baseUrl'
            params = new URLSearchParams(newUrl.search); // Reassign 'params'

            // Skip the first page in the pagination loop
            currentPage = 2; // Start from the second page
        } else {
            console.error('Could not find the first page button.');
            return '';
        }
    }

    while (hasNextPage) {
        // Set "p" to the current page number
        params.set('p', currentPage);
        // Reconstruct the URL
        const pageUrl = 'https://vndb.org' + baseUrl + (params.toString() ? '?' + params.toString() : '');
        console.log(`Fetching data from page ${currentPage}: ${pageUrl}`);

        try {
            const pageContent = await fetchPageContentWithRetry(pageUrl);
            const parser = new DOMParser();
            const doc = parser.parseFromString(pageContent, 'text/html');

            // Get CSV content for the current page
            const csvContent = getTable(tableSelector, doc);

            // Append only the rows (skip the header for subsequent pages)
            if (currentPage === 1) {
                allData += csvContent; // Include header for the first page
            } else {
                const rows = csvContent.split('\n').slice(1).join('\n'); // Skip the header
                allData += rows + '\n';
            }

            // Check if there is a next page
            const nextPageButton = doc.querySelector('.browsetabs a[rel="next"]');
            if (nextPageButton) {
                currentPage++;
            } else {
                hasNextPage = false;
            }
        } catch (error) {
            console.error(`Failed to fetch page ${currentPage}:`, error);
            hasNextPage = false; // Stop fetching if retries fail
        }
    }
    return allData;
}

// Add export button functionality
function addExportButton(tableSelector, buttonSelector, fileNamePrefix) {
    // Add date to export filename
    // Sample ISO date: 20240204120335
    var today = new Date()
        .toISOString()
        .replace(/[-:]|T/g, '')
        .replace(/\..+/, '');
    var fileName = fileNamePrefix + today + '.csv';

    // Create export button
    var exportButton = document.createElement('button');
    exportButton.textContent = 'Export as CSV';
    exportButton.id = 'exportButton';
    exportButton.style.marginLeft = '2px';
    exportButton.addEventListener('click', async function (event) {
        // Prevent default form submission behavior
        event.preventDefault();
        event.stopPropagation();

        const csvContent = await fetchAllPagesData(tableSelector);

        // Add UTF-8 BOM to the CSV content
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], {
            type: 'text/csv;charset=UTF-8',
        });

        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
    });

    // Add button after the selector
    var browseTab = document.querySelector(buttonSelector);
    if (browseTab) {
        browseTab.parentNode.insertBefore(exportButton, browseTab.nextSibling);
    } else {
        console.error('Could not find the button selector:', buttonSelector);
    }
}

// Add lengthvotes button
function addLengthVotes() {
    // CSS selector does not work so use almighty XPath
    var xpath = "//header//nav//menu//li[contains(., 'list')]";
    var listLi = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

    // Modify based on cloned list element
    var lengthVotesLi = listLi.cloneNode(true);
    var lengthVotesA = lengthVotesLi.querySelector('a');
    lengthVotesA.textContent = 'lengthvotes';
    // Remove focus
    lengthVotesLi.classList.remove('tabselected');
    lengthVotesA.href = lengthVotesA.href.replace(/ulist.*$/g, 'lengthvotes');
    listLi.parentNode.insertBefore(lengthVotesLi, listLi.nextSibling);
}

// Main function
(function () {
    'use strict';
    // Add lengthvotes button
    addLengthVotes();
    var url = window.location.href;
    // User list
    if (url.includes('ulist')) {
        var tableSelector = '.ulist.browse > table';
        // Fallback to labelfilters if vanilla VNDB export button is unavailable (i.e. not login)
        var buttonSelector = document.querySelector('#exportlist') ? '#exportlist' : '.submit';
        addExportButton(tableSelector, buttonSelector, 'vndb-list-export-');
    }
    // Length votes list
    else if (url.includes('lengthvotes')) {
        var tableSelector = '.lengthlist.browse > table';
        // Dirty fallback button if the user has so limited length votes...
        var buttonSelector = document.querySelector('.browsetabs') ? '.browsetabs' : 'article > h1';
        addExportButton(tableSelector, buttonSelector, 'vndb-lengthvotes-export-');
    }
    // Error handling, actually redundant as long as VNDB does not change those URLs
    else {
        console.log(url + 'is not a valid domain or currently unsupported.');
    }
})();