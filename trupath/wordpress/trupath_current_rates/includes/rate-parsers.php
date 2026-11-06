<?php
/** Fixed-source HTML readers. No WordPress dependencies; independently testable. */
final class TruPath_Current_Rates_Parsers {
    const PRIME_SOURCE = 'https://www.federalreserve.gov/releases/h15/';
    const MND_SOURCE = 'https://www.mortgagenewsdaily.com/mortgage-rates';
    private static function clean($html) {
        return trim(preg_replace('/\s+/u', ' ', html_entity_decode(preg_replace('/<[^>]*>/', ' ', $html), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    }
    private static function date_valid($value, $now) {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));
        return $date && $date->format('Y-m-d') === $value && $date->getTimestamp() <= $now;
    }
    public static function prime($html, $now = null) {
        $now = $now ?? time();
        if (!preg_match('/<table\b[^>]*id=["\']h15table["\'][^>]*>([\s\S]*?)<\/table>/i', $html, $table)) { return null; }
        preg_match_all('/<th\b([^>]*)>([\s\S]*?)<\/th>/i', $table[1], $heads, PREG_SET_ORDER);
        $dates = array(); $months = array('jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec');
        foreach ($heads as $head) {
            if (!preg_match('/\bid=["\'](col\d+)["\']/', $head[1], $id) || !preg_match('/^(\d{4})\s+([A-Za-z]+)\s+(\d{1,2})$/', self::clean($head[2]), $parts)) { continue; }
            $month = array_search(strtolower(substr($parts[2], 0, 3)), $months, true);
            if ($month === false) { continue; }
            $date = sprintf('%04d-%02d-%02d', $parts[1], $month + 1, $parts[3]);
            if (self::date_valid($date, $now)) { $dates[$id[1]] = $date; }
        }
        preg_match_all('/<tr\b[^>]*>([\s\S]*?)<\/tr>/i', $table[1], $rows, PREG_SET_ORDER);
        $values = array();
        foreach ($rows as $row) {
            if (!preg_match('/<th\b[^>]*>([\s\S]*?)<\/th>/i', $row[1], $head) || !preg_match('/^Bank prime loan\b/i', self::clean($head[1]))) { continue; }
            preg_match_all('/<td\b([^>]*)>([\s\S]*?)<\/td>/i', $row[1], $cells, PREG_SET_ORDER);
            foreach ($cells as $cell) {
                $raw = self::clean($cell[2]);
                if (!preg_match('/\bcol\d+\b/', $cell[1], $col) || !isset($dates[$col[0]]) || !preg_match('/^\d+(\.\d+)?$/', $raw)) { continue; }
                $rate = (float) $raw;
                if ($rate > 0 && $rate <= 30) { $values[$dates[$col[0]]] = $rate; }
            }
            break;
        }
        if (!$values) { return null; }
        krsort($values); $date = key($values);
        return array('version'=>1, 'rate'=>$values[$date], 'observationDate'=>$date, 'source'=>self::PRIME_SOURCE, 'checkedAt'=>gmdate('Y-m-d\TH:i:s\Z', $now));
    }
    public static function mnd($html, $now = null) {
        $now = $now ?? time();
        preg_match_all('/<table\b[^>]*>([\s\S]*?)<\/table>/i', $html, $tables, PREG_SET_ORDER);
        $products = array('30-year-fixed'=>'fixed30', '15-year-fixed'=>'fixed15', '30-year-fha'=>'fha30', '30-year-va'=>'va30');
        foreach ($tables as $table) {
            $active = false; $date = null; $rates = array();
            preg_match_all('/<tr\b[^>]*>([\s\S]*?)<\/tr>/i', $table[1], $rows, PREG_SET_ORDER);
            foreach ($rows as $row) {
                $html_row = $row[1];
                if (preg_match('/href=["\']\/mortgage-rates\/(mnd|freddie-mac|mba)["\']/i', $html_row, $section)) {
                    $active = strtolower($section[1]) === 'mnd'; $date = null;
                    if ($active && preg_match('/(?:as of\s+)?(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i', self::clean($html_row), $parts)) {
                        $year = strlen($parts[3]) === 2 ? 2000 + (int)$parts[3] : (int)$parts[3];
                        $date = sprintf('%04d-%02d-%02d', $year, $parts[1], $parts[2]);
                    }
                    continue;
                }
                if (!$active || !$date) { continue; }
                if (preg_match('/href=["\']\/mortgage-rates\/(30-year-fixed|15-year-fixed|30-year-fha|30-year-va)["\']/', $html_row, $product) && preg_match('/<td\b[^>]*class=["\']rate["\'][^>]*>\s*(\d+(?:\.\d+)?)%\s*<\/td>/i', $html_row, $value)) {
                    $rate = (float)$value[1];
                    if ($rate > 0 && $rate <= 30 && self::date_valid($date, $now)) { $rates[$products[$product[1]]] = array('rate'=>$rate, 'observationDate'=>$date); }
                }
            }
            if (count($rates) === 4) { return array('version'=>1, 'rates'=>$rates, 'source'=>self::MND_SOURCE, 'checkedAt'=>gmdate('Y-m-d\TH:i:s\Z', $now)); }
        }
        return null;
    }
}
