<?php
// Run in a disposable real WordPress install via WordPress Playground, not on production.
require_once '/wordpress/wp-load.php';
require_once ABSPATH.'wp-admin/includes/plugin.php';
function trupath_check($ok,$message){if(!$ok)throw new Exception($message);}
$plugin='trupath_current_rates/trupath_current_rates.php';
$result=activate_plugin($plugin);
trupath_check(!is_wp_error($result),'Plugin activates without WordPress errors');
trupath_check(is_plugin_active($plugin),'WordPress records activation');
trupath_check(wp_next_scheduled('trupath_debt_refresh_rates')!==false,'Background event scheduled');
trupath_check(!wp_script_is('trupath-debt-embed','enqueued'),'No script is enqueued on ordinary requests');
if(!did_action('rest_api_init'))do_action('rest_api_init');
foreach(array('prime','mnd') as $kind){
 $response=rest_do_request(new WP_REST_Request('GET','/trupath-debt/v1/'.$kind));
 trupath_check($response->get_status()===200,'Public rate route returns 200');
 $data=$response->get_data();trupath_check(!empty($data['checkedAt'])&&$data['fallback']===true,'Dated cached snapshot available immediately');
}
$html=do_shortcode('[trupath_current_rates]');
trupath_check(strpos($html,'iframe')!==false&&strpos($html,'action=trupath_current_rates')!==false,'New shortcode renders frame');
trupath_check(wp_script_is('trupath-debt-embed','enqueued'),'Only shortcode renders enqueue frame helper');
deactivate_plugins($plugin);
trupath_check(!is_plugin_active($plugin),'Deactivation succeeds');
trupath_check(wp_next_scheduled('trupath_debt_refresh_rates')===false,'Background event removed');
trupath_check(function_exists('wp_insert_post')&&get_option('siteurl'),'WordPress remains operational');
$report = 'PASS: real WordPress activation, public REST routes, shortcode assets, deactivation, cron cleanup and continued WordPress operation. WordPress '.get_bloginfo('version').'; PHP '.PHP_VERSION."\n";

if (is_dir('/checks')) file_put_contents('/checks/result.txt', $report);
echo $report;
