#! /usr/bin/python2
# vim: set fileencoding=utf-8
"""A list of cities with bounding box and name"""
from string import ascii_lowercase as alphabet
from collections import namedtuple
City = namedtuple('City', 'short long'.split())


def short_name(long_name):
    """Return normalized name of city"""
    return ''.join([c.lower() for c in long_name if c.lower() in alphabet])


def bbox_to_polygon(bbox):
    """Return a 4 points polygon based on the bottom left and upper
    right coordinates of bbox [lat_bl, long_bl, lat_ur, long_ur]"""
    assert(len(bbox) == 4)
    lat_bl, long_bl, lat_ur, long_ur = bbox
    return [[lat_bl, long_bl], [lat_bl, long_ur],
            [lat_ur, long_ur], [lat_ur, long_bl]]


def bbox_to_geojson(bbox, latitude_first=True):
    """Return a 5 points GeoJSON polygon based on the bottom left and upper
    right coordinates of bbox [lat_bl, long_bl, lat_ur, long_ur]
    (5 because the polygon needs to be closed, see:
    https://groups.google.com/d/msg/mongodb-user/OPouYFHS_zU/cS21L0XAMkkJ )
    Or in other words ;(
    http://toblerity.org/shapely/manual.html#shapely.geometry.box
    >>> bbox_to_polygon([37, -122, 35, -120])
    {'type': 'Polygon', 'coordinates': [[[-122, 37], [-120, 37], [-120, 35], [-122, 35], [-122, 37]]]}
    """
    assert(len(bbox) == 4)
    lat_bl, long_bl, lat_ur, long_ur = bbox
    r = {'type': 'Polygon'}
    r['coordinates'] = [[[long_bl, lat_bl], [long_ur, lat_bl],
                         [long_ur, lat_ur], [long_bl, lat_ur],
                         [long_bl, lat_bl]]]
    return r


def inside_bbox(bbox):
    return {'$geoWithin': {'$geometry': bbox_to_geojson(bbox)}}


NYC = [40.583, -74.040, 40.883, -73.767]
WAS = [38.8515, -77.121, 38.9848, -76.902]
SAF = [37.7123, -122.531, 37.84, -122.35]
ATL = [33.657, -84.529, 33.859, -84.322]
IND = [39.632, -86.326, 39.958, -85.952]
LAN = [33.924, -118.632, 34.313, -118.172]
SEA = [47.499, -122.437, 47.735, -122.239]
HOU = [29.577, -95.686, 29.897, -95.187]
SLO = [38.535, -90.320, 38.740, -90.180]
CHI = [41.645, -87.844, 42.020, -87.520]
LON = [51.475, -0.245, 51.597, 0.034]
PAR = [48.8186, 2.255, 48.9024, 2.414]
BER = [52.389, 13.096, 52.651, 13.743]
ROM = [41.8000, 12.375, 41.9848, 12.610]
PRA = [49.9777, 14.245, 50.1703, 14.660]
MOS = [55.584, 37.353, 55.906, 37.848]
AMS = [52.3337, 4.730, 52.4175, 4.986]
HEL = [60.1463, 24.839, 60.2420, 25.0200]
STO = [59.3003, 17.996, 59.3614, 18.162]
BAR = [41.3253, 2.1004, 41.4669, 2.240]
US = [NYC, WAS, ATL, CHI, IND, HOU, SLO, SAF, LAN, SEA]
EU = [MOS, HEL, STO, LON, PAR, BER, PRA, AMS, ROM, BAR]
NAMES = ['Moscow', 'Helsinki', 'Stockholm', 'London', 'Paris', 'Berlin',
         'Prague', 'Amsterdam', 'Rome', 'Barcelona',
         'New York', 'Washington', 'Atlanta', 'Chicago', 'Indianapolis',
         'Houston', 'St. Louis', 'San Francisco', 'Los Angeles', 'Seattle']
CITIES = EU + US
BCITIES = [City(short_name(city), city) for city in NAMES]
SHORT_KEY = [short_name(city) for city in NAMES]
FULLNAMES = dict(zip(SHORT_KEY, NAMES))
BBOXES = dict(zip(SHORT_KEY, [bbox_to_polygon(b) for b in CITIES]))
GBOXES = dict(zip(SHORT_KEY, [inside_bbox(b) for b in CITIES]))
