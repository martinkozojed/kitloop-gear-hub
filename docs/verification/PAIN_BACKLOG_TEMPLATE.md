# F1 Pilot Pain Backlog

This document serves as the single source of truth for tracking friction, blockers, and feature gaps discovered during the F1 Pilot Execution (Shadow Mode).

## Triage Tags

* **[BLOCKER]**: The operation could not be completed in Kitloop; staff had to revert to paper/Excel. (Requires immediate hotfix before continuing).
* **[FRICTION]**: The operation was completed, but required excessive clicking, confused the user, or felt slower than paper.
* **[GAP]**: A missing feature that is expected, but explicitly deferred to a later phase (e.g., F2, F4, F5).

## Log

| Date | Location/Rental | Tag | Description | Impact | Status / Target Phase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| YYYY-MM-DD | Example Rental | [FRICTION] | Too many clicks to find the scanned item during issue. | Medium (5s delay) | To do (F4) |
| YYYY-MM-DD | Example Rental | [BLOCKER] | Cannot issue because generic DB error occurs when skipping state. | High | Fixed in PR 2 |
| | | | | | |
| | | | | | |

## Rules for adding to this backlog

1. **Be specific**: Don't say "it was slow". Say "took 15 seconds to find the reservation after customer gave their name".
2. **Replication**: Note if multiple rentals experience the same friction.
3. **No scope creep**: Do not solve `[GAP]` items during F1 unless they are re-classified as `[BLOCKER]` for the shadow mode.
