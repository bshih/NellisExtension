/**
 * Unit tests for Nellis Auction Helper content script
 * @jest-environment jsdom
 */

// Helper to create mock product card DOM structure
function createMockProductCard(
  productId: string,
  title: string,
  condition: string | null,
  location: string
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'product-card-container';

  // Create the product link (anchor)
  const link = document.createElement('a');
  link.href = `/p/${title.replace(/\s+/g, '-')}/${productId}`;

  // Add image
  const img = document.createElement('img');
  img.src = 'https://example.com/image.jpg';
  link.appendChild(img);

  // Add title
  const h6 = document.createElement('h6');
  h6.textContent = title;
  link.appendChild(h6);

  container.appendChild(link);

  // Add location span (outside the link, but inside container)
  const locationSpan = document.createElement('span');
  locationSpan.className = 'px-3 whitespace-nowrap';
  locationSpan.textContent = location;
  container.appendChild(locationSpan);

  // Add condition span only if condition is provided (New items have no tag)
  if (condition) {
    const conditionSpan = document.createElement('span');
    conditionSpan.className = 'px-3 whitespace-nowrap overflow-hidden text-ellipsis';
    conditionSpan.textContent = condition;
    container.appendChild(conditionSpan);
  }

  return container;
}

// Copy of the condition map building logic for testing
function buildConditionMap(): Map<string, { condition: string; location: string }> {
  const conditionMap = new Map<string, { condition: string; location: string }>();

  const allSpans = document.querySelectorAll('span');

  allSpans.forEach((span) => {
    const text = span.textContent?.trim() || '';

    // Only detect problematic conditions - NOT "new"
    let condition = '';
    if (/^used$/i.test(text)) condition = 'used';
    else if (/^minor damage$/i.test(text)) condition = 'minorDamage';
    else if (/^unknown if missing parts$/i.test(text)) condition = 'unknownMissing';
    else if (/^missing parts$/i.test(text)) condition = 'missingParts';

    let location = '';
    const locationKeywords = ['North Las Vegas', 'Dean Martin', 'Henderson', 'Decatur'];
    for (const loc of locationKeywords) {
      if (text === loc) {
        location = loc;
        break;
      }
    }

    if (condition || location) {
      let parent: HTMLElement | null = span.parentElement;
      let productId = '';

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
        const existing = conditionMap.get(productId) || { condition: '', location: '' };
        if (condition) existing.condition = condition;
        if (location) existing.location = location;
        conditionMap.set(productId, existing);
      }
    }
  });

  return conditionMap;
}

// Copy of the filtering logic for testing
function shouldHideCard(
  condition: string,
  location: string,
  settings: {
    hideUsed: boolean;
    hideMinorDamage: boolean;
    hideUnknownMissing: boolean;
    hideMissingParts: boolean;
    locationFilter: string;
  }
): boolean {
  let shouldHide = false;

  if (settings.hideUsed && condition === 'used') {
    shouldHide = true;
  }
  if (settings.hideMinorDamage && condition === 'minorDamage') {
    shouldHide = true;
  }
  if (settings.hideUnknownMissing && condition === 'unknownMissing') {
    shouldHide = true;
  }
  if (settings.hideMissingParts && condition === 'missingParts') {
    shouldHide = true;
  }

  // Location filter - only hide if filter is set AND card has location AND it doesn't match
  if (settings.locationFilter && location && location !== settings.locationFilter) {
    shouldHide = true;
  }

  return shouldHide;
}

describe('Condition Map Building', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('should detect "Used" condition', () => {
    const card = createMockProductCard('88336066', 'Product A', 'Used', 'North Las Vegas');
    document.body.appendChild(card);

    const conditionMap = buildConditionMap();

    expect(conditionMap.get('88336066')?.condition).toBe('used');
  });

  test('should NOT create entry for "New" items (no condition tag)', () => {
    const card = createMockProductCard('88336067', 'Product B', null, 'North Las Vegas');
    document.body.appendChild(card);

    const conditionMap = buildConditionMap();

    // Should only have location, no condition, or no entry at all
    const entry = conditionMap.get('88336067');
    expect(entry?.condition || '').toBe('');
  });

  test('should detect "Minor Damage" condition', () => {
    const card = createMockProductCard('88336068', 'Product C', 'Minor Damage', 'North Las Vegas');
    document.body.appendChild(card);

    const conditionMap = buildConditionMap();

    expect(conditionMap.get('88336068')?.condition).toBe('minorDamage');
  });

  test('should detect "Unknown if Missing Parts" condition', () => {
    const card = createMockProductCard('88336069', 'Product D', 'Unknown if Missing Parts', 'North Las Vegas');
    document.body.appendChild(card);

    const conditionMap = buildConditionMap();

    expect(conditionMap.get('88336069')?.condition).toBe('unknownMissing');
  });

  test('should detect location', () => {
    const card = createMockProductCard('88336070', 'Product E', 'Used', 'Dean Martin');
    document.body.appendChild(card);

    const conditionMap = buildConditionMap();

    expect(conditionMap.get('88336070')?.location).toBe('Dean Martin');
  });

  test('should handle multiple cards with mixed conditions', () => {
    const cards = [
      createMockProductCard('001', 'Product 1', 'Used', 'North Las Vegas'),
      createMockProductCard('002', 'Product 2', null, 'North Las Vegas'), // New
      createMockProductCard('003', 'Product 3', 'Minor Damage', 'Dean Martin'),
      createMockProductCard('004', 'Product 4', null, 'Henderson'), // New
    ];
    cards.forEach((c) => document.body.appendChild(c));

    const conditionMap = buildConditionMap();

    expect(conditionMap.get('001')?.condition).toBe('used');
    expect(conditionMap.get('002')?.condition || '').toBe(''); // New item - no condition
    expect(conditionMap.get('003')?.condition).toBe('minorDamage');
    expect(conditionMap.get('004')?.condition || '').toBe(''); // New item - no condition
  });
});

describe('Filtering Logic', () => {
  const allFiltersOn = {
    hideUsed: true,
    hideMinorDamage: true,
    hideUnknownMissing: true,
    hideMissingParts: true,
    locationFilter: '',
  };

  const allFiltersOff = {
    hideUsed: false,
    hideMinorDamage: false,
    hideUnknownMissing: false,
    hideMissingParts: false,
    locationFilter: '',
  };

  test('Used item should be hidden when hideUsed=true', () => {
    expect(shouldHideCard('used', 'North Las Vegas', allFiltersOn)).toBe(true);
  });

  test('New item (empty condition) should NOT be hidden when all condition filters are on', () => {
    expect(shouldHideCard('', 'North Las Vegas', allFiltersOn)).toBe(false);
  });

  test('Minor Damage item should be hidden when hideMinorDamage=true', () => {
    expect(shouldHideCard('minorDamage', 'North Las Vegas', allFiltersOn)).toBe(true);
  });

  test('Unknown Missing Parts item should be hidden when hideUnknownMissing=true', () => {
    expect(shouldHideCard('unknownMissing', 'North Las Vegas', allFiltersOn)).toBe(true);
  });

  test('Missing Parts item should be hidden when hideMissingParts=true', () => {
    expect(shouldHideCard('missingParts', 'North Las Vegas', allFiltersOn)).toBe(true);
  });

  test('Used item should NOT be hidden when all filters are off', () => {
    expect(shouldHideCard('used', 'North Las Vegas', allFiltersOff)).toBe(false);
  });

  test('New item should NOT be hidden when all filters are off', () => {
    expect(shouldHideCard('', 'North Las Vegas', allFiltersOff)).toBe(false);
  });

  test('Location filter should hide items with different location', () => {
    const settings = { ...allFiltersOff, locationFilter: 'North Las Vegas' };
    expect(shouldHideCard('', 'Dean Martin', settings)).toBe(true);
  });

  test('Location filter should NOT hide items with matching location', () => {
    const settings = { ...allFiltersOff, locationFilter: 'North Las Vegas' };
    expect(shouldHideCard('', 'North Las Vegas', settings)).toBe(false);
  });

  test('Location filter should NOT hide items with no location', () => {
    const settings = { ...allFiltersOff, locationFilter: 'North Las Vegas' };
    expect(shouldHideCard('', '', settings)).toBe(false);
  });
});

describe('Real World Scenario', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('With all condition filters ON, only New items should remain visible', () => {
    // Create a mix of products like on the real site
    const products = [
      { id: '001', title: 'Used Product', condition: 'Used', location: 'North Las Vegas' },
      { id: '002', title: 'New Product 1', condition: null, location: 'North Las Vegas' },
      { id: '003', title: 'Damaged Product', condition: 'Minor Damage', location: 'North Las Vegas' },
      { id: '004', title: 'New Product 2', condition: null, location: 'North Las Vegas' },
      { id: '005', title: 'Unknown Parts', condition: 'Unknown if Missing Parts', location: 'North Las Vegas' },
    ];

    products.forEach((p) => {
      document.body.appendChild(createMockProductCard(p.id, p.title, p.condition, p.location));
    });

    const conditionMap = buildConditionMap();
    const settings = {
      hideUsed: true,
      hideMinorDamage: true,
      hideUnknownMissing: true,
      hideMissingParts: true,
      locationFilter: '',
    };

    const results = products.map((p) => {
      const info = conditionMap.get(p.id) || { condition: '', location: '' };
      return {
        id: p.id,
        title: p.title,
        originalCondition: p.condition,
        detectedCondition: info.condition,
        shouldHide: shouldHideCard(info.condition, info.location, settings),
      };
    });

    // Log for debugging
    console.log('Test results:', results);

    // New items (002 and 004) should NOT be hidden
    expect(results.find((r) => r.id === '002')?.shouldHide).toBe(false);
    expect(results.find((r) => r.id === '004')?.shouldHide).toBe(false);

    // Items with conditions should be hidden
    expect(results.find((r) => r.id === '001')?.shouldHide).toBe(true);
    expect(results.find((r) => r.id === '003')?.shouldHide).toBe(true);
    expect(results.find((r) => r.id === '005')?.shouldHide).toBe(true);

    // Count visible items
    const visibleCount = results.filter((r) => !r.shouldHide).length;
    expect(visibleCount).toBe(2); // Only the 2 new items
  });
});
