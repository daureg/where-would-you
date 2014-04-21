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
                       'hangout with your friends')),
    ('sport', Question(['Outdoors & Recreation'],
                       "I already have the body of a Greek statue",
                       'go to run in nature')),
    ('culture', Question(['Art Gallery', 'Comedy Club', 'Concert Hall',
                          'Country Dance Club', 'Historic Site', 'Museum',
                          'Movie Theater', 'Music Venue', 'Outdoor Sculpture',
                          'Performing Arts Venue', 'Public Art', 'Street Art'],
                         "I simply watch TV",
                         'enjoy some cultural attractions')),
])


def questions_to_latex():
    """Display question names and categories as latex array"""
    res = []
    for name, question in QUESTIONS.iteritems():
        cat = ', '.join(question.cat).replace('&', '\\&')
        text = 'Where would you {}?'.format(question.label)
        name = '\\texttt{{{}}}'.format(name)
        res.append(' & '.join([name, text, cat]))
    print(' \\\\\n'.join(res))


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
        loc = [round(_, 6) for _ in reversed(venue['loc']['coordinates'])]
        id_ = [str(venue['_id'])]
        res[venue['name']] = [venue['likes'], venue.get('where')] + loc + id_
    import ujson
    import codecs
    import gzip
    writer = codecs.getwriter('utf8')
    filename = 'static/q/{}_{}.js.gz'.format(city, question)
    k = Key(bucket)
    k.key = filename
    k.set_metadata('Content-Encoding', 'gzip')
    with gzip.open(filename, 'wb') as result:
        writer(result).write('var CATS='+ujson.dumps(cats)+';\n')
        writer(result).write('var VENUES='+ujson.dumps(res)+';')
    with open(filename) as result:
        k.set_contents_from_file(result)
        print('sent ' + filename)
    k.make_public()

if __name__ == '__main__':
    import sys
    questions_to_latex()
    sys.exit()
    import os
    import pymongo
    city = sys.argv[1]
    db = pymongo.MongoClient().foursquare.venue
    import boto
    from boto.s3.key import Key
    S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', None),
    conn = boto.connect_s3()
    bucket = conn.get_bucket(S3_BUCKET_NAME)
    import cities
    for city in cities.SHORT_KEY:
        for question in QUESTIONS.iterkeys():
            venues_list(db, question, city)
