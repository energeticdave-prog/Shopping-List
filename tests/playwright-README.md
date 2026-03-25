# Trolley Shopping List - Playwright Test Suite

## Setup

### 1. Install Playwright

```bash
npm init -y
npm install --save-dev @playwright/test
npx playwright install
```

### 2. Configure the App URL

Open `trolley.spec.js` and update the BASE_URL constant at the top of the file
to point to your shopping list HTML file:

```js
// For a local file:
const BASE_URL = 'file:///absolute/path/to/shopping-list.html';

// For a served file (recommended):
const BASE_URL = 'http://localhost:8080/shopping-list.html';
```

To serve locally using Node:
```bash
npx serve . -p 8080
```

### 3. Run All Tests

```bash
npx playwright test
```

### 4. Run a Single Test Scenario

```bash
npx playwright test --grep "TS01"
```

### 5. Run by Type

```bash
# Run all UX tests
npx playwright test --grep "UX"

# Run all edge case tests
npx playwright test --grep "TS(05|10|11|12|13|18|22)"
```

### 6. Open the HTML Report

```bash
npx playwright show-report
```

---

## Test Coverage Summary

| Scenario | ID    | Type                          | Feature Area                          |
|----------|-------|-------------------------------|---------------------------------------|
| 1        | TS01  | Acceptance Criteria           | Staple items pre-populate on load     |
| 2        | TS02  | Acceptance Criteria           | Staples tab toggle                    |
| 3        | TS03  | Requirement / UX              | Add new staple                        |
| 4        | TS04  | Requirement / AC              | Manual add + category auto-assign     |
| 5        | TS05  | Edge Case                     | Duplicate prevention (manual add)     |
| 6        | TS06  | Acceptance Criteria           | Autocomplete from history             |
| 7        | TS07  | UX                            | Autocomplete dismiss on outside click |
| 8        | TS08  | Requirement / UX              | Import modal opens                    |
| 9        | TS09  | Acceptance Criteria           | Import review screen renders          |
| 10       | TS10  | Edge Case / AC                | Recipe lines discarded in import      |
| 11       | TS11  | Edge Case / AC                | Already Have tag reversible           |
| 12       | TS12  | Edge Case                     | Duplicate import skipped              |
| 13       | TS13  | Edge Case / UX / Risk         | Long list scrollable in import        |
| 14       | TS14  | Acceptance Criteria / UX      | Edit import line before finalising    |
| 15       | TS15  | Acceptance Criteria           | Cross off item in-store               |
| 16       | TS16  | UX / Risk                     | Un-check (reverse cross-off)          |
| 17       | TS17  | Acceptance Criteria           | Assign category modal                 |
| 18       | TS18  | Edge Case                     | Uncategorised items group correctly   |
| 19       | TS19  | Requirement / UX              | Category filter pills                 |
| 20       | TS20  | UX / Risk                     | Filter pill row horizontally scrolls  |
| 21       | TS21  | Acceptance Criteria           | Drag and drop within category         |
| 22       | TS22  | Acceptance Criteria / Edge    | Drag and drop across categories       |
| 23       | TS23  | Acceptance Criteria / Risk    | State persists after browser close    |
| 24       | TS24  | Acceptance Criteria           | Clear checked -> archives to history  |
| 25       | TS25  | Requirement / UX              | History re-adds to list               |
| 26       | TS26  | UX / Risk                     | History scrollable with large data    |
| 27       | TS27  | UX / Risk                     | Bottom bar does not overlap list      |
| 28       | TS28  | UX / Risk                     | Add input visible on mobile keyboard  |
| 29       | TS29  | UX / Risk                     | Import modal usable on mobile         |
| 30       | TS30  | UX / Requirement              | Progress bar accuracy                 |
| 31       | TS31  | Requirement / UX              | Delete -> archives to history         |
| 32       | TS32  | UX / Risk                     | Renders on 320px screen width         |
| 33       | TS33  | Risk / Known Limitation       | No real-time multi-user sync          |

---

## Notes

- All emoji characters in the original test scenarios have been replaced with plain text equivalents
  in assertions (e.g. "Dairy" instead of "Dairy", "recipe?" badge text) to ensure
  cross-platform compatibility and avoid encoding issues in CI pipelines.
- Drag-and-drop tests (TS21, TS22) use Playwright's mouse API and may require
  `headless: false` if the HTML5 drag events do not fire in headless mode on some platforms.
  In that case, run: `npx playwright test --headed --grep "TS21|TS22"`
- TS33 (known limitation) is intentionally structured to assert that data divergence
  occurs and that the app does not crash — not that sync works.
- Mobile keyboard tests (TS28, TS29) simulate the viewport but cannot trigger a real
  software keyboard. These tests verify layout and in-viewport positioning only.
