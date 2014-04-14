var NB_QUERIES = 0;
var MAX_QUERIES = Math.floor(5000/(45*7));
var TIMER = window.performance || Date;
var LAST_REQUEST_SENT = TIMER.now();
var NO_MORE_LOCAL_SUGGESTION = false;
var CANCEL_REQUEST = false;
var VENUES_NAME = [];
var best = new PriorityQueue(function compare(a, b) { return b.score - a.score; });
var CLICKED_ID = null;
var REQ_PARAMS = {swlon: bbox[0][1], swlat: bbox[0][0], nelon: bbox[2][1], nelat: bbox[2][0]};
var CURL = _.formatHtml('https://api.foursquare.com/v2/venues/suggestcompletion?intent=browse&limit=20&client_id=YWARTPRVKJKRPMQ1SJKRKJMVUMC0LOBQAMBQHYAEQRUAWSJH&client_secret=CZURKRQPJ1K2TX2KBFW20UZ13NALQMYZXMCYON0G0UZ113QO&v=20140411&sw={{swlat}},{{swlon}}&ne={{nelat}},{{nelon}}&query=', REQ_PARAMS);
function vcenter(lat, lon, vid, name) {
    remove_markers();
    var center = L.latLng(lat, lon);
    var marker = L.marker(center, {title: name, clickable: false, keyboard: false});
    MARKERS.push(marker);
    marker.addTo(map);
	map.setView(center, 17, ANIM_OPTIONS);
	$('#suggestions').fill('');
	document.getElementById('search-venue').value = '';
	CLICKED_ID = vid;
	CANCEL_REQUEST = true;
	return false;
}
var GOOGLE_LINK = HTML('<li><a target="_blank" href="https://maps.google.com/maps?ll={{lat}},{{lng}}&z=12">Try with Google Map</a></li>', center);
var LINE = '<li class="gradient" title="Show its position on the map" onclick="vcenter({{lat}},{{lon}},\'{{id}}\',\'{{name}}\');">{{name}}<span class="address">&nbsp;{{where}}</span></li><hr>';
$(function() {
    L.Icon.Default.imagePath = '/static/images';
    var input = $('#search-venue');
    var res = $('#suggestions');
    input.onChange(function suggest(text) {
        if (VENUES_NAME.length === 0) {
            if (VENUES === undefined) {return;}
            VENUES_NAME = Object.keys(VENUES);
        }
        console.log('call remote: '+TIMER.now());
        CANCEL_REQUEST = false;
        remote_suggestions(text, res);
        var props = local_suggestion(best, text),
            show = '';
        NO_MORE_LOCAL_SUGGESTION = props.length === 0;
        for (var i = props.length-1; i >= 0; i--) {
            show += _.formatHtml(LINE, props[i]);
        }
        if (show !== '') {
            console.log('fill with local: '+TIMER.now());
            res.fill(HTML(show));
        }
        else {
            res.fill(GOOGLE_LINK);
        }
    });
});

/* If query size is valid and queries number is OK, GET foursquare.com
 * suggestions. When results are received, if no later request have been made,
 * add them to the local ones (if there are some), otherwise fill suggestions
 * completly with remote ones).
 */
function remote_suggestions(query, list_of_suggestions) {
    if (query.length <= 3 || query.length > 8 || NB_QUERIES > MAX_QUERIES) {
        console.log(query+' is too short');
        return;
    }
    var req_url = encodeURI(CURL+query);
    // req_url = '/static/star.json';
    var sent = TIMER.now();
    NB_QUERIES += 1;
    if (Math.abs(LAST_REQUEST_SENT - sent) < 70) {return;}
    LAST_REQUEST_SENT = sent;
    $.request('get', req_url)
    .then(function(txt) {
        // setTimeout(function success() {
        // Only display suggestions from the latest sent request
        if (LAST_REQUEST_SENT > sent || CANCEL_REQUEST) {
            console.log(sent+' is too old');
            return;}
        var venues = parse_venues($.parseJSON(txt));
        // venues = [];
        console.log('fill with remote: '+TIMER.now());
        var show = '';
        console.log('remote get '+venues.length);
        for (var i = 0; i < Math.min(5, venues.length); i++) {
            show += _.formatHtml(LINE, venues[i]);
        }
        if (show !== '') {
        if (NO_MORE_LOCAL_SUGGESTION) {
            list_of_suggestions.fill(HTML(show));
        }
        else {
            list_of_suggestions.add(HTML(show));
        }
        }
        // }, 230);
    });
}
/* Return an array of venues matching `query` with a better score than
 * `threshold` within local list.
 */
function local_suggestion(best, query, threshold) {
    var score = 0.0,
        LEN = 5,
        res = [],
        info = [],
        venue = {},
        _threshold = threshold || 0.85;
    if (query.length === 0) {return res;}
    for (var i = 0; i < VENUES_NAME.length; i++) {
        score = LiquidMetal.score(VENUES_NAME[i], query);
        score += 0.03*Math.log(VENUES[VENUES_NAME[i]][0]);
        if (best.size() < LEN || score > best.peek().score) {
            if (best.size() === LEN) { best.deq(); }
            best.enq({name: VENUES_NAME[i], score: score});
        }
    }
    while (best.size() > 0) {
        venue = best.deq();
        if (venue.score < _threshold) { continue; }
        info = VENUES[venue.name];
        venue.where = info[1];
        venue.lat = info[2];
        venue.lon = info[3];
        venue.id = info[4];
        delete venue.score;
        res.push(venue);
    }
    return res;
}
/* Return an array of relevant venues (or null) from 4SQ answers */
function parse_venues(res) {
    if (!res) {return null;}
    if (res.meta.code !== 200) {return null;}
    var has_answers = res.hasOwnProperty('response') && res.response.hasOwnProperty('minivenues');
    if (!has_answers) {return null;}
    var venues = res.response.minivenues;
    var relevant = [];
    for (var i = 0; i < venues.length; i++) {
        var parsed = parse_one_venue(venues[i]);
        if (parsed !== false) {relevant.push(parsed);}
    }
    return relevant;
}
/* Return info about `venue`, or false if it's not in the city, or not of the
 * good categorie.
 */
function parse_one_venue(venue) {
    var subset = {};
    subset.id = venue.id;
    subset.name = venue.name;
    subset.where = venue.location.address;
    subset.lat = venue.location.lat;
    subset.lon = venue.location.lng;
    // console.log(subset.id, subset.name, subset.lat, subset.lon);
    if (subset.lat < REQ_PARAMS.swlat ||
        subset.lat > REQ_PARAMS.nelat ||
        subset.lon < REQ_PARAMS.swlon ||
        subset.lon > REQ_PARAMS.nelon) {return false;}
    if (venue.location.crossStreet !== "") {
        subset.where += ' ('+venue.location.crossStreet+')';
    }
    for (var i = 0; i < venue.categories.length; i++) {
        if (CATS.indexOf(venue.categories[i].id) >= 0) {
            return subset;
        }
    }
    return false;
}
