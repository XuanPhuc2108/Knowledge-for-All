# Mobile performance and book image editor

## Mobile navigation

The mobile menu is constrained to the dynamic viewport, with a `100vh` fallback,
safe-area padding, an independently scrollable menu surface, touch scrolling, and
contained overscroll. The page body is fixed while the menu is open and its
previous inline styles and scroll position are restored when the menu closes or
unmounts. Escape, focus trapping/restoration, route changes, outside clicks,
reduced motion, and the menu button's expanded state are handled accessibly.

The menu's full-screen backdrop no longer uses a backdrop blur. The menu toggle
and close control have touch-sized targets and visible keyboard focus.

## Browser and performance findings

The existing menu backdrop applied blur across the full viewport. That is an
expensive compositing surface on mobile GPUs and can be particularly costly in
WebViews; it has been replaced with a translucent flat backdrop. The existing
navigation scroll listener already uses a passive listener and coalesces updates
with `requestAnimationFrame`, so it was left unchanged.

The book-photo editor is opt-in. Selecting or capturing an image leaves the
existing preview and listing workflow ready to submit; users open the editor
only with the explicit "Chỉnh ảnh" action. If preview/export fails, the user
can close the editor and keep the original selected image.

Book creation does not wait for best-effort cover cleanup after a failed
database insert. The insert error is returned immediately so the submit handler's
`finally` can release the loading state; rollback cleanup still runs and logs
failures without masking the original database error.

No Firefox-specific performance bottleneck has been measured in this environment.
Firefox is not installed or available through the browser preview, and no
Firefox profiler trace, physical-device trace, or controlled Chromium comparison
could be collected. The full-screen blur removal is a code-confirmed reduction
in compositing work, not a measured Firefox benchmark. No claims of improved
Firefox frame rate are made.

The application still uses its existing animation and visual libraries. No
dependencies, production Supabase settings, storage buckets, or database schemas
were changed.

## Image editor

The create/edit book image flow keeps the original listing workflow on image
selection and opens its in-place, browser-local editor only when the user chooses
"Chỉnh ảnh". It supports free, square (1:1), and book-photo (4:3) cropping; brightness and contrast sliders;
localized blur strokes; bounded undo/redo; reset; preview; cancel; and apply.
Pointer events cover mouse and touch input. The editor previews at up to 1440
pixels on the longest side and keeps at most 15 history snapshots, 80 strokes,
and 240 points per stroke.

Applying edits exports a WebP image where supported, with PNG/JPEG output
accepted when the browser chooses a fallback format. Canvas processing remains
on-device, and canvas export strips metadata as a normal canvas re-encode does.
The result returns to the existing book form and is uploaded only when the
existing form is submitted, using the existing Supabase Storage workflow.
Image decoding falls back from `createImageBitmap` to an object-URL-backed
`Image` element; temporary object URLs and image bitmaps are released. Export
falls back from `toBlob` to `toDataURL` when needed. HEIC is not accepted by the
file picker; unsupported image decoding shows a localized error.

Editing a remote image requires the existing image host to allow canvas CORS.
If it does not, the browser prevents pixel export and the editor reports an
error; this change does not alter storage permissions.

## Verification

| Verification | Result |
| --- | --- |
| Automated tests | `npm test` — 48 passed, 0 failed |
| Lint | `npm run lint` — passed |
| Production build | `npm run build` — passed |
| Patch whitespace | `git diff --check` — passed |
| Browser preview | Embedded Chromium-based browser, 724 × 680 CSS pixels; menu open/close, focus restoration, body-lock cleanup, and route-change close verified |
| Responsive emulation | 320 × 640, 360 × 800, 375 × 812, 390 × 844, 430 × 932, 768 × 1024, and 1366 × 768 emulated with same-origin responsive iframes; no horizontal page overflow observed |
| Long-menu stress | At 320 × 640, eight extra links were added to simulate the longer signed-in menu; the internal scroll area reached the final action while the background body stayed locked |
| Canvas smoke check | In-browser 80 × 80 synthetic image: crop returned 40 × 40 pixels; brightness/contrast changed pixel values; a painted blur region changed while an unpainted white pixel remained unchanged; export returned a non-empty WebP Blob |
| Physical devices | Not tested |
| Firefox desktop/Android | Not tested; no Firefox runtime available |
| Zalo In-App Browser / Android WebView | Not tested on a device |
| Safari iOS | Not tested on a device |
| Editor UI / Storage upload | Authenticated Create/Edit Book flow and real Storage upload were not exercised in this browser session; the editor uses the existing form upload path |

The browser preview is emulation, not evidence of physical-device compatibility.
Test the viewport matrix and the Zalo, Firefox, and Safari environments on
devices before making browser-specific performance claims.
