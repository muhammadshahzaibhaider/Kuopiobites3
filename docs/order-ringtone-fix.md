# Order notification ringtone: findings and release record

Date: 25 November 2026 (Asia/Karachi).

Status: implemented on an isolated review branch. Production deployment, independent review and restaurant-device acceptance are pending. This record does not declare the live incident resolved.

## Evidence and diagnosis

The production Render service `kuopiobites-api` points to `muhammadshahzaibhaider/Kuopiobites3`, branch `main`, directory `backend/`. The audited repository base is `4c9f02e08b16a70ef809164cb8a760808dcf3c78`. The public `/admin` JavaScript contains the HTML audio implementation and controls in `frontend/src/app/admin/page.tsx`. The exact deployed frontend commit and Vercel project settings could not be verified: the Vercel connection returned a team authorization error (403).

| Finding | Evidence | Change |
| --- | --- | --- |
| Unlock can silence a subsequent ring or preview | `unlockAudio()` calls `play()` and later unconditionally pauses the shared player. Deterministic tests reproduce the late callback pausing a newer ring and chime. The live bundle contains that callback. | Each playback has an attempt version. Obsolete completions cannot pause, reset or relock a newer playback. |
| An ordinary dashboard gesture interrupts a ringing player | Unlock resets source/volume and pauses on completion. | Unlock during an active ring resumes the existing loop without resetting its source or position. |
| Tone preview disables the active loop | Preview sets the same player's `loop` to false. | Tone preview during an active alert preserves the ring and its deadline. |
| Failed playback is hidden | Rejected `play()` promises do not produce a visible actionable state. | Readiness follows the actual playback result; a visible Enable order sound control remains available above the existing order takeover. |
| Ringtone source lacks an explicit CSP media allowance | The live response has `default-src 'self'` and no `media-src`, while the WAV is a `blob:` URL. | Add `media-src 'self' blob:` in both existing build configurations. Other source restrictions remain intact. Browser-specific enforcement of the original policy has not been reproduced in this environment; this is a compatibility risk, not a claimed observed browser violation. |
| Unused Web Audio contexts accumulate on gestures | Each unlock constructs a separate context that does not play the actual kitchen ringtone. | Remove this unused path; retain the existing single HTML audio player. |

The original sound detector already included unpaid `placed` tickets. The paid-only filter controls the order acceptance takeover, not ringtone eligibility. Payment gating was not identified as the ringtone's root cause.

## Resulting behavior and scope

New, non-refunded `placed` orders receive the same ring window regardless of payment status. A shared, tested scheduler serves both gesture recovery and order updates. Windows start when the tab first sees a ticket, preserving the existing five-minute duration and five-second polling interval. Repeated polls or a pending-to-paid update do not extend the same ticket's window. A later order has its own window. Accepted, cancelled, completed and refunded tickets stop contributing to the ring. Muting immediately stops audio.

Browsers can require a trusted click before allowing sound in a newly loaded document. Sign-in continues to prime audio before its network request; restored sessions and failed playback have an explicit recovery control. Successful playback cannot confirm physical speaker output or override a muted device, denied site sound permission, closed page or suspended device.

Changes are limited to notification code, its existing controls, explicit media policy and regression tests. The duplicated root notification module receives the same audio lifecycle fix for compatibility with the existing alternate build root. Checkout, Stripe webhook processing, payment confirmation, order persistence, acceptance guards and API handlers are not modified. No production orders, payments, refunds, settings or database rows were written during this investigation. This work does not certify unrelated existing payment logic.

## Validation

| Check | Result |
| --- | --- |
| `cd frontend && npm run test:ring` | 19 passed, 0 failed. Imports the production TypeScript module; uses controlled audio promises and timers. Requires Node with TypeScript stripping support, such as the tested Node 24.22.3. |
| Playback regression checks against the original source | Late unlock pauses the ring/chime; gestures interrupt audio; preview removes looping. The expanded suite on the baseline has 4 passes and 15 failures, including APIs introduced for testability and feedback; this is not a count of 15 independently verified production defects. |
| `cd frontend && npm run typecheck` | Passed. |
| Targeted TypeScript check of `src/admin/notify.ts` in the alternate root | Passed. |
| `cd frontend && npm run build` | Passed with Next.js 16.4.6; all 19 pages generated. |
| `git diff --check` | Passed. |
| Source diff for backend, checkout and store | No changes. |
| Real browser audio suite | Added as `cd frontend && npm run test:ring:browser`. Not passed in this environment: no usable local Chromium binary, and official browser downloads returned 403. The suite checks real playback under application CSP, all tones, loop preservation, stopping, deliberate CSP denial, and autoplay recovery. It serves only isolated fixtures and rejects external network requests. |
| Restaurant dashboard and physical speaker acceptance | Pending staff sign-in and testing on the restaurant's actual device. No successful live audio test is claimed. |

The existing frontend manifest and lockfile disagree: the manifest requests Next `^16.4.1`, while the lockfile has `16.4.0`. A clean `npm ci` failed before implementation. Dependencies were installed for validation with `npm install --ignore-scripts --no-package-lock`; the committed dependency versions and lockfile were not changed. Resolve this existing reproducibility problem in a separately reviewed dependency change before relying on a clean-install release gate.

## Required review and release checks

1. LM Arena or another independent reviewer reviews the patch and reruns the unit and browser suites. The author's own review does not satisfy the project's independent review requirement.
2. Verify the Vercel team, actual project root, source branch/commit and preview environment. Confirm no second upstream CSP header blocks media.
3. On an isolated preview with test data, open the dashboard in a fresh document, enable sound, then receive unpaid and paid orders while idle. Verify audible ringing, two close arrivals, tone selection, mute/unmute, refresh/re-enable, acceptance, decline, refund/completion and network recovery. Verify a received order rings without another click after audio has been enabled. Observe the existing five-minute timeout.
4. Check that unpaid orders still cannot be accepted and paid order/payment states remain correct. Use test payments; production financial transactions require the owner's involvement.
5. Obtain the project owner's final deployment approval after independent review and business acceptance. Do not merge or release automatically.
6. After the approved release, verify the deployed commit, explicit media policy and audible behavior on the restaurant device. Only then mark the production defect resolved. If it regresses, revert this frontend change and redeploy the prior approved build; no database migration or data rollback is involved.

References: [MDN autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), [MDN media-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/media-src).
