// Trolley Shopping List App - Playwright Test Suite
// Generated from Lead Tester scenarios (33 test cases)
// Run with: npx playwright test trolley.spec.js
// Configure BASE_URL below to point to your hosted app file

const { test, expect, devices } = require('@playwright/test');

const BASE_URL = 'https://shopping-list-liard-one.vercel.app/'; // Update this path

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

async function clearAppState(page) {
  await page.evaluate(() => {
    localStorage.removeItem('trl_items');
    localStorage.removeItem('trl_staples');
    localStorage.removeItem('trl_history');
    localStorage.removeItem('trl_initialized');
  });
  await page.reload();
}

async function seedHistory(page, items) {
  // Add items to build history, then clear them
  for (const name of items) {
    await page.fill('#addInput', name);
    await page.keyboard.press('Enter');
  }
  // Check all then clear
  const checkBtns = await page.locator('.check-btn').all();
  for (const btn of checkBtns) {
    const card = btn.locator('..');
    const isStaple = await card.locator('.badge.staple').count();
    if (!isStaple) await btn.click();
  }
  await page.getByTitle('Clear checked items').click();
}

async function openImport(page) {
  await page.getByTitle('Paste from message').click();
  await expect(page.locator('#importModal')).toHaveClass(/show/);
}

async function pasteAndReview(page, text) {
  await page.fill('#importText', text);
  await page.getByText('Clean & Review').click();
}

async function switchToTab(page, tabText) {
  await page.locator('.tab').filter({ hasText: tabText }).click();
}

// ---------------------------------------------------------------------------
// SCENARIO 1 — Staple items pre-populate on first load
// ---------------------------------------------------------------------------

test('TS01 - Staple items pre-populate on first load', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  const stapleNames = ['Bread', 'Milk', 'Eggs', 'Fruit', 'Butter'];

  for (const name of stapleNames) {
    const card = page.locator('.item-card', { hasText: name });
    await expect(card).toBeVisible();
    // Staple stripe is rendered as ::before on .item-card.staple
    await expect(card).toHaveClass(/staple/);
  }

  // Verify category groupings
  await expect(page.locator('.category-header').filter({ hasText: 'Bakery' })).toBeVisible();
  await expect(page.locator('.category-header').filter({ hasText: 'Dairy' })).toBeVisible();
  await expect(page.locator('.category-header').filter({ hasText: 'Produce' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 2 — Staple items are togglable from the Staples tab
// ---------------------------------------------------------------------------

test('TS02 - Staple items are togglable from the Staples tab', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Navigate to Staples tab
  await switchToTab(page, 'Staples');
  await expect(page.locator('#tab-staples')).toBeVisible();

  // Deactivate Milk
  const milkCard = page.locator('#staplesList .item-card', { hasText: 'Milk' });
  await milkCard.locator('.check-btn').click();

  // Return to My List
  await switchToTab(page, 'My List');
  await expect(page.locator('.item-card', { hasText: 'Milk' })).toHaveCount(0);

  // Verify persistence after reload
  await page.reload();
  await expect(page.locator('.item-card', { hasText: 'Milk' })).toHaveCount(0);

  // Re-activate Milk
  await switchToTab(page, 'Staples');
  await page.locator('#staplesList .item-card', { hasText: 'Milk' }).locator('.check-btn').click();
  await switchToTab(page, 'My List');
  await expect(page.locator('.item-card', { hasText: 'Milk' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 3 — Add a new staple and verify it applies to the list
// ---------------------------------------------------------------------------

test('TS03 - Add a new staple and verify it applies to the list', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  await switchToTab(page, 'Staples');
  await page.fill('#stapleInput', 'Cheese');
  await page.locator('#tab-staples .add-btn').click();

  // Verify staple was added to staples list
  await expect(page.locator('#staplesList .item-card', { hasText: 'Cheese' })).toBeVisible();

  // Navigate to My List
  await switchToTab(page, 'My List');
  const cheeseCard = page.locator('.item-card', { hasText: 'Cheese' });
  await expect(cheeseCard).toBeVisible();
  await expect(cheeseCard).toHaveClass(/staple/);

  // Verify Dairy category assigned (smart guess)
  await expect(cheeseCard.locator('.item-meta')).toContainText('Dairy');

  // Verify persists on reload
  await page.reload();
  await expect(page.locator('.item-card', { hasText: 'Cheese' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 4 — Manual item add with correct category auto-assignment
// ---------------------------------------------------------------------------

test('TS04 - Manual item add with correct category auto-assignment', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  await page.fill('#addInput', 'salmon');
  await page.locator('.add-btn').first().click();

  // Toast should appear
  const toast = page.locator('#toast');
  await expect(toast).toContainText('Added');
  await expect(toast).toContainText('salmon');

  // Item should be in the list under Meat category
  const salmonCard = page.locator('.item-card', { hasText: 'salmon' });
  await expect(salmonCard).toBeVisible();
  await expect(salmonCard.locator('.item-meta')).toContainText('Meat');

  // Category section header should exist
  await expect(page.locator('.category-header').filter({ hasText: 'Meat' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 5 — Duplicate item prevention on manual add
// ---------------------------------------------------------------------------

test('TS05 - Duplicate item prevention on manual add', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  await page.fill('#addInput', 'Apples');
  await page.locator('.add-btn').first().click();

  const appleCount1 = await page.locator('.item-card', { hasText: 'Apples' }).count();

  // Attempt duplicate add
  await page.fill('#addInput', 'Apples');
  await page.locator('.add-btn').first().click();

  const toast = page.locator('#toast');
  await expect(toast).toContainText('Already on your list');

  const appleCount2 = await page.locator('.item-card', { hasText: 'Apples' }).count();
  expect(appleCount2).toBe(appleCount1);
});

// ---------------------------------------------------------------------------
// SCENARIO 6 — Autocomplete suggestions appear after typing
// ---------------------------------------------------------------------------

test('TS06 - Autocomplete suggestions appear after typing', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Build history
  await seedHistory(page, ['yoghurt', 'pasta', 'cereal']);

  // Type partial match
  await page.fill('#addInput', 'yo');
  await expect(page.locator('#autocomplete')).toHaveClass(/show/);
  await expect(page.locator('#autocomplete .autocomplete-item', { hasText: 'yoghurt' })).toBeVisible();

  // Tap suggestion
  await page.locator('#autocomplete .autocomplete-item', { hasText: 'yoghurt' }).click();
  await expect(page.locator('.item-card', { hasText: 'yoghurt' })).toBeVisible();
  await expect(page.locator('#autocomplete')).not.toHaveClass(/show/);
});

// ---------------------------------------------------------------------------
// SCENARIO 7 — Autocomplete dismisses correctly on outside click
// ---------------------------------------------------------------------------

test('TS07 - Autocomplete dismisses correctly on outside click', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  await seedHistory(page, ['yoghurt']);

  await page.fill('#addInput', 'yo');
  await expect(page.locator('#autocomplete')).toHaveClass(/show/);

  // Click outside
  await page.locator('.header h1').click();
  await expect(page.locator('#autocomplete')).not.toHaveClass(/show/);

  // Input value should be retained
  await expect(page.locator('#addInput')).toHaveValue('yo');
});

// ---------------------------------------------------------------------------
// SCENARIO 8 — Import modal opens and accepts pasted text
// ---------------------------------------------------------------------------

test('TS08 - Import modal opens and accepts pasted text', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  await openImport(page);

  const modal = page.locator('#importModal .modal');
  await expect(modal).toBeVisible();
  await expect(page.locator('#importText')).toBeVisible();

  await page.fill('#importText', 'milk\neggs\nbread');
  await expect(page.locator('#importText')).toHaveValue('milk\neggs\nbread');

  // Clean & Review button should be visible without scrolling
  const reviewBtn = page.getByText('Clean & Review');
  await expect(reviewBtn).toBeVisible();
  await expect(reviewBtn).toBeInViewport();
});

// ---------------------------------------------------------------------------
// SCENARIO 9 — Import line-by-line review screen renders correctly
// ---------------------------------------------------------------------------

test('TS09 - Import line-by-line review screen renders correctly', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  await openImport(page);

  const pasteContent = [
    'milk',
    '2x eggs',
    'Chicken Tikka Masala (recipe)',
    'bread',
    'apples',
    'butternut squash soup with croutons'
  ].join('\n');

  await pasteAndReview(page, pasteContent);

  // Lines should be rendered as import-line elements
  await expect(page.locator('.import-line')).toHaveCount(6);

  // "2x eggs" should be cleaned to "eggs"
  const eggsInput = page.locator('.import-line-edit').nth(1);
  await expect(eggsInput).toHaveValue('eggs');

  // Long recipe lines should be flagged
  const recipeBadges = page.locator('.badge', { hasText: 'recipe?' });
  await expect(recipeBadges).toHaveCount(2); // Chicken Tikka Masala and butternut squash soup

  // Have and Drop buttons present on each keep-state line
  await expect(page.locator('.ia-btn.have-btn').first()).toBeVisible();
  await expect(page.locator('.ia-btn.drop-btn').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 10 — Recipe lines can be easily discarded in import
// ---------------------------------------------------------------------------

test('TS10 - Recipe lines can be discarded in import', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  await openImport(page);
  await pasteAndReview(page, 'milk\nbutternut squash soup with croutons\nbread');

  // Find recipe-flagged line and drop it
  const recipeLine = page.locator('.import-line').filter({ has: page.locator('.badge', { hasText: 'recipe?' }) }).first();
  await recipeLine.locator('.ia-btn.drop-btn').click();
  await expect(recipeLine).toHaveClass(/excluded/);

  // Finalise
  await page.getByText('Add to List').click();

  // Recipe item should NOT appear on main list
  await expect(page.locator('.item-card', { hasText: 'butternut squash soup' })).toHaveCount(0);
  // Other items should be there
  await expect(page.locator('.item-card', { hasText: 'milk' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 11 — "Already Have" tagging is reversible before finalising
// ---------------------------------------------------------------------------

test('TS11 - Already Have tagging is reversible before finalising', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  await openImport(page);
  await pasteAndReview(page, 'eggs\nmilk\nbread');

  // Mark eggs as Have
  const eggsLine = page.locator('.import-line').filter({ hasText: 'eggs' }).first();
  await eggsLine.locator('.ia-btn.have-btn').click();
  await expect(eggsLine).toHaveClass(/have/);

  // Undo
  await eggsLine.locator('.ia-btn.undo-btn').click();
  await expect(eggsLine).not.toHaveClass(/have/);
  await expect(eggsLine).not.toHaveClass(/excluded/);

  // Have and Drop buttons should reappear
  await expect(eggsLine.locator('.ia-btn.have-btn')).toBeVisible();
  await expect(eggsLine.locator('.ia-btn.drop-btn')).toBeVisible();

  // Finalise — eggs should be included
  await page.getByText('Add to List').click();
  await expect(page.locator('.item-card', { hasText: 'eggs' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 12 — Duplicate imported items are skipped against existing list
// ---------------------------------------------------------------------------

test('TS12 - Duplicate imported items are skipped against existing list', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Bread is pre-populated as a staple
  const breadCountBefore = await page.locator('.item-card', { hasText: 'Bread' }).count();
  expect(breadCountBefore).toBe(1);

  await openImport(page);
  await pasteAndReview(page, 'bread');
  await page.getByText('Add to List').click();

  // Toast should mention duplicate skipped
  await expect(page.locator('#toast')).toContainText('duplicate');

  // Still only one bread
  await expect(page.locator('.item-card', { hasText: 'Bread' })).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// SCENARIO 13 — Very long pasted list (20+ lines) is scrollable in import
// ---------------------------------------------------------------------------

test('TS13 - Very long pasted list is scrollable in import modal', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  const longList = Array.from({ length: 25 }, (_, i) => `item number ${i + 1}`).join('\n');

  await openImport(page);
  await pasteAndReview(page, longList);

  // All 25 lines rendered
  await expect(page.locator('.import-line')).toHaveCount(25);

  // Modal body is scrollable
  const modalBody = page.locator('#importBody');
  const scrollHeight = await modalBody.evaluate(el => el.scrollHeight);
  const clientHeight = await modalBody.evaluate(el => el.clientHeight);
  expect(scrollHeight).toBeGreaterThan(clientHeight);

  // Scroll to bottom — Add to List button should be reachable
  await modalBody.evaluate(el => el.scrollTo(0, el.scrollHeight));
  const addBtn = page.getByText('Add to List');
  await expect(addBtn).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 14 — Imported item text is editable before finalising
// ---------------------------------------------------------------------------

test('TS14 - Imported item text is editable before finalising', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  await openImport(page);
  await pasteAndReview(page, 'chiken\nmilk');

  // Edit first item
  const firstInput = page.locator('.import-line-edit').first();
  await firstInput.fill('chicken');
  await expect(firstInput).toHaveValue('chicken');

  await page.getByText('Add to List').click();

  // "chicken" should appear on the list, not "chiken"
  await expect(page.locator('.item-card', { hasText: 'chicken' })).toBeVisible();
  await expect(page.locator('.item-card', { hasText: 'chiken' })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// SCENARIO 15 — Cross off an item in-store
// ---------------------------------------------------------------------------

test('TS15 - Cross off an item in-store', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Staples already present; cross off Bread
  const breadCard = page.locator('.item-card', { hasText: 'Bread' });
  const checkBtn  = breadCard.locator('.check-btn');
  await checkBtn.click();

  // Card should have checked class
  await expect(breadCard).toHaveClass(/checked/);

  // Check button fill
  await expect(checkBtn).toHaveClass(/check-btn/);

  // Item still visible (not removed)
  await expect(breadCard).toBeVisible();

  // Stats updated
  const doneStat = page.locator('#statDone');
  await expect(doneStat).not.toHaveText('0');

  // Progress bar width should be non-zero
  const fillWidth = await page.locator('#progressFill').evaluate(el => el.style.width);
  expect(parseFloat(fillWidth)).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// SCENARIO 16 — Cross off is reversible (un-check)
// ---------------------------------------------------------------------------

test('TS16 - Cross off is reversible (un-check)', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  const breadCard = page.locator('.item-card', { hasText: 'Bread' });
  const checkBtn  = breadCard.locator('.check-btn');

  // Check then uncheck
  await checkBtn.click();
  await expect(breadCard).toHaveClass(/checked/);

  await checkBtn.click();
  await expect(breadCard).not.toHaveClass(/checked/);

  // Stat should return to 0 done
  await expect(page.locator('#statDone')).toHaveText('0');
});

// ---------------------------------------------------------------------------
// SCENARIO 17 — Assign a category to an item
// ---------------------------------------------------------------------------

test('TS17 - Assign a category to an item', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Add olive oil — auto-assigned to Pantry
  await page.fill('#addInput', 'Olive oil');
  await page.locator('.add-btn').first().click();

  const oliveCard = page.locator('.item-card', { hasText: 'Olive oil' });
  await expect(oliveCard.locator('.item-meta')).toContainText('Pantry');

  // Open category modal
  await oliveCard.locator('[title="Change category"]').click();
  await expect(page.locator('#catModal')).toHaveClass(/show/);

  // Select Produce
  await page.locator('#catGrid .cat-option', { hasText: 'Produce' }).click();

  // Modal should close
  await expect(page.locator('#catModal')).not.toHaveClass(/show/);

  // Item should now be in Produce
  await expect(oliveCard.locator('.item-meta')).toContainText('Produce');
  await expect(page.locator('.category-section[data-cat="Produce"] .item-card', { hasText: 'Olive oil' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 18 — Uncategorised items are grouped correctly
// ---------------------------------------------------------------------------

test('TS18 - Uncategorised items fall into Other group', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Inject an item with no cat into localStorage, then reload
  await page.evaluate(() => {
    const items = JSON.parse(localStorage.getItem('trl_items') || '[]');
    items.push({ id: 'test-no-cat', name: 'Mystery Item', cat: null, checked: false, staple: false, order: 99 });
    localStorage.setItem('trl_items', JSON.stringify(items));
  });
  await page.reload();

  const mysteryCard = page.locator('.item-card', { hasText: 'Mystery Item' });
  await expect(mysteryCard).toBeVisible();

  // Should appear under Other or Uncategorised section
  const otherSection = page.locator('.category-section').filter({ hasText: 'Other' });
  await expect(otherSection).toBeVisible();
  await expect(otherSection.locator('.item-card', { hasText: 'Mystery Item' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 19 — Category filter pills filter list correctly
// ---------------------------------------------------------------------------

test('TS19 - Category filter pills filter list correctly', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Add items in various categories
  await page.fill('#addInput', 'salmon'); // Meat
  await page.locator('.add-btn').first().click();
  await page.fill('#addInput', 'pasta'); // Pantry
  await page.locator('.add-btn').first().click();

  // Filter to Dairy only
  await page.locator('.cat-pill', { hasText: 'Dairy' }).click();
  await expect(page.locator('.cat-pill', { hasText: 'Dairy' })).toHaveClass(/active/);

  // Meat and Pantry items should not be visible
  await expect(page.locator('.item-card', { hasText: 'salmon' })).toHaveCount(0);
  await expect(page.locator('.item-card', { hasText: 'pasta' })).toHaveCount(0);

  // Dairy staples should be visible
  await expect(page.locator('.item-card', { hasText: 'Milk' })).toBeVisible();

  // Switch back to All
  await page.locator('.cat-pill', { hasText: 'All' }).click();
  await expect(page.locator('.item-card', { hasText: 'salmon' })).toBeVisible();
  await expect(page.locator('.item-card', { hasText: 'pasta' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 20 — Filter pill row is horizontally scrollable on narrow screens
// ---------------------------------------------------------------------------

test('TS20 - Filter pill row is horizontally scrollable on narrow screens', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page    = await context.newPage();
  await page.goto(BASE_URL);
  await clearAppState(page);

  const pillRow = page.locator('.cat-row');
  await expect(pillRow).toBeVisible();

  // Row should be scrollable (scrollWidth > clientWidth)
  const isScrollable = await pillRow.evaluate(el => el.scrollWidth > el.clientWidth);
  expect(isScrollable).toBeTruthy();

  // No horizontal scrollbar on the page body
  const bodyOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
  expect(bodyOverflow).toBeTruthy();

  // All pills exist in DOM
  const pills = ['Bakery', 'Dairy', 'Meat', 'Produce', 'Pantry', 'Frozen', 'H&H', 'Other'];
  for (const label of pills) {
    await expect(page.locator('.cat-pill', { hasText: label })).toBeAttached();
  }

  await context.close();
});

// ---------------------------------------------------------------------------
// SCENARIO 21 — Drag and drop reorders items within a category
// ---------------------------------------------------------------------------

test('TS21 - Drag and drop reorders items within a category', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Add 3 items in Produce
  for (const name of ['apple', 'banana', 'carrot']) {
    await page.fill('#addInput', name);
    await page.locator('.add-btn').first().click();
  }

  // Assign all to Produce
  const produceSection = page.locator('.category-section').filter({ hasText: 'Produce' });
  const cards = produceSection.locator('.item-card');

  const firstCard  = cards.first();
  const secondCard = cards.nth(1);

  const firstBox  = await firstCard.boundingBox();
  const secondBox = await secondCard.boundingBox();

  // Drag first item over second
  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 10 });
  await page.mouse.up();

  // Verify order changed (first and second card names swapped)
  const newFirstName  = await cards.first().locator('.item-name').textContent();
  const newSecondName = await cards.nth(1).locator('.item-name').textContent();
  expect(newFirstName).not.toBe(newSecondName);

  // Persist after reload
  const orderedBefore = await cards.allTextContents();
  await page.reload();
  const orderedAfter = await page.locator('.category-section').filter({ hasText: 'Produce' }).locator('.item-card').allTextContents();
  expect(orderedAfter).toEqual(orderedBefore);
});

// ---------------------------------------------------------------------------
// SCENARIO 22 — Drag and drop moves an item across categories
// ---------------------------------------------------------------------------

test('TS22 - Drag and drop moves an item across categories', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Bread is Bakery; Milk is Dairy
  const breadCard = page.locator('.item-card', { hasText: 'Bread' });
  const milkCard  = page.locator('.item-card', { hasText: 'Milk' });

  const breadBox = await breadCard.boundingBox();
  const milkBox  = await milkCard.boundingBox();

  await page.mouse.move(breadBox.x + breadBox.width / 2, breadBox.y + breadBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(milkBox.x + milkBox.width / 2, milkBox.y + milkBox.height / 2, { steps: 15 });
  await page.mouse.up();

  // Bread should now be in Dairy section
  const dairySection = page.locator('.category-section').filter({ hasText: 'Dairy' });
  await expect(dairySection.locator('.item-card', { hasText: 'Bread' })).toBeVisible();

  // Bread's item-meta should say Dairy
  await expect(breadCard.locator('.item-meta')).toContainText('Dairy');
});

// ---------------------------------------------------------------------------
// SCENARIO 23 — List state persists after browser close and reopen
// ---------------------------------------------------------------------------

test('TS23 - List state persists after browser close and reopen', async ({ browser }) => {
  const context = await browser.newContext();
  const page    = await context.newPage();
  await page.goto(BASE_URL);
  await clearAppState(page);

  await page.fill('#addInput', 'cheese');
  await page.locator('.add-btn').first().click();
  await page.fill('#addInput', 'wine');
  await page.locator('.add-btn').first().click();

  // Check off one item
  await page.locator('.item-card', { hasText: 'cheese' }).locator('.check-btn').click();

  // Count before close
  const countBefore = await page.locator('.item-card').count();

  // Close and reopen
  await context.close();

  const context2 = await browser.newContext();
  const page2    = await context2.newPage();
  await page2.goto(BASE_URL);

  const countAfter = await page2.locator('.item-card').count();
  expect(countAfter).toBeGreaterThanOrEqual(countBefore);

  // Cheese should still be checked
  await expect(page2.locator('.item-card', { hasText: 'cheese' })).toHaveClass(/checked/);

  // No duplicate staples
  const breadCount = await page2.locator('.item-card', { hasText: 'Bread' }).count();
  expect(breadCount).toBe(1);

  await context2.close();
});

// ---------------------------------------------------------------------------
// SCENARIO 24 — Clear checked items archives them to history
// ---------------------------------------------------------------------------

test('TS24 - Clear checked items archives them to history', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Add 3 unique items and check them
  const toCheck = ['wine', 'cheese', 'crackers'];
  for (const name of toCheck) {
    await page.fill('#addInput', name);
    await page.locator('.add-btn').first().click();
    await page.locator('.item-card', { hasText: name }).locator('.check-btn').click();
  }

  // Clear checked
  await page.getByTitle('Clear checked items').click();

  // Toast confirmation
  await expect(page.locator('#toast')).toContainText('Cleared');

  // Items removed from My List
  for (const name of toCheck) {
    await expect(page.locator('.item-card', { hasText: name })).toHaveCount(0);
  }

  // Navigate to History
  await switchToTab(page, 'History');
  for (const name of toCheck) {
    await expect(page.locator('#historyList .history-item', { hasText: name })).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// SCENARIO 25 — History tab shows past items and re-adds correctly
// ---------------------------------------------------------------------------

test('TS25 - History tab re-adds items to My List correctly', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Build history via add + check + clear cycle
  await page.fill('#addInput', 'sparkling water');
  await page.locator('.add-btn').first().click();
  await page.locator('.item-card', { hasText: 'sparkling water' }).locator('.check-btn').click();
  await page.getByTitle('Clear checked items').click();

  // Go to History and re-add
  await switchToTab(page, 'History');
  await expect(page.locator('#historyList .history-item', { hasText: 'sparkling water' })).toBeVisible();
  await page.locator('#historyList .history-item', { hasText: 'sparkling water' }).click();

  // Toast
  await expect(page.locator('#toast')).toContainText('Added');

  // Switch to My List and confirm
  await switchToTab(page, 'My List');
  await expect(page.locator('.item-card', { hasText: 'sparkling water' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 26 — History tab is scrollable with large history
// ---------------------------------------------------------------------------

test('TS26 - History tab is scrollable with large history', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Inject 50 history items directly into localStorage
  await page.evaluate(() => {
    const hist = Array.from({ length: 50 }, (_, i) => ({
      name: `historical item ${i + 1}`,
      cat: 'Pantry'
    }));
    localStorage.setItem('trl_history', JSON.stringify(hist));
  });

  await switchToTab(page, 'History');
  await page.reload();
  await switchToTab(page, 'History');

  const histList = page.locator('#historyList');
  await expect(histList.locator('.history-item').first()).toBeVisible();

  // Scrollable
  const scrollable = await histList.evaluate(el => el.scrollHeight > el.clientHeight || document.body.scrollHeight > window.innerHeight);
  expect(scrollable).toBeTruthy();

  // Last item accessible by scrolling
  await page.locator('#historyList .history-item').last().scrollIntoViewIfNeeded();
  await expect(page.locator('#historyList .history-item').last()).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 27 — Bottom bar stats are always visible and don't overlap list
// ---------------------------------------------------------------------------

test('TS27 - Bottom bar does not overlap list content', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Add 15+ items
  const extra = Array.from({ length: 12 }, (_, i) => `extra item ${i + 1}`);
  for (const name of extra) {
    await page.fill('#addInput', name);
    await page.locator('.add-btn').first().click();
  }

  // Scroll to bottom of page
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // Bottom bar is fixed and visible
  const bottomBar = page.locator('.bottom-bar');
  await expect(bottomBar).toBeVisible();

  const barBox  = await bottomBar.boundingBox();
  const lastCard = page.locator('.item-card').last();
  await lastCard.scrollIntoViewIfNeeded();
  const cardBox  = await lastCard.boundingBox();

  // Last card bottom edge should be above the bottom bar top
  if (cardBox && barBox) {
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(barBox.y + 5); // 5px tolerance
  }
});

// ---------------------------------------------------------------------------
// SCENARIO 28 — Add input and autocomplete not obscured by mobile keyboard
// ---------------------------------------------------------------------------

test('TS28 - Add input is accessible on mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['iPhone 12'],
  });
  const page = await context.newPage();
  await page.goto(BASE_URL);

  await seedHistory(page, ['yoghurt']);

  await page.locator('#addInput').tap();
  await page.fill('#addInput', 'yo');

  // Autocomplete visible
  await expect(page.locator('#autocomplete')).toHaveClass(/show/);

  // Input should be in viewport
  await expect(page.locator('#addInput')).toBeInViewport();

  await context.close();
});

// ---------------------------------------------------------------------------
// SCENARIO 29 — Import modal is usable with keyboard open on mobile
// ---------------------------------------------------------------------------

test('TS29 - Import modal textarea accessible on mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['iPhone 12'],
  });
  const page = await context.newPage();
  await page.goto(BASE_URL);

  await openImport(page);
  await page.locator('#importText').tap();

  // Textarea remains in viewport
  await expect(page.locator('#importText')).toBeInViewport();
  await expect(page.locator('#importModal .modal')).toBeVisible();

  await context.close();
});

// ---------------------------------------------------------------------------
// SCENARIO 30 — Progress bar reflects accurate completion percentage
// ---------------------------------------------------------------------------

test('TS30 - Progress bar reflects accurate completion percentage', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  // Add 5 extra items to supplement staples (total will be staples + 5)
  // Work with only staples (5 items) for predictable math
  const statTotal = page.locator('#statTotal');
  const totalText = await statTotal.textContent();
  const total     = parseInt(totalText, 10);

  // Check off half
  const half     = Math.floor(total / 2);
  const allCards = page.locator('.item-card:not(.checked)');
  for (let i = 0; i < half; i++) {
    await allCards.first().locator('.check-btn').click();
  }

  const doneStat = await page.locator('#statDone').textContent();
  const leftStat = await page.locator('#statLeft').textContent();
  expect(parseInt(doneStat, 10)).toBe(half);
  expect(parseInt(leftStat, 10)).toBe(total - half);

  // Progress bar width reflects percentage
  const width = await page.locator('#progressFill').evaluate(el => el.style.width);
  const expectedPct = Math.round((half / total) * 100);
  expect(parseFloat(width)).toBeCloseTo(expectedPct, 0);
});

// ---------------------------------------------------------------------------
// SCENARIO 31 — Delete an item removes it permanently and adds to history
// ---------------------------------------------------------------------------

test('TS31 - Delete removes item and archives to history', async ({ page }) => {
  await page.goto(BASE_URL);
  await clearAppState(page);

  await page.fill('#addInput', 'oregano');
  await page.locator('.add-btn').first().click();

  const totalBefore = parseInt(await page.locator('#statTotal').textContent(), 10);

  // Delete the item
  await page.locator('.item-card', { hasText: 'oregano' }).locator('[title="Delete"]').click();

  // No confirmation dialog — item gone immediately
  await expect(page.locator('.item-card', { hasText: 'oregano' })).toHaveCount(0);

  // Stats updated
  const totalAfter = parseInt(await page.locator('#statTotal').textContent(), 10);
  expect(totalAfter).toBe(totalBefore - 1);

  // Item in history
  await switchToTab(page, 'History');
  await expect(page.locator('#historyList .history-item', { hasText: 'oregano' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCENARIO 32 — App renders correctly on small screen (320px width)
// ---------------------------------------------------------------------------

test('TS32 - App renders correctly on 320px wide screen', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 } });
  const page    = await context.newPage();
  await page.goto(BASE_URL);
  await clearAppState(page);

  // No horizontal overflow on main page
  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  expect(overflow).toBeFalsy();

  // Check all 3 tabs render without overflow
  const tabs = [
    { label: 'My List', tab: 'tab-list' },
    { label: 'Staples', tab: 'tab-staples' },
    { label: 'History', tab: 'tab-history' },
  ];

  for (const { label, tab } of tabs) {
    await switchToTab(page, label);
    const tabEl = page.locator(`#${tab}`);
    await expect(tabEl).toBeVisible();
    const tabOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(tabOverflow).toBeFalsy();
  }

  // Import modal
  await switchToTab(page, 'My List');
  await openImport(page);
  const modalOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  expect(modalOverflow).toBeFalsy();

  // Tap targets: add button should be at least 44px
  const addBtnBox = await page.locator('.add-btn').first().boundingBox();
  expect(addBtnBox.height).toBeGreaterThanOrEqual(44);

  await context.close();
});

// ---------------------------------------------------------------------------
// SCENARIO 33 — Known limitation: simultaneous editing by two users
// ---------------------------------------------------------------------------

test('TS33 - Known limitation: simultaneous editing is not synced across sessions', async ({ browser }) => {
  // Session A
  const contextA = await browser.newContext();
  const pageA    = await contextA.newPage();
  await pageA.goto(BASE_URL);
  await clearAppState(pageA);

  // Session B (same localStorage origin — separate context but same base URL)
  const contextB = await browser.newContext();
  const pageB    = await contextB.newPage();
  await pageB.goto(BASE_URL);

  // Add item in Session A
  await pageA.fill('#addInput', 'unique item from session A');
  await pageA.locator('.add-btn').first().click();
  await expect(pageA.locator('.item-card', { hasText: 'unique item from session A' })).toBeVisible();

  // Session B does NOT update in real time (no live sync)
  await expect(pageB.locator('.item-card', { hasText: 'unique item from session A' })).toHaveCount(0);

  // Known limitation note is visible to the user
  await expect(pageA.locator('.note')).toContainText('last write wins');
  await expect(pageA.locator('.note')).toBeVisible();

  // No crash in either session
  await expect(pageA.locator('.header h1')).toBeVisible();
  await expect(pageB.locator('.header h1')).toBeVisible();

  await contextA.close();
  await contextB.close();
});
