# Measuring genuine Booki usage

Booki already includes Vercel Web Analytics through `@vercel/analytics`. This
change adds no analytics vendor, database table, user identifier, or tracking
of messages, contact details, passwords, or precise location.

## What the metrics mean

- **Page views** are tracked page loads or route views. They are not people.
- **Unique visitors** are Vercel's analytics estimate for the selected period.
  They are not registered members and are not an exact count of authenticated
  users.
- **Referral visits** are actual app loads that arrive with Booki's own
  `utm_source=booki&utm_medium=share&utm_campaign=community` link. This event
  is emitted once on initial app load and is separate from page views.
- **Booki share events** count successful share-sheet, link-copy, or QR-download
  actions. They do not prove that a recipient opened the link.
- **Registered members, published books, requests, and completed exchanges**
  are separate product/database metrics. Vercel traffic analytics does not
  supply these counts. Do not substitute page views, share events, or the
  public-book counter for them.
- **Active sessions** are not currently measured as an in-app member metric.

Vercel Analytics can provide traffic trends and available referrer/device
breakdowns in its dashboard. Campaign-tagged referrals should only be reported
from an actual `booki_referral_visit` event; do not infer a campaign from an
ordinary page view. The custom event includes only the fixed source, medium,
and campaign values above, and the share event includes only its method and
whether it links to a book.

## Manual production check

1. In the Vercel account, open the existing project serving
   `booki-vn.vercel.app` and confirm Web Analytics is enabled.
2. After the reviewed deployment, open that project's Analytics view and select
   the reporting period before recording page views, unique visitors, referrers,
   or device breakdowns.
3. Use the custom events `booki_referral_visit` and `booki_share` only for their
   definitions above. Do not present either as unique people, registrations,
   completed invitations, or transactions.
4. Read registered-member and exchange totals from their real application data
   sources with the appropriate visibility rules. This change does not query or
   alter the production Supabase project and does not add an admin dashboard.

The app's existing Vercel Analytics component is present in source. Whether the
production Vercel project has Analytics enabled and what historical data it
contains must be verified by an authorized project owner; no production traffic
or database totals were queried during this change.
