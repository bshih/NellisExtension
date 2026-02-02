/**
 * Popup script for Nellis Auction Helper
 */

export {};

interface FilterSettings {
  hideUsed: boolean;
  hideMinorDamage: boolean;
  hideUnknownMissing: boolean;
  hideMissingParts: boolean;
  showAmazonLinks: boolean;
}

const DEFAULT_SETTINGS: FilterSettings = {
  hideUsed: false,
  hideMinorDamage: false,
  hideUnknownMissing: false,
  hideMissingParts: false,
  showAmazonLinks: true,
};

// DOM elements
const filterUsed = document.getElementById('filter-used') as HTMLInputElement;
const filterMinorDamage = document.getElementById('filter-minor-damage') as HTMLInputElement;
const filterUnknownMissing = document.getElementById('filter-unknown-missing') as HTMLInputElement;
const filterMissingParts = document.getElementById('filter-missing-parts') as HTMLInputElement;
const locationFilter = document.getElementById('location-filter') as HTMLSelectElement;
const applyLocationButton = document.getElementById('apply-location') as HTMLButtonElement;
const showAmazonLinks = document.getElementById('show-amazon-links') as HTMLInputElement;
const applyButton = document.getElementById('apply-filters') as HTMLButtonElement;
const resetButton = document.getElementById('reset-filters') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

/**
 * Load settings from storage
 */
async function loadSettings(): Promise<FilterSettings> {
  const result = await chrome.storage.sync.get('nellisSettings');
  return { ...DEFAULT_SETTINGS, ...result.nellisSettings };
}

/**
 * Save settings to storage
 */
async function saveSettings(settings: FilterSettings): Promise<void> {
  await chrome.storage.sync.set({ nellisSettings: settings });
}

/**
 * Update UI from settings
 */
function updateUI(settings: FilterSettings): void {
  filterUsed.checked = settings.hideUsed;
  filterMinorDamage.checked = settings.hideMinorDamage;
  filterUnknownMissing.checked = settings.hideUnknownMissing;
  filterMissingParts.checked = settings.hideMissingParts;
  showAmazonLinks.checked = settings.showAmazonLinks;
}

/**
 * Get current settings from UI
 */
function getSettingsFromUI(): FilterSettings {
  return {
    hideUsed: filterUsed.checked,
    hideMinorDamage: filterMinorDamage.checked,
    hideUnknownMissing: filterUnknownMissing.checked,
    hideMissingParts: filterMissingParts.checked,
    showAmazonLinks: showAmazonLinks.checked,
  };
}

/**
 * Show status message
 */
function showStatus(message: string, type: 'success' | 'error'): void {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  setTimeout(() => {
    statusEl.className = 'status hidden';
  }, 2000);
}

/**
 * Send settings to content script
 */
async function applyFilters(): Promise<void> {
  const settings = getSettingsFromUI();
  await saveSettings(settings);

  // Send to active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && tab.url?.includes('nellisauction.com')) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'APPLY_FILTERS',
        settings,
      });
      showStatus('Filters applied!', 'success');
    } catch {
      showStatus('Refresh the Nellis page first', 'error');
    }
  } else {
    showStatus('Open a Nellis Auction page', 'error');
  }
}

/**
 * Apply location filter by navigating to URL with location parameter
 */
async function applyLocationFilter(): Promise<void> {
  const location = locationFilter.value;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.includes('nellisauction.com')) {
    showStatus('Open a Nellis Auction page', 'error');
    return;
  }

  try {
    const url = new URL(tab.url);

    if (location) {
      // Set the location parameter
      url.searchParams.set('Location Name', location);
    } else {
      // Remove location filter
      url.searchParams.delete('Location Name');
    }

    // Navigate to the new URL
    await chrome.tabs.update(tab.id, { url: url.toString() });
    showStatus(`Navigating to ${location || 'All Locations'}`, 'success');
  } catch {
    showStatus('Failed to apply location filter', 'error');
  }
}

/**
 * Detect current location from URL and update dropdown
 */
async function detectCurrentLocation(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.includes('nellisauction.com')) {
    try {
      const url = new URL(tab.url);
      const currentLocation = url.searchParams.get('Location Name') || '';
      locationFilter.value = currentLocation;
    } catch {
      // Ignore URL parsing errors
    }
  }
}

/**
 * Reset filters to defaults
 */
async function resetFilters(): Promise<void> {
  await saveSettings(DEFAULT_SETTINGS);
  updateUI(DEFAULT_SETTINGS);
  locationFilter.value = '';
  await applyFilters();
}

/**
 * Initialize popup
 */
async function init(): Promise<void> {
  const settings = await loadSettings();
  updateUI(settings);

  // Detect current location from URL
  await detectCurrentLocation();

  applyButton.addEventListener('click', applyFilters);
  resetButton.addEventListener('click', resetFilters);
  applyLocationButton.addEventListener('click', applyLocationFilter);

  // Auto-apply condition filters when checkboxes change
  [filterUsed, filterMinorDamage, filterUnknownMissing, filterMissingParts, showAmazonLinks].forEach((el) => {
    el.addEventListener('change', applyFilters);
  });
}

init();
