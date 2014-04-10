#! /usr/bin/python2
# vim: set fileencoding=utf-8
"""The list of questions to ask."""
from collections import namedtuple, OrderedDict
Question = namedtuple('Question', 'cat skip label'.split())
QUESTIONS = OrderedDict([
    ('fastfood', Question(['Food'], 'my body is a temple',
                          'eat some fast food')),
    ('romance', Question(['Food'], 'we eat at home',
                         'bring your date to a romantic restaurant')),
    ('coffee', Question(['Tea Room', 'Bistro', u'Café', 'Coffee Shop',
                         'Cafeteria'], "I'm too busy to be cozy",
                        'drink a cozy coffee')),
    ('clothes', Question(['Clothing Store', 'Department Store', 'Fabric Shop',
                          'Flea Market', 'Mall'],
                         "my clothes are not ragged yet",
                         'buy new fancy clothes')),
    ('party', Question(['Nightlife Spot'],
                       "my friends are too boring for that",
                       'celebrate with your friends')),
    ('sport', Question(['Outdoors & Recreation'],
                       "as said, I already have the body of a Greek statue",
                       'run in the nature')),
    ('culture', Question(['Art Gallery', 'Comedy Club', 'Concert Hall',
                          'Country Dance Club', 'Historic Site', 'Museum',
                          'Movie Theater', 'Music Venue', 'Outdoor Sculpture',
                          'Performing Arts Venue', 'Public Art', 'Street Art'],
                         "I simply watch TV",
                         'enjoy some cultural attractions')),
])


def venues_list(db, question, city):
    """Export list of venue for a given (city, question) to a JSON file."""
    import FSCategories as fsc
    import cities as c
    space = c.GBOXES[city]
    cats = []
    for cat in QUESTIONS[question].cat:
        cats.extend(fsc.get_subcategories(cat, fsc.Field.id))
    venues = db.find({'loc': space, 'cat': {'$in': cats}},
                     {'name': 1, 'loc': 1, 'likes': 1, 'where': 1})
    res = {}
    for venue in venues:
        coords = [round(_, 6) for _ in reversed(venue['loc']['coordinates'])]
        res[venue['name']] = [venue['likes'], venue.get('where')] + coords
    import ujson
    import codecs
    with codecs.open('{}_{}.js'.format(city, question), 'w') as result:
        result.write('PVENUES='+ujson.dumps(res, result)+';')

if __name__ == '__main__':
    import sys
    import pymongo
    city = sys.argv[1]
    db = pymongo.MongoClient().foursquare.venue
    venues_list(db, QUESTIONS.keys()[0], city)
