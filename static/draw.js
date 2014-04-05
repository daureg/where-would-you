var MINI = require('minified');
var $ = MINI.$;
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
    var res = '<div id="venues"><p>Are you thinking of any of these places:<ul>';
    for (var i = venues.length - 1; i >= 0; i--) {
        var vid = venues[i].url.substr(25);
        res += '<li>';
        res += '<input name="'+vid+'" type="checkbox">&nbsp;';
        res += '<a href="'+venues[i].url+'">'+venues[i].name+'</a>';
        res += '</li>';
    }
    res += '</ul><button class="pure-button pure_button_disabled" id="y_'+zone_id+'">Yes</button>&nbsp;';
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
    console.log(bbounds);
    L.polygon(bbox, {fill: false, weight: 3}).addTo(map);
    $('#loading').hide();
    $('.spinner').hide();
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
            shapeOptions: { color: '#2ecc40' },
            allowIntersection: false,
            showArea: false,
        },
        circle: {
            shapeOptions: { color: '#2ecc40' },
            showRadius: false,
        }
    },
    edit: false
});

map.addControl(drawControl);

map.on('draw:created', function (e) {
    var type = e.layerType,
        zone = e.layer,
        id_ = ANSWER.length,
        geo = zone.toGeoJSON().geometry;
    if (id_ > 2 || !bbounds.contains(zone.getBounds())) {
        return;
    }
    var radius = 0;
    console.log(zone);
    if (type === 'circle') {
        radius = zone._mRadius;
        center = zone._latlng;
    }
    else {
        type = 'polygon';
        center = barycenter(zone._latlngs);
    }
    ANSWER.push({id_: id_, type: type, geo: geo, radius: radius, venues: []});
    var query = {geo: JSON.stringify(geo), radius: radius};
    $.request('post', $SCRIPT_ROOT + '/venues', query)
    .then(function(data) {
        var res = $.parseJSON(data);
        console.log(res.r);
        if (res.r.length > 0) {
            var popup = L.popup({closeButton: false, closeOnClick: false, keepInView: true})
            .setLatLng(center)
            .setContent(format_venues(res.r, id_))
            .openOn(map);
            focus_on_popup();
            var yes_b = $('#y_'+id_);
            var venues_checked = 0;
            $('#venues li input').on('|click', function(e) {
                new_venue = this.get('checked');
                if (new_venue && venues_checked === 0) {yes_b.set('-pure_button_disabled');}
                if (!new_venue && venues_checked === 1) {yes_b.set('+pure_button_disabled');}
                venues_checked += new_venue ? 1 : -1;
            });
            $('#n_'+id_).on('click', function(e) {
                e.preventDefault();
                close_popup(popup);
                return false;
            });
            yes_b.on('click', function(e) {
                e.preventDefault();
                if (this.is('.pure_button_disabled')) {return;}
                var choices = $('#venues li input');
                for (var i = 0; i < choices.length; i++) {
                    if (choices[i].checked) {
                        ANSWER[id_].venues.push(choices[i].name);
                    }
                }
                console.log(ANSWER[id_]);
                close_popup(popup);
                return false;
            });
        }
        else {
            $('#done-ctn').show();
            if (ANSWER.length === 3)  { done_answering(); }
        }
    })
    .error(function(status, statusText, responseText) {
        console.log(status, statusText, responseText);
    });
    drawnItems.addLayer(zone);
});


function done_answering() {
    map.removeControl(drawControl);
    map.dragging.disable();
    $('#time').show();
    $('#done-ctn').hide();
    $('#skip').hide();
    carto_layer.setOpacity(0.5);
}
function collect_time_answer() {
    var fields = $('#time input');
    var timing = {hour: null};
    for (var i = 0; i < fields.length; i++) {
        if (fields[i].type == 'range' && HOUR_WAS_CHANGED) {
            timing.hour = parseInt(fields[i].value);
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

var show_hour = document.getElementById('hour-value');
$('#done').on('click', function(e) {
    console.log('click');
    done_answering();
    e.preventDefault();
});
$('#hour').on('change', function(e) {
    HOUR_WAS_CHANGED = true;
    show_hour.innerHTML = '&nbsp;'+getTarget(e).value;
});
/* Disable all interactions but the current popup */
function focus_on_popup() {
    map.removeControl(drawControl);
    map.dragging.disable();
    $('#done-ctn').hide();
    $('#skip').hide();
}
/* Enable back some interactions */
function close_popup(p) {
    map.closePopup(p);
    map.addControl(drawControl);
    map.dragging.enable();
    $('#done-ctn').show();
    if (ANSWER.length === 3)  { done_answering(); }
}
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
