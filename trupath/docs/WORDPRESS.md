# WordPress installation

The ready-to-install artifact is `releases/trupath_current_rates.zip`.

1. In WordPress: **Plugins → Add New → Upload Plugin**. Upload the ZIP and activate.
2. On the intended page, add a **Shortcode** block (works inside Spectra):

   ```text
   [trupath_current_rates]
   ```

3. Preview on staging, then publish when ready. No theme edits or external backend account is required.

The ZIP contains the complete current calculator. GitHub is a source-code backup/distribution location; the plugin does not depend on GitHub being available at runtime. Installing a new ZIP is necessary after source updates. Changes uploaded to GitHub alone do not automatically update a WordPress installation.

## Performance design

- Calculator JS, styles and fonts are served as static files in an isolated same-origin iframe. They are not enqueued on other pages.
- The shortcode page gets one small height helper, and the iframe is lazy-loaded. Calculator calculations continue to run in the visitor's browser.
- Rate REST endpoints read only two non-autoload options, or a bundled small snapshot. They never wait for the Fed/MND websites.
- A single hourly WP-Cron task refreshes the two fixed sources. Requests have an eight-second timeout and one-MiB response cap. Locking and one-hour attempt throttling prevent stampedes. This background job still uses a small amount of hosting CPU/network; actual site performance depends on the host and must be checked on staging.
- Cache data is not loaded into WordPress's global autoloaded options. No recurring work is scheduled on every normal page load.
- Existing rates remain available during network errors, source layout changes and delayed cron. Dated fallback warnings remain visible. This is not a guarantee the public rate sources stay available.

WP-Cron is WordPress's existing scheduler. Its trigger can depend on page visits, so an hourly job is not a guaranteed exact-hour refresh. If predictable scheduling is needed, ask your host to run the WordPress cron queue on a real schedule; keep other plugins' jobs intact. The plugin does not change global WP-Cron settings.

## Installation checks

- Confirm `/wp-json/trupath-debt/v1/prime` and `/wp-json/trupath-debt/v1/mnd` return JSON. Use the WordPress installation prefix if applicable. WordPress automatically constructs the correct REST URL, including plain permalinks.
- After activation, the first refresh is scheduled for ten seconds later. Actual execution depends on cron. Check returned `checkedAt`, `observationDate`, `source`, `fallback` values after cron runs. Bundled snapshots are usable immediately and are labeled fallback.
- If your host blocks outgoing HTTPS, REST routes, iframe requests or cron, ask the host to allow these specific operations. No arbitrary proxy is exposed.
- If using a host command line, `wp cron event run trupath_debt_refresh_rates` runs the plugin job. Repeated runs within the hour intentionally do not fetch again.
- Check desktop/mobile layout and iframe sizing. Do not merge/defer the calculator's module files with theme scripts. The frame endpoint is `wp-admin/admin-post.php?action=trupath_current_rates`; it remains accessible to logged-out visitors.
- Browser storage belongs to the WordPress origin. Inputs saved at the demo or a GitHub Pages origin do not automatically transfer.

## Development

Sources are under `wordpress/trupath_current_rates/`. Rebuild after calculator or plugin edits:

```sh
node scripts/build-wordpress.mjs
```

The packager copies the current `public/` calculator, configures its benchmark URLs for the two WordPress endpoints, and produces the ZIP. It does not modify the hosted demo, calculation engine or `public/` source. No build tool runs on WordPress.

Focused checks (PHP 7.4+):

```sh
php -l wordpress/trupath_current_rates/trupath_current_rates.php
php -l wordpress/trupath_current_rates/includes/rate-parsers.php
php tests/wordpress-plugin.php
```

These checks exercise PHP syntax, actual source fixture parsing and plugin cache/cron behavior through WordPress boundary stubs. They passed using WordPress Playground's PHP runtime. The renamed plugin also passed an isolated real WordPress 7.1.4 / PHP 8.3.36 smoke check: activation, public REST responses, shortcode output and conditional script enqueueing, deactivation, cron cleanup and continued WordPress operation. This was a fresh Playground install, not the user's hosting/theme/plugin combination; staging checks above are still necessary. No financial calculation changes or full financial test rerun were needed.

## Removal

Deactivate to unschedule the plugin job. Its two last-good rate options remain for reactivation; they contain only public benchmark data. To delete those too, use WP-CLI `wp option delete trupath_debt_rate_prime` and `wp option delete trupath_debt_rate_mnd` after deactivation. Browser-local borrower inputs are independent of WordPress database options.

## Renaming / recovery / GitHub

The package and shortcode are now `trupath_current_rates` (display name: TruPath Current Rates). It still bundles the full calculator and cached rate readers. If the prior TruPath Debt Calculator plugin is already installed, deactivate that version before activating this renamed plugin; replace the old shortcode with `[trupath_current_rates]`.

The plugin does not edit themes, WordPress core, `wp-config.php`, borrower records or existing posts. It registers its own shortcode, two public rate routes and one background job. It stores only public benchmarks and a temporary job lock in its own options.

No plugin can be guaranteed safe for an unknown combination of hosting, PHP, themes and other plugins. Take a current site backup and use staging first. If activation ever prevents admin access, use your host's File Manager/SFTP to rename `wp-content/plugins/trupath_current_rates` to `trupath_current_rates-disabled`; WordPress will skip its missing original path. This disables the plugin without changing theme or core files.

Update GitHub with the new `wordpress/trupath_current_rates/` folder, `scripts/build-wordpress.mjs`, `releases/trupath_current_rates.zip`, the WordPress tests and these instructions/README. The earlier GitHub upload does not contain this addition unless you upload/commit it now. GitHub source and WordPress installations do not synchronize automatically. The calculator's financial engine is unchanged.
