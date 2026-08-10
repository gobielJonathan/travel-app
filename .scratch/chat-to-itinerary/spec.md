# Chat-to-itinerary generation

Status: ready-for-agent
Label: ready-for-agent

## Problem Statement

Travelers can discuss trip ideas with Roam AI on the landing page, but discussion currently does not become a usable itinerary. Users must manually recreate destination, dates, activities, food ideas, and preparation tasks on the trip page, losing the value of the conversation.

## Solution

Let travelers discuss their plan with Roam AI on the landing page, then click Start planning to generate an editable itinerary preview. Require destination and dates before generation; ask a follow-up when either is missing. Show the generated itinerary for confirmation before replacing the trip timeline. Each event carries recommendations, nearby food recommendations, preparation todos, and optional group task assignments. Persist discussion, preview, confirmed itinerary, and edits in IndexedDB.

## User Stories

1. As a traveler, I want to discuss destination ideas with Roam AI, so that I can shape a trip before editing a timeline.
2. As a traveler, I want my discussion to persist while moving from landing page to trip page, so that my context is not lost.
3. As a traveler, I want Start planning to use my discussion, so that I do not repeat information manually.
4. As a traveler, I want the system to detect whether destination and dates are known, so that incomplete plans do not become misleading itineraries.
5. As a traveler, I want a clear follow-up question when destination is missing, so that I know what to provide.
6. As a traveler, I want a clear follow-up question when dates are missing, so that I can complete the plan.
7. As a traveler, I want generation blocked until destination and dates are available, so that the itinerary has a valid foundation.
8. As a traveler, I want one generated preview after clicking Start planning, so that I can review the whole plan together.
9. As a traveler, I want the preview to show event times, places, and tags, so that I can assess the schedule.
10. As a traveler, I want each event to include recommendations, so that I know why an activity fits the plan.
11. As a traveler, I want each event to include nearby food recommendations, so that meals are easy to plan around activities.
12. As a traveler, I want each event to include preparation todos, so that tickets, reservations, and packing are not forgotten.
13. As a traveler, I want todos to support optional group task assignments, so that responsibilities can be shared with travelers.
14. As a traveler, I want to inspect event details before confirmation, so that I can catch unsuitable suggestions.
15. As a traveler, I want to confirm the generated preview, so that it becomes my editable trip timeline.
16. As a traveler, I want to discard the generated preview, so that I can start with a blank plan.
17. As a traveler, I want confirmation to replace demo itinerary data, so that the timeline reflects my actual discussion.
18. As a traveler, I want confirmed events to remain editable, so that I can adjust the plan with my group.
19. As a traveler, I want event todos to remain visible after confirmation, so that preparation work stays connected to the event.
20. As a traveler, I want food recommendations to remain visible after confirmation, so that the timeline supports decisions during the trip.
21. As a traveler, I want the plan and edits to survive browser restarts, so that my itinerary is not lost.
22. As a traveler, I want loading feedback while the itinerary is generated, so that I know the request is still active.
23. As a traveler, I want a useful error when generation fails, so that I can retry without losing the discussion.
24. As a traveler, I want generated replies to remain concise and practical, so that the preview is easy to review.
25. As a traveler, I want repeated generation requests to avoid unnecessary AI calls when inputs are unchanged, so that the app is fast and economical.
26. As a traveler, I want the system to preserve enough discussion context for good recommendations, so that token reduction does not make the itinerary generic.
27. As a traveler, I want the generated plan to be clearly marked as a preview, so that I know confirmation is still required.
28. As a traveler, I want the confirmed itinerary to open directly on the trip page, so that I can continue planning immediately.

## Implementation Decisions

- Extend the existing landing discussion flow and trip state rather than creating a separate planning application.
- Add a dedicated itinerary-generation API operation using the existing DeepSeek provider boundary.
- Keep discussion generation and itinerary generation separate: discussion returns conversational text; itinerary generation returns validated structured data.
- The generation request includes compact discussion history and trip context to control input tokens while preserving relevant intent.
- The API requires destination and dates. Missing values produce a structured validation response containing the follow-up question.
- The structured itinerary includes trip metadata and events. Each event includes time, title, place, tag, coordinates when available, recommendations, nearby food recommendations, and todos.
- Each todo includes text, completion state, and optional assignee initials.
- The landing page navigates to a trip-page preview state after Start planning.
- The trip page renders a reviewable preview before mutating the confirmed trip timeline.
- Confirming the preview replaces demo/current itinerary events with generated events. Discarding leaves a blank/current plan and clears preview data.
- Existing event-detail UI becomes the highest-level seam for displaying recommendation, food, and todo information.
- IndexedDB is the persistence boundary for discussion, generated preview, confirmed itinerary, and edits. A small client persistence adapter hides IndexedDB transaction details from page components.
- Session storage may remain as a migration fallback for existing discussion data, but new confirmed state uses IndexedDB.
- AI output is schema-validated before preview rendering. Invalid or incomplete output returns a recoverable generation error.
- API credentials remain server-only. Client code never receives the DeepSeek key.
- Responses remain concise; generation uses bounded history, bounded context, and an explicit output token limit.

## Testing Decisions

- Test external behavior through one end-to-end flow: landing discussion, Start planning, preview generation, confirmation, trip timeline, and event detail inspection.
- Mock the DeepSeek API at the server API boundary so tests verify request/response behavior without network dependency or token cost.
- Verify destination/date validation and follow-up behavior.
- Verify preview confirmation replaces timeline events and discard does not.
- Verify recommendations, nearby food, todos, and optional assignees appear in event details.
- Verify IndexedDB persistence across navigation/reload boundaries.
- Verify generation loading and recoverable error states.
- Test API schema rejection for malformed AI output and ensure no invalid event reaches the timeline.
- Prefer existing Vue/Nuxt component interaction patterns; no implementation-detail assertions on internal refs, storage calls, or DeepSeek request construction.

## Out of Scope

- User accounts, authentication, or server-side multi-device synchronization.
- Real-time collaborative editing across crew members.
- Booking restaurants, tickets, hotels, or transport.
- Live availability, prices, reservations, or guaranteed opening hours.
- Automatic itinerary generation before the traveler clicks Start planning.
- Separate AI calls for every event after the initial generation.
- Full offline AI inference.
- Replacing the existing route/map provider.
- Automatic assignment of todos without traveler confirmation.

## Further Notes

The recommended implementation seam is the landing-to-trip preview flow. Generated content should be treated as suggestions, not verified reservations. If IndexedDB support or browser storage is unavailable, show a recoverable persistence warning while keeping the current in-memory session usable.
