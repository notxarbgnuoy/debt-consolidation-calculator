<?php
// Focused PHP checks with WordPress boundary stubs. Never contacts external services.
define('ABSPATH', '/wordpress/');
$root = dirname(__DIR__);
$options = array(); $autoload = array(); $scheduled = array(); $registered = array(); $http_calls = 0; $network_mode = 'good'; $scripts = array();
function add_action() {} function add_shortcode() {} function register_activation_hook() {} function register_deactivation_hook() {}
function register_rest_route($ns,$path,$args) { global $registered; $registered[$path]=$args; }
function wp_next_scheduled($key) { global $scheduled; return $scheduled[$key] ?? false; }
function wp_schedule_event($time,$interval,$key) { global $scheduled; $scheduled[$key]=$time; }
function wp_clear_scheduled_hook($key) { global $scheduled; unset($scheduled[$key]); }
function get_option($key,$default=false) { global $options; return $options[$key] ?? $default; }
function add_option($key,$v,$deprecated='',$auto=null) { global $options,$autoload; if(isset($options[$key]))return false; $options[$key]=$v;$autoload[$key]=$auto;return true; }
function update_option($key,$v,$auto=null) { global $options,$autoload;$options[$key]=$v;$autoload[$key]=$auto; }
function delete_option($key) { global $options;unset($options[$key]); }
function plugins_url($path,$file) { return 'https://example.com/wp-content/plugins/trupath_current_rates/'.$path; }
function admin_url($path) { return 'https://example.com/wp-admin/'.$path; }
function add_query_arg($key,$value,$url) { return $url.'?'.$key.'='.$value; }
function esc_url($value) { return htmlspecialchars($value,ENT_QUOTES); }
function wp_enqueue_script($key) { global $scripts;$scripts[]=$key; }
class WP_Error {}
class WP_REST_Response {public $data;public $headers=array();function __construct($data){$this->data=$data;}function header($key,$value){$this->headers[$key]=$value;}}
function is_wp_error($r){return $r instanceof WP_Error;}
function wp_safe_remote_get($url,$args){global $root,$http_calls,$network_mode;$http_calls++;check($args['timeout']===8&&$args['limit_response_size']===1048576,'bounded requests');if($network_mode==='fail')return new WP_Error();return array('code'=>200,'body'=>$network_mode==='bad'?'invalid page':file_get_contents($root.'/tests/fixtures/'.(strpos($url,'federalreserve')!==false?'h15':'mnd').'.html'));}
function wp_remote_retrieve_response_code($r){return $r['code'];}function wp_remote_retrieve_body($r){return $r['body'];}
function check($value,$message){if(!$value)throw new Exception($message);}
require $root.'/wordpress/trupath_current_rates/trupath_current_rates.php';
require $root.'/wordpress/trupath_current_rates/includes/rate-parsers.php';
check($scripts===array()&&$http_calls===0&&$options===array(),'ordinary pages have no assets, remote requests or option reads/writes from boot');
TruPath_Current_Rates::activate();TruPath_Current_Rates::activate();check(count($scheduled)===1,'activation schedules one job');
TruPath_Current_Rates::routes();check(count($registered)===2,'exactly two public benchmark routes');
check($registered['/prime']['permission_callback']==='__return_true','public cache read');
$r=TruPath_Current_Rates::cached('prime');check($r->data['fallback']===true&&$http_calls===0,'unwarmed route uses dated snapshot without HTTP');
$time=strtotime('2026-11-06T00:00:00Z');
$p=TruPath_Current_Rates_Parsers::prime(file_get_contents($root.'/tests/fixtures/h15.html'),$time);check($p['rate']===7.0&&$p['observationDate']==='2026-11-02','Fed fixture value and date');
$m=TruPath_Current_Rates_Parsers::mnd(file_get_contents($root.'/tests/fixtures/mnd.html'),$time);check($m['rates']['fixed30']['rate']===7.3&&$m['rates']['fha30']['rate']===6.95&&$m['rates']['va30']['rate']===6.97,'MND product mapping');
check(TruPath_Current_Rates_Parsers::prime('garbage')===null&&TruPath_Current_Rates_Parsers::mnd('garbage')===null,'source format failures rejected');
check(TruPath_Current_Rates_Parsers::prime(file_get_contents($root.'/tests/fixtures/h15.html'),strtotime('2020-01-01'))===null,'future Fed dates rejected');
check(TruPath_Current_Rates_Parsers::mnd(file_get_contents($root.'/tests/fixtures/mnd.html'),strtotime('2020-01-01'))===null,'future MND dates rejected');
TruPath_Current_Rates::refresh();check($http_calls===2,'one request per source');
$r=TruPath_Current_Rates::cached('prime');check(!$r->data['fallback']&&$r->data['rate']===7.0,'good cache served');
for($i=0;$i<20;$i++)TruPath_Current_Rates::cached('prime');check($http_calls===2,'repeated visitor reads never fetch');
TruPath_Current_Rates::refresh();check($http_calls===2,'duplicate cron attempts throttled');
foreach(array('fail','bad') as $failure){foreach(array('prime','mnd') as $kind)$options['trupath_debt_rate_'.$kind]['attempted']=time()-4000;$network_mode=$failure;TruPath_Current_Rates::refresh();check(TruPath_Current_Rates::cached('prime')->data['rate']===7.0&&TruPath_Current_Rates::cached('prime')->data['fallback'],'network/parser failure preserves cache and flags fallback');}
$options['trupath_debt_refresh_lock']=time();$before=$http_calls;TruPath_Current_Rates::refresh();check($http_calls===$before,'concurrent lock prevents work');
foreach($autoload as $key=>$auto)check($auto===false,'benchmark options never autoload');
$html=TruPath_Current_Rates::shortcode();check(strpos($html,'iframe')!==false&&strpos($html,'loading="lazy"')!==false&&count($scripts)===1,'shortcode enqueues only frame helper');
TruPath_Current_Rates::deactivate();check(!$scheduled&&!isset($options['trupath_debt_refresh_lock']),'deactivation cleans cron and lock');
echo "PASS: PHP parsers, cache-only routes, background refresh, fallback, throttling, lock, non-autoload options, shortcode isolation and cron cleanup\n";
