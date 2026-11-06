=== TruPath Current Rates ===
Requires at least: 6.2
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

A standalone calculator embedded with [trupath_current_rates].

INSTALLATION
1. Upload trupath_current_rates.zip through Plugins > Add New > Upload Plugin.
2. Activate the plugin.
3. Add a WordPress Shortcode block (including in Spectra) containing:
   [trupath_current_rates]
4. Save/publish that page. No theme edits, API credentials or permalink flush needed.

HOW IT WORKS
Calculator CSS/JS/fonts load only inside an isolated iframe on the calculator page.
The main WordPress page loads a small iframe-height helper only when the shortcode is rendered.
All borrower calculations and input saving stay in that browser; no contact collection or PDF/GHL integration is included.
Public Fed Prime and MND benchmarks are refreshed by one hourly WP-Cron job.
Visitor rate requests ONLY read saved rates; they never fetch remote sources.
Unwarmed/failed refreshes use dated bundled/last-good rates, with fallback warnings.

Public cache routes:
/wp-json/trupath-debt/v1/prime
/wp-json/trupath-debt/v1/mnd
Use the full site installation prefix if WordPress lives in a subdirectory.
With plain permalinks WordPress automatically uses the rest_route query-string form.

OPERATIONS
WP-Cron depends on visits or a hosting scheduler. If your host disables WP-Cron,
ask them to run the existing WordPress cron queue regularly. Do not disable the
site's other cron jobs. The first refresh is scheduled 10 seconds after activation,
but the actual run may be later. Cached snapshots work immediately.
On cron runs, there are at most two outbound HTTP requests (8-second timeout each).
Duplicate runs are throttled, and failed/older/malformed source data never replaces
newer valid data. Source HTML changes may require a plugin parser update.
Deactivation removes this plugin's scheduled job and transient lock, preserving
last-good benchmark data for reactivation. Benchmark options are not autoloaded.

TEST ON STAGING
Check shortcode layout, live endpoint checkedAt/source/fallback fields, background
cron operation, and your host's REST/security/cache rules before public launch.
Exclude the calculator iframe URL from HTML/JS optimizers that merge module scripts.
A normal page cache may cache the parent page, but do not freeze the rate API in a
long-lived cache (the route advertises 5 minutes).

DATA
No borrower financial information is posted to WordPress or the benchmark sources.
The only iframe message is its height. Local storage is browser- and origin-specific;
inputs saved on the former demo/GitHub origin will not automatically migrate here.
Public rate fetching sends ordinary server HTTP requests to:
https://www.federalreserve.gov/releases/h15/
https://www.mortgagenewsdaily.com/mortgage-rates

No Cloudflare account, Supabase account, Node.js or npm is required to install.

RENAMED PACKAGE
Shortcode: [trupath_current_rates]. If the previous TruPath Debt Calculator plugin
is installed, deactivate it before activating this renamed plugin.
Verified in an isolated WordPress 7.1.4 / PHP 8.3.36 installation: activation,
public cached routes, shortcode asset loading, deactivation and cron cleanup.
Unknown hosting/plugin combinations still require staging validation.
If admin access is lost, rename wp-content/plugins/trupath_current_rates using
your host's File Manager to disable it. This plugin does not edit theme/core
files or wp-config.php.
