#! /usr/bin/python2
# vim: set fileencoding=utf-8
from geographiclib.geodesic import Geodesic
EARTH = Geodesic.WGS84


def geodesic_distance(point_1, point_2):
    """Return the distance in meters between two JSON Points."""
    assert 'coordinates' in point_1 and 'coordinates' in point_2
    p1_lon, p1_lat = point_1['coordinates']
    p2_lon, p2_lat = point_2['coordinates']
    return EARTH.Inverse(p1_lat, p1_lon, p2_lat, p2_lon)['s12']
