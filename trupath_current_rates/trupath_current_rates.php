<?php
/**
 * Plugin Name: TruPath Current Rates
 * Description: Isolated debt calculator with cached Fed/MND benchmarks and background refreshes. Shortcode: [trupath_debt_consolidation]
 * Version: 1.0.3
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 */
if (!defined('ABSPATH')) { exit; }
final class TruPath_Current_Rates {
    const CRON = 'trupath_debt_refresh_rates';
    const VERSION = '1.0.3';
    public static function boot() {
        add_shortcode('trupath_debt_consolidation', array(__CLASS__, 'shortcode'));
        // Keep existing WordPress pages working after the update.
        add_shortcode('trupath_current_rates', array(__CLASS__, 'shortcode'));
        add_action('rest_api_init', array(__CLASS__, 'routes'));
        add_action(self::CRON, array(__CLASS__, 'refresh'));
        add_action('admin_post_trupath_current_rates', array(__CLASS__, 'page'));
        add_action('admin_post_nopriv_trupath_current_rates', array(__CLASS__, 'page'));
    }
    public static function activate() {
        if (!wp_next_scheduled(self::CRON)) { wp_schedule_event(time() + 10, 'hourly', self::CRON); }
    }
    public static function deactivate() {
        wp_clear_scheduled_hook(self::CRON);
        delete_option('trupath_debt_refresh_lock');
    }
    public static function shortcode() {
        // Assets are only enqueued when this shortcode is actually rendered.
        wp_enqueue_script('trupath-debt-embed', plugins_url('assets/embed.js', __FILE__), array(), self::VERSION, true);
        $url = add_query_arg('action', 'trupath_current_rates', admin_url('admin-post.php'));
        return '<iframe data-trupath-calculator title="TruPath Debt Consolidation Calculator" src="' . esc_url($url) . '" loading="lazy" referrerpolicy="same-origin" style="display:block;width:100%;height:1700px;border:0" allow="" ></iframe><noscript>Enable JavaScript to use this calculator.</noscript>';
    }
    public static function page() {
        // Standalone document isolates calculator CSS, events and IDs from WordPress.
        nocache_headers();
        header('Content-Type: text/html; charset=UTF-8');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('X-Robots-Tag: noindex, nofollow');
        $base = plugins_url('public/', __FILE__);
        $config = '<base href="' . esc_url($base) . '"><meta name="trupath-prime-endpoint" content="' . esc_url(rest_url('trupath-debt/v1/prime')) . '"><meta name="trupath-mnd-endpoint" content="' . esc_url(rest_url('trupath-debt/v1/mnd')) . '"><script defer src="' . esc_url(plugins_url('assets/frame.js', __FILE__)) . '?v=' . self::VERSION . '"></script>';
        $html = file_get_contents(__DIR__ . '/public/index.html');
        echo str_replace('<head>', '<head>' . $config, $html); // Trusted bundled document; all injected URLs escaped above.
        exit;
    }
    public static function routes() {
        foreach (array('prime', 'mnd') as $kind) {
            register_rest_route('trupath-debt/v1', '/' . $kind, array(
                'methods'=>'GET', 'permission_callback'=>'__return_true',
                'callback'=>function() use ($kind) { return self::cached($kind); },
            ));
        }
    }
    public static function cached($kind) {
        // Cache-only: never perform a remote request from a visitor's request.
        $stored = get_option('trupath_debt_rate_' . $kind, array());
        $data = isset($stored['data']) ? $stored['data'] : json_decode(file_get_contents(__DIR__ . '/public/data/' . $kind . '.json'), true);
        if (!is_array($data)) { return new WP_Error('trupath_rate_unavailable', 'Benchmark unavailable. Enter a rate manually.', array('status'=>503)); }
        $data['fallback'] = empty($stored['data']) || empty($stored['ok']) || time() - (int)($stored['checked'] ?? 0) > 7200;
        $response = new WP_REST_Response($data);
        $response->header('Cache-Control', 'public, max-age=300');
        $response->header('X-Content-Type-Options', 'nosniff');
        return $response;
    }
    public static function refresh() {
        // A lock prevents simultaneous cron workers from multiplying remote requests.
        $lock = (int)get_option('trupath_debt_refresh_lock', 0);
        if ($lock && time() - $lock < 60) { return; }
        if ($lock) { delete_option('trupath_debt_refresh_lock'); }
        if (!add_option('trupath_debt_refresh_lock', time(), '', false)) { return; }
        try {
            require_once __DIR__ . '/includes/rate-parsers.php';
            foreach (array('prime'=>TruPath_Current_Rates_Parsers::PRIME_SOURCE, 'mnd'=>TruPath_Current_Rates_Parsers::MND_SOURCE) as $kind=>$url) {
                $key = 'trupath_debt_rate_' . $kind;
                $stored = get_option($key, array());
                // Duplicate invocations and failed refreshes are limited to one attempt/hour.
                if (!empty($stored['attempted']) && time() - (int)$stored['attempted'] < 3500) { continue; }
                $stored['attempted'] = time(); $stored['ok'] = false;
                $response = wp_safe_remote_get($url, array('timeout'=>8, 'redirection'=>2, 'limit_response_size'=>1048576, 'headers'=>array('Accept'=>'text/html')));
                if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                    $data = call_user_func(array('TruPath_Current_Rates_Parsers', $kind), wp_remote_retrieve_body($response));
                    $previous = $stored['data'] ?? json_decode(file_get_contents(__DIR__ . '/public/data/' . $kind . '.json'), true);
                    $old_date = $kind === 'prime' ? ($previous['observationDate'] ?? '') : ($previous['rates']['fixed30']['observationDate'] ?? '');
                    $new_date = $data ? ($kind === 'prime' ? $data['observationDate'] : $data['rates']['fixed30']['observationDate']) : '';
                    if ($data && $new_date >= $old_date) { $stored['data'] = $data; $stored['checked'] = time(); $stored['ok'] = true; }
                }
                // Failed source parsing never replaces the last good benchmark.
                update_option($key, $stored, false);
            }
        } finally { delete_option('trupath_debt_refresh_lock'); }
    }
}
TruPath_Current_Rates::boot();
register_activation_hook(__FILE__, array('TruPath_Current_Rates', 'activate'));
register_deactivation_hook(__FILE__, array('TruPath_Current_Rates', 'deactivate'));
