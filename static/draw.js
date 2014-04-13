var MARKERS = [];
var ZONES_VIEW = [{nb_res: -1, view: undefined, seen: false},{nb_res: -1, view: undefined, seen: false},{nb_res: -1, view: undefined, seen: false},];
var PREVIOUS_VIEW = null;
var ORIGINAL_ZOOM = 18;
var VIEW_IS_FOCUSED = false;
/* Return bounds of the next zone, or the general view before any focus */
function next_view() {
    var zone;
    for (var i = 0; i < ZONES_VIEW.length; i++) {
        zone = ZONES_VIEW[i];
        if (zone.view !== undefined && zone.nb_res > 0 && !zone.seen) {
            ZONES_VIEW[i].seen = true;
            return zone.view;
        }
    }
    return PREVIOUS_VIEW;
}
var INVALID_POPUP = [];
var VENUES_PER_PAGE = 6;
/***  little hack starts here ***/
// http://jsfiddle.net/yVLJf/52/
L.Map = L.Map.extend({
    openPopup: function(popup) {
        //        this.closePopup();  // just comment this
        this._popup = popup;
        return this.addLayer(popup).fire('popupopen', { popup: this._popup });
    }
});
/***  end of hack ***/
var MINI = require('minified');
var _=MINI._, $=MINI.$, HTML=MINI.HTML;
$('#question').show();

/* return the LatLng in the middle of an array of LatLng */
function barycenter(points) {
    var lat = 0, lng = 0, n = points.length;
    for (var i = n - 1; i >= 0; i--) {
        lat += points[i].lat;
        lng += points[i].lng;
    }
    return new L.LatLng(lat/n, lng/n);
}

/* take a array of {name: "", url: ""} an return a list of link */
function format_venues(venues, zone_id) {
    var yes_class = "pure-button pure_button_disabled";
    var res = '<div id="venues_'+zone_id+'"><p>Are you thinking of any of these places?';
    for (var i = 0; i < venues.length; i++) {
        if (i % VENUES_PER_PAGE === 0) {
            res += '<ul id="page_'+zone_id+'_'+Math.floor(i/ VENUES_PER_PAGE)+'"';
            res += 'class="venues">';
        }
        var vid = venues[i].url.substr(25);
        res += '<li>';
        res += '<input name="'+vid+'" type="checkbox"';
        if (vid === CLICKED_ID) {res += ' checked="checked"'; yes_class="pure-button";}
        res += '>&nbsp;';
        res += '<a target="_blank" href="'+venues[i].url+'">'+venues[i].name+'</a>';
        res += '<span class="address">,&nbsp;'+venues[i].where+'</span>';
        res += '</li>';
        if (i % VENUES_PER_PAGE === (VENUES_PER_PAGE-1) || i === venues.length-1) { res += '</ul>'; }
    }
    res += '<nav id="move_'+zone_id+'"><span class="prev" id="p_'+zone_id+'">Prev</span>';
    res += '<span id="dpage_'+zone_id+'"></span>';
    res += '<span class="next" id="nx_'+zone_id+'">Next</span></nav>';
    res += '<button class="'+yes_class+'" id="y_'+zone_id+'">Yes</button>&nbsp;';
    res += '<button class="pure-button" id="n_'+zone_id+'">No</button></p></div>';
    return res;
}

/* Return the LatLngBounds enclosing `bbox` */
function compute_bound(bbox) {
    var offset = 0.01;
    var southWest = new L.LatLng(bbox[0][0] - offset, bbox[0][1] - offset);
    var northEast = new L.LatLng(bbox[2][0] + offset, bbox[2][1] + offset);
    return new L.LatLngBounds(southWest, northEast);
}

function create_map(div_id, center, main_layer, bbox) {
    var map = new L.Map(div_id, {zoom: 14, minZoom: 10, center: center,
                                 layers: [main_layer], maxBounds: bbounds})
        .fitBounds(bbounds);
    L.polygon(bbox, {fill: false, weight: 3}).addTo(map);
    $('#loading').hide();
    $('.spinner').hide();
    $('#suggest').show();
    return map;
}
var bbox = $BBOX;
var bbounds = compute_bound(bbox);
var OpenStreetMap_Mapnik = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'});
var carto_layer = OpenStreetMap_Mapnik;
var center = new L.LatLng(0.5*(bbox[0][0]+bbox[2][0]),
                          0.5*(bbox[0][1]+bbox[2][1]));
var map = null;
// setTimeout(function() {
map = create_map('map', center, carto_layer, bbox);
PREVIOUS_VIEW = map.getBounds();
ORIGINAL_ZOOM = map.getZoom();

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// call layer and feature area (or zone?)
L.drawLocal.draw.handlers.polyline.error = "Please, use only simple shape!";
L.drawLocal.edit.toolbar.buttons.edit = "Modify areas.";
L.drawLocal.edit.toolbar.buttons.editDisabled = "No area to modify yet.";
L.drawLocal.edit.handlers.edit.tooltip.text = "Drag handles to modify area.";

var drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
        polyline: false,
        marker: false,
        polygon: {
            shapeOptions: { color: '#b22222' },
            allowIntersection: false,
            showArea: false,
        },
        rectangle: {
            shapeOptions: { color: '#1e90ff' },
            showArea: false,
        },
        circle: {
            shapeOptions: { color: '#2ecc40' },
            showRadius: false,
        }
    },
    edit: {
        featureGroup: drawnItems,
        edit: {
            selectedPathOptions: {color: '#111' }
        },
        remove: false
    }
});

map.addControl(drawControl);

map.on('draw:created', function (e) {remove_invalid_popup(); add_or_edit(e, 'create', 1); has_given_all_answers();});
map.on('draw:edited', function (e) {
    remove_invalid_popup();
    var nb_zones = Object.keys(e.layers._layers).length;
    e.layers.eachLayer(function(layer) { add_or_edit(layer, 'edit', nb_zones); });
    has_given_all_answers();
});

/* Find id in ANSWER from leaflet id */
function get_answer_id(lid) {
    for (var i = 0; i < ANSWER.length; i++) {
        if (ANSWER[i] !== undefined && ANSWER[i].lid === lid) { return ANSWER[i].id_; }
    }
    return null;
}
/* Display a message at center to explain an area was not added */
function invalid_msg(center, what, id_) {
    var msg = "“I'm sorry, I'm afraid I can't do this.”<br>";
    var explain = "";
    if (what === 'many') {
        explain = 'You have already given enough answers, click the done button.';
    }
    else {
        explain = 'Choose a location inside the blue box or skip the question altogether';
        explain += ' if our conception of ' + LONG_CITY +' is too short-sighted.';
    }
    var p = document.createElement('p');
    p.innerHTML = msg + explain;
    p.id = 'invalid_'+id_;
    var popup = L.popup().setLatLng(center).setContent(msg + explain);
    INVALID_POPUP.push(popup);
    map.openPopup(popup);
}
function remove_invalid_popup() {
    var p = null;
    if (map.getBoundsZoom(map.getBounds()) >= ORIGINAL_ZOOM) {
        PREVIOUS_VIEW = map.getBounds();
    }
    VIEW_IS_FOCUSED = false;
    for (var i=0; i<2; i++) {ZONES_VIEW[i] = {nb_res: -1, view: undefined, seen: false};}
    do {
        p = INVALID_POPUP.pop();
        if (p !== undefined) {map.closePopup(p);}
    } while (p !== undefined);

}
function change_page(current, dir, total, zone_id) {
    $('#page_'+zone_id+'_'+current).hide();
    current = (current + dir) % total;
    if (current < 0) { current += total; }
    $('#page_'+zone_id+'_'+current).show();
    if (total >= 2) {
        $('#dpage_'+zone_id).fill((current+1)+'/'+total);
    }
    return current;
}
function add_or_edit(e, what, nb_zones) {
    /* get info about area */
    var type = null, zone = null, lid = null, radius = null, center = null,
        id_ = null, geo = null;
    if (what === 'create') {
        type = e.layerType;
        zone = e.layer;
    }
    else {
        zone = e;
    }
    id_ = ANSWER.indexOf(undefined);
    geo = zone.toGeoJSON().geometry;
    if (what === 'edit') {
        lid = zone._leaflet_id;
        id_ = get_answer_id(lid);
        type = ANSWER[id_].type;
    }
    /* get more info (need center to display invalid tooltip) */
    radius = 0;
    if (type === 'circle') {
        radius = zone._mRadius;
        center = zone._latlng;
    }
    else {
        type = 'polygon';
        center = barycenter(zone._latlngs);
    }
    /* discard invalid area */
    if (what === 'create') {
        if (id_ > 2) {invalid_msg(center, 'many', id_); return;}
        if (!bbounds.contains(zone.getBounds())) {invalid_msg(center, 'outside', id_); return; }
    }
    else {
        if (!bbounds.contains(zone.getBounds())) {
            delete ANSWER[id_];
            drawnItems.removeLayer(zone);
            invalid_msg(center, 'outside', id_);
            return;
        }
    }
    /* register geographic part of answer */
    if (what === 'create') {
        ANSWER[id_] = {id_: id_, type: type, geo: geo, radius: radius, venues: []};
    }
    else {
        ANSWER[id_].geo = geo;
        ANSWER[id_].radius = radius;
        ANSWER[id_].venues = [];
    }
    /* prepare interaction */
    map.dragging.disable();
    ZONES_VIEW[id_].view = zone.getBounds();
    var pos = map.latLngToContainerPoint(center);
    var wait = $('#spinner_'+id_);
    wait.fill(HTML('<div class="spinner"><div class="dot1"></div><div class="dot2"></div></div>'));
    wait.set({'$top': (pos.y - 20)+'px', '$left': (pos.x - 20)+'px'});
    /* request venues info */
    var query = {geo: JSON.stringify(geo), radius: radius};
    $.request('post', $SCRIPT_ROOT + '/venues', query)
    .then(function(data) {
        wait.fill(HTML(''));
        var res = $.parseJSON(data);
        ZONES_VIEW[id_].nb_res = res.r.length;
        if (res.r.length > 0) {
            var nb_venues = res.r.length;
            console.log('get '+nb_venues+' venues.');
            var nb_pages = Math.ceil(nb_venues / VENUES_PER_PAGE);
            var popup = L.popup({closeButton: false, closeOnClick: false, keepInView: false,
                                 minWidth: 300, maxWidth: 400})
            .setLatLng(center)
            .setContent(format_venues(res.r, id_))
            .addTo(map);
            var old_view = PREVIOUS_VIEW;
            if (map.getBoundsZoom(map.getBounds()) >= ORIGINAL_ZOOM) {
                old_view = map.getBounds();
            }
            if (nb_zones === 1) {map.fitBounds(zone.getBounds());}
            else {
                old_view = null;
                console.log('more than 1 edit');
                if (!VIEW_IS_FOCUSED) {
                    console.log('no focus so focus on me');
                    map.fitBounds(ZONES_VIEW[id_].view);
                    ZONES_VIEW[id_].seen = true;
                    VIEW_IS_FOCUSED = true;
                }
            }
            var current_page = 0;
            if (nb_pages <= 1) {
                $('#move_'+id_).hide();
            }
            else {
                $('#dpage_'+id_).fill('1/'+nb_pages);
            }
            $('#page_'+id_+'_'+current_page).show();
            $("span#nx_"+id_).on('click', function(){ current_page = change_page(current_page, 1, nb_pages, id_);});
            $("span#p_"+id_).on('click', function(){ current_page = change_page(current_page, -1, nb_pages, id_);});
            focus_on_popup();
            var yes_b = $('#y_'+id_);
            var venues_checked = 0;
            $('#venues_'+id_+' ul li input').on('|click', function(e) {
                new_venue = this.get('checked');
                if (new_venue && venues_checked === 0) {yes_b.set('-pure_button_disabled');}
                if (!new_venue && venues_checked === 1) {yes_b.set('+pure_button_disabled');}
                venues_checked += new_venue ? 1 : -1;
            });
            $('#n_'+id_).on('click', function(e) {
                close_popup(popup, old_view);
            });
            yes_b.on('click', function(e) {
                if (this.is('.pure_button_disabled')) {return;}
                var choices = $('#venues_'+id_+' ul li input');
                for (var i = 0; i < choices.length; i++) {
                    if (choices[i].checked) {
                        ANSWER[id_].venues.push(choices[i].name);
                    }
                }
                console.log(ANSWER[id_]);
                close_popup(popup, old_view);
            });
        }
        else { // no popup
            $('#done-ctn').show();
            has_given_all_answers();
        }
    })
    .error(function(status, statusText, responseText) {
        wait.fill(HTML(''));
        map.dragging.enable();
        console.log(status, statusText, responseText);
    });
    drawnItems.addLayer(zone);
    lid = zone._leaflet_id;
    ANSWER[id_].lid = lid;
    remove_markers();
}

/* remove venue markers */
function remove_markers() {
    var p = MARKERS.pop();
    while (p) {
        map.removeLayer(p);
        p = MARKERS.pop();
    }
}
function has_given_all_answers() {
    var r = 0;
    for (var i = 0; i < ANSWER.length; i++) {
        if (ANSWER[i] !== undefined) { r++; }
    }
    if (r === 3) { $('.leaflet-draw-section')[0].style.display = "none"; }
    else {
        $('.leaflet-draw-section')[0].style.display = "block";
        $('#suggest').show();
    }
    if (r === 0) { $('#done-ctn').hide(); $('#skip').show(); }
    if (r > 0) { $('#skip').hide(); }
    return r === 3;
}
function done_answering() {
    map.removeControl(drawControl);
    map.dragging.disable();
    $('#time').show();
    $('#done-ctn').hide();
    $('#skip').hide();
    $('#suggest').hide();
    carto_layer.setOpacity(0.5);
}
function collect_time_answer() {
    var fields = $('#time input');
    var timing = {start: null, end: null};
    for (var i = 0; i < fields.length; i++) {
        if (fields[i].type == 'range') {
            if (fields[i].name === 'hour-start' && SHOUR_WAS_CHANGED) {
                timing.start = parseInt(fields[i].value);
            }
            if (fields[i].name === 'hour-end' && EHOUR_WAS_CHANGED) {
                timing.end = parseInt(fields[i].value);
            }
        }
        else {
            timing[fields[i].value] = fields[i].checked;
        }
    }
    console.log(timing);
    return timing;
}
function submit_answer(next_question, next_city) {
    var timing = $.toJSON(collect_time_answer());
    var ans = $.toJSON(ANSWER);
    console.log(ans);
    console.log($SCRIPT_ROOT + window.location.pathname);
    $.request('post', $SCRIPT_ROOT + window.location.pathname,
              {nq: next_question, timing: timing, ans: ans})
        .then(function(data) {
            console.log(data);
            window.location = window.location.origin + '/' + next_question + '/' + next_city;
        })
    .error(function(status, statusText, responseText) {
        console.log(status, statusText, responseText);
    });
}

function maybe_enable_time() {
    if (DAY_WAS_CHANGED && SHOUR_WAS_CHANGED && EHOUR_WAS_CHANGED) {
        $('#next').set({$: '-pure_button_disabled', title: ''});
    }
}
var show_hour_start = document.getElementById('hour-start-value');
var show_hour_end = document.getElementById('hour-end-value');
$('#done').on('click', function(e) {
    done_answering();
    e.preventDefault();
});
$('#time form > p:nth-child(1) input').on('change', function(e) {
    DAY_WAS_CHANGED = true;
    maybe_enable_time();
});
$('#hour-start').on('change', function(e) {
    SHOUR_WAS_CHANGED = true;
    show_hour_start.innerHTML = '&nbsp;'+hour_val_length_two(getTarget(e))+':00';
    maybe_enable_time();
});
$('#hour-end').on('change', function(e) {
    EHOUR_WAS_CHANGED = true;
    show_hour_end.innerHTML = '&nbsp;'+hour_val_length_two(getTarget(e))+':00';
    maybe_enable_time();
});
function hour_val_length_two(target) {
    var val = target.value;
    return ((val.length === 1) ? '0' : '') + val;
}
/* Disable all interactions but the current popup */
function focus_on_popup() {
    $('.leaflet-draw-section').hide();
    map.dragging.disable();
    $('#done-ctn').hide();
    $('#skip').hide();
    $('#suggest').hide();
}
/* Enable back some interactions */
function close_popup(p, view) {
    if (p !== null) {map.closePopup(p);}
    if (view === null) {view = next_view();}
    CANCEL_REQUEST = false;
    map.fitBounds(view);
    if ($('.leaflet-popup-content-wrapper').length === 0) {
        $('.leaflet-draw-section').show();
        map.dragging.enable();
        $('#done-ctn').show();
    }
    has_given_all_answers();
}
$('#done-ctn').on('click', done_answering);
function getTarget(obj) {
    var targ;
    var e=obj;
    if (e.target) targ = e.target;
    else if (e.srcElement) targ = e.srcElement;
    if (targ.nodeType == 3) // defeat Safari bug
        targ = targ.parentNode;
    return targ;
}
// }, 20000);
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex) {
        if ( this === undefined || this === null ) { throw new TypeError( '"this" is null or not defined' ); }
        var length = this.length >>> 0; // Hack to convert object.length to a UInt32
        fromIndex = +fromIndex || 0;
        if (Math.abs(fromIndex) === Infinity) { fromIndex = 0; }
        if (fromIndex < 0) {
            fromIndex += length;
            if (fromIndex < 0) { fromIndex = 0; }
        }
        for (;fromIndex < length; fromIndex++) {
            if (this[fromIndex] === searchElement) { return fromIndex; }
        }
        return -1;
    };
}
