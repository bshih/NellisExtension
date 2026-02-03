/**
 * Content script for Nellis Auction Helper
 * Filters items and adds Amazon links on search result pages
 */

export {};

interface FilterSettings {
  hideUsed: boolean;
  hideMinorDamage: boolean;
  hideUnknownMissing: boolean;
  hideMissingParts: boolean;
  showAmazonLinks: boolean;
  locationFilter: string;
}

const AMAZON_LINK_CLASS = 'nellis-helper-amazon-link';
const HIDDEN_CLASS = 'nellis-helper-hidden';
const PROCESSED_ATTR = 'data-nellis-helper-processed';

let currentSettings: FilterSettings = {
  hideUsed: false,
  hideMinorDamage: false,
  hideUnknownMissing: false,
  hideMissingParts: false,
  showAmazonLinks: true,
  locationFilter: '',
};

/**
 * Build a map of product IDs to their conditions by finding condition spans
 * and matching them to nearby product links
 */
function buildConditionMap(): Map<string, string> {
  const conditionMap = new Map<string, string>();

  // Find all spans that might contain condition text
  const allSpans = document.querySelectorAll('span');

  allSpans.forEach((span) => {
    const text = span.textContent?.trim() || '';

    // Check if this span contains a condition we want to filter
    // Note: "New" items don't have a tag - only items with issues have tags
    let condition = '';
    if (/^used$/i.test(text)) condition = 'used';
    else if (/^minor damage$/i.test(text)) condition = 'minorDamage';
    else if (/^unknown if missing parts$/i.test(text)) condition = 'unknownMissing';
    else if (/^missing parts$/i.test(text)) condition = 'missingParts';

    if (condition) {
      // Find the nearest product link by going up the DOM tree
      let parent: HTMLElement | null = span.parentElement;
      let productId = '';

      // Go up to 10 levels to find a container with a product link
      for (let i = 0; i < 10 && parent; i++) {
        const productLink = parent.querySelector('a[href*="/p/"]') as HTMLAnchorElement | null;
        if (productLink) {
          const href = productLink.getAttribute('href') || '';
          const match = href.match(/\/p\/[^/]+\/(\d+)/);
          if (match) {
            productId = match[1];
            break;
          }
        }
        parent = parent.parentElement;
      }

      if (productId) {
        conditionMap.set(productId, condition);
      }
    }
  });

  console.log('Nellis Helper: Built condition map with', conditionMap.size, 'entries');

  return conditionMap;
}

/**
 * Find all product cards on the page
 */
function findProductCards(): HTMLElement[] {
  const validCards: HTMLElement[] = [];

  // Find card containers first, then get the title link from each
  // This avoids duplicates from multiple links per card (title link + image link)
  document.querySelectorAll('[data-ax="item-card-container"]').forEach((container) => {
    if (container.hasAttribute(PROCESSED_ATTR)) return;

    // Get the title link specifically
    const titleLink = container.querySelector('a[data-ax="item-card-title-link"]') as HTMLElement;
    if (titleLink) {
      validCards.push(titleLink);
    }
  });

  console.log(`Nellis Helper: Found ${validCards.length} product cards`);
  return validCards;
}

/**
 * Extract product ID from card href
 */
function getProductId(card: HTMLElement): string {
  const href = card.getAttribute('href') || '';
  const match = href.match(/\/p\/[^/]+\/(\d+)/);
  return match ? match[1] : '';
}

/**
 * Extract product title from card
 */
function getProductTitle(card: HTMLElement): string {
  // Strategy 1: Look for h1-h6 elements
  const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    return heading.textContent?.trim() || '';
  }

  // Strategy 2: Look for elements with title/name in class
  const titleEl = card.querySelector('[class*="title"], [class*="Title"], [class*="name"], [class*="Name"]');
  if (titleEl) {
    return titleEl.textContent?.trim() || '';
  }

  // Strategy 3: Get title from aria-label or title attribute
  const ariaLabel = card.getAttribute('aria-label') || card.getAttribute('title');
  if (ariaLabel) {
    return ariaLabel;
  }

  // Strategy 4: Parse from href
  const href = card.getAttribute('href') || '';
  const match = href.match(/\/p\/([^/]+)/);
  if (match) {
    return match[1].replace(/-/g, ' ');
  }

  return '';
}

/**
 * Generate Amazon search URL from product title
 */
function generateAmazonUrl(title: string): string {
  const cleanTitle = title
    .replace(/\d+\s*pack/gi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

  const searchQuery = encodeURIComponent(cleanTitle);
  return `https://www.amazon.com/s?k=${searchQuery}`;
}

/**
 * Add Amazon link to a product card
 */
function addAmazonLink(card: HTMLElement, title: string): void {
  if (card.querySelector(`.${AMAZON_LINK_CLASS}`)) {
    return;
  }

  if (!title || title.length < 5) return;

  const amazonUrl = generateAmazonUrl(title);

  const link = document.createElement('a');
  link.href = amazonUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = AMAZON_LINK_CLASS;
  link.title = `Search Amazon for: ${title}`;

  link.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(amazonUrl, '_blank');
  });

  // Try to find a good insertion point
  const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.insertAdjacentElement('afterend', link);
  } else {
    card.insertAdjacentElement('afterbegin', link);
  }
}

/**
 * Get the visual card container (the individual card element to hide)
 * Nellis uses data-ax="item-card-container" to mark the full card container
 */
function getCardContainer(card: HTMLElement): HTMLElement {
  // Look for the item-card-container parent
  const container = card.closest('[data-ax="item-card-container"]');
  if (container) {
    return container as HTMLElement;
  }

  // Fallback: return the card itself
  return card;
}

/**
 * Apply filters to all product cards
 */
function applyFilters(): void {
  console.log('Nellis Helper: Applying filters...');

  // Remove existing Amazon links to prevent duplicates
  document.querySelectorAll(`.${AMAZON_LINK_CLASS}`).forEach((link) => link.remove());

  // Remove hidden class from all previously hidden containers
  document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((el) => el.classList.remove(HIDDEN_CLASS));

  // Build the condition map first
  const conditionMap = buildConditionMap();

  const cards = findProductCards();

  let hiddenCount = 0;
  let shownCount = 0;

  cards.forEach((card) => {
    const productId = getProductId(card);
    const title = getProductTitle(card);
    const condition = conditionMap.get(productId) || '';

    let shouldHide = false;

    // Only hide if condition matches one of the selected filters
    if (currentSettings.hideUsed && condition === 'used') {
      shouldHide = true;
    }
    if (currentSettings.hideMinorDamage && condition === 'minorDamage') {
      shouldHide = true;
    }
    if (currentSettings.hideUnknownMissing && condition === 'unknownMissing') {
      shouldHide = true;
    }
    if (currentSettings.hideMissingParts && condition === 'missingParts') {
      shouldHide = true;
    }

    // Get the visual container to hide (not just the anchor)
    const container = getCardContainer(card);

    if (shouldHide) {
      container.classList.add(HIDDEN_CLASS);
      hiddenCount++;
    } else {
      shownCount++;
    }

    card.setAttribute(PROCESSED_ATTR, 'true');

    if (currentSettings.showAmazonLinks && !shouldHide) {
      addAmazonLink(card, title);
    }
  });

  console.log(`Nellis Helper: Processed ${cards.length} cards - ${shownCount} shown, ${hiddenCount} hidden`);

  // Debug output
  console.log('=== Nellis Helper Debug Info ===');
  console.log('Settings:', JSON.stringify(currentSettings, null, 2));
  console.log('Condition map entries:', conditionMap.size);
}

/**
 * Check if current URL has the saved location filter, redirect if not
 */
function checkLocationRedirect(): boolean {
  const savedLocation = currentSettings.locationFilter;
  if (!savedLocation) return false; // No saved location = no redirect needed

  const url = new URL(window.location.href);
  const currentLocation = url.searchParams.get('Location Name') || '';

  if (currentLocation !== savedLocation) {
    console.log(`Nellis Helper: Redirecting to saved location "${savedLocation}"`);
    url.searchParams.set('Location Name', savedLocation);
    window.location.href = url.toString();
    return true; // Redirect initiated
  }

  return false; // No redirect needed
}

/**
 * Initialize the content script
 */
async function init(): Promise<void> {
  console.log('Nellis Auction Helper: Content script loaded on', window.location.href);

  // Load settings
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (response) {
      currentSettings = { ...currentSettings, ...response };
    }
  } catch (e) {
    console.log('Nellis Helper: Could not load settings, using defaults');
  }

  // Check if we need to redirect to saved location
  if (checkLocationRedirect()) {
    return; // Page will reload, don't continue
  }

  // Try applying filters multiple times as page loads
  const tryApply = (attempts: number) => {
    applyFilters();
    if (attempts > 0) {
      setTimeout(() => {
        const cards = document.querySelectorAll(`[${PROCESSED_ATTR}]`);
        if (cards.length === 0) {
          console.log(`Nellis Helper: Retrying... (${attempts} attempts left)`);
          tryApply(attempts - 1);
        }
      }, 1000);
    }
  };

  // Initial delay then try multiple times
  setTimeout(() => tryApply(5), 500);

  // Watch for new content
  let debounceTimer: number | undefined;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      const unprocessedLinks = document.querySelectorAll(`a[href*="/p/"]:not([${PROCESSED_ATTR}])`);
      if (unprocessedLinks.length > 0) {
        console.log(`Nellis Helper: Found ${unprocessedLinks.length} new product links`);
        applyFilters();
      }
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also watch for URL changes (SPA navigation)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('Nellis Helper: URL changed, reapplying filters');
      // Clear processed attributes so cards get reprocessed
      document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((el) => {
        el.removeAttribute(PROCESSED_ATTR);
      });
      // Remove existing Amazon links
      document.querySelectorAll(`.${AMAZON_LINK_CLASS}`).forEach((el) => el.remove());
      // Reapply after a delay for new content to load
      setTimeout(applyFilters, 1000);
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });

  // Also listen for popstate (back/forward navigation)
  window.addEventListener('popstate', () => {
    console.log('Nellis Helper: Navigation detected, reapplying filters');
    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((el) => {
      el.removeAttribute(PROCESSED_ATTR);
    });
    document.querySelectorAll(`.${AMAZON_LINK_CLASS}`).forEach((el) => el.remove());
    setTimeout(applyFilters, 1000);
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'APPLY_FILTERS') {
    currentSettings = message.settings;
    console.log('Nellis Helper: Received settings:', currentSettings);
    applyFilters();
    sendResponse({ success: true });
  }
  return true;
});

// Debug function - can be called from console: window.nellisDebug()
// @ts-ignore
window.nellisDebug = function() {
  console.log('=== Nellis Helper Debug ===');
  console.log('Current settings:', currentSettings);

  // Find all condition-like spans
  const allSpans = document.querySelectorAll('span');
  const conditionSpans: { text: string; element: HTMLElement }[] = [];

  allSpans.forEach((span) => {
    const text = span.textContent?.trim() || '';
    if (/^(used|new|minor damage|unknown if missing parts|missing parts)$/i.test(text)) {
      conditionSpans.push({ text, element: span as HTMLElement });
    }
  });

  console.log(`Found ${conditionSpans.length} condition spans:`);
  conditionSpans.slice(0, 10).forEach((cs, i) => {
    console.log(`  ${i + 1}. "${cs.text}"`);
    // Find nearest product link
    let parent = cs.element.parentElement;
    for (let j = 0; j < 10 && parent; j++) {
      const link = parent.querySelector('a[href*="/p/"]');
      if (link) {
        console.log(`     -> Product link: ${link.getAttribute('href')}`);
        break;
      }
      parent = parent.parentElement;
    }
  });

  // Show condition map
  const conditionMap = buildConditionMap();
  console.log('\nCondition map:');
  conditionMap.forEach((condition, productId) => {
    console.log(`  ${productId}: "${condition}"`);
  });

  // Show first few product cards
  const cards = findProductCards();
  console.log(`\nFirst 5 product cards:`);
  cards.slice(0, 5).forEach((card, i) => {
    const productId = getProductId(card);
    const title = getProductTitle(card);
    const condition = conditionMap.get(productId) || '';
    console.log(`  ${i + 1}. ID=${productId}, Title="${title.slice(0, 30)}...", Condition="${condition}"`);
  });
};

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
