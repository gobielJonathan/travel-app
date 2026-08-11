# Replace Trip pulse with Trip budget

Status: ready-for-agent
Label: ready-for-agent

## Problem Statement

Trip pulse occupies valuable space beside the crew and itinerary but provides only a static walking distance, shared-cost amount, and weather snapshot. It does not help travelers understand whether the trip remains within budget.

## Solution

Replace Trip pulse with a compact Trip budget card. The card gives travelers an at-a-glance view of total spending, remaining budget, budget progress, and category breakdown. It uses existing trip budget data and remains review-only, with no expense-entry or settlement actions.

## User Stories

1. As a traveler, I want to see total trip spending, so that I know how much has already been used.
2. As a traveler, I want to see remaining budget, so that I know how much I can still spend.
3. As a traveler, I want to see budget progress, so that I can quickly judge whether spending is on track.
4. As a traveler, I want to see spending by category, so that I know which parts of the trip consume the budget.
5. As a traveler, I want the budget summary in the existing Trip pulse location, so that I can review it without leaving the trip page.
6. As a traveler, I want the budget card to use current trip data, so that displayed values match the rest of the trip experience.
7. As a traveler, I want budget amounts formatted consistently, so that values are easy to scan and compare.
8. As a traveler, I want the progress indicator to communicate budget status clearly, so that I can notice risk without interpreting raw numbers.
9. As a traveler, I want the card to remain readable on small screens, so that I can review spending on mobile.
10. As a traveler, I want the removed Trip pulse metrics gone, so that the section focuses on budget review instead of unrelated summaries.
11. As a traveler, I want the card to show meaningful content even when category values are uneven, so that the breakdown remains useful across trips.
12. As a traveler, I want the summary to work without extra interaction, so that budget status is visible immediately when the trip page loads.

## Implementation Decisions

- Remove the static Trip pulse summary from the trip page.
- Add a compact Trip budget card in the same layout position.
- Use the existing trip data model and budget data source; do not add a new API, persistence layer, or state-management abstraction.
- Display total spent, remaining budget, and progress toward the total budget.
- Display category breakdown using existing budget categories and values.
- Keep the card review-only. Expense creation, budget editing, category editing, alerts, and settlement flows are not part of this change.
- Preserve the existing page layout, crew section, timeline section, visual language, and responsive behavior unless minor adjustments are required for the new card.
- Replace Trip pulse-specific labels and values rather than showing both sections.
- Handle missing or zero budget data without broken arithmetic or misleading progress. Progress must be bounded to a valid visual range.
- Use existing formatting utilities and component patterns where available; do not add dependencies.

## Testing Decisions

- Test at the highest existing seam: render the trip page with the existing trip fixture and verify externally visible budget content.
- Verify total spent, remaining budget, progress, and category breakdown render from trip data.
- Verify old Trip pulse content, including walking distance, weather, and its heading, is absent.
- Verify zero or missing budget data renders safely without invalid progress or broken layout.
- Verify responsive rendering keeps the card usable in the existing mobile layout.
- Follow existing page/component test conventions in the repository. Do not test internal implementation details or CSS selectors unless required to assert visible behavior.

## Out of Scope

- Adding expense-entry interactions.
- Editing total or category budgets.
- Settlement and owing calculations.
- Budget notifications or alerts beyond visual progress status.
- New backend endpoints, persistence, authentication, or synchronization.
- Reworking TripTimeline or CrewList.
- Weather, walking-distance, or other Trip pulse replacement metrics outside budget review.

## Further Notes

The replacement is intentionally compact: total and remaining amounts establish the headline, progress gives immediate status, and categories explain where spending goes. A richer budget workflow can be added later if users need action-oriented expense management.
