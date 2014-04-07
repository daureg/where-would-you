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


def get_nested(dico, fields, default=None):
    """If the key hierarchy of `fields` exists in `dico`, return its value,
    otherwise `default`.
    >>> get_nested({'loc': {'type': 'city'}}, ['loc', 'type'])
    'city'
    >>> get_nested({'type': 'city'}, 'type')
    'city'
    >>> get_nested({'loc': {'type': 'city'}}, ['loc', 'lat']) is None
    True
    >>> get_nested({'loc': {'type': None}}, ['loc', 'type']) is None
    True
    >>> get_nested({'l': {'t': {'a': 'h'}}}, ['l', 't', 'a'])
    'h'
    >>> get_nested({'l': {'t': None}}, ['l', 't', 'a'], 0)
    0
    >>> get_nested({'names': {'symbols': 'euro'}}, ['names', 'urls'], [])
    []
    """
    if not hasattr(fields, '__iter__'):
        return dico.get(fields, default)
    current = dico
    is_last_field = lambda i: i == len(fields) - 1
    for index, field in enumerate(fields):
        if not hasattr(current, 'get'):
            return default if is_last_field(index) else current
        current = current.get(field, default if is_last_field(index) else {})
    return current
