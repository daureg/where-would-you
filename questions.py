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
    ('coffee', Question(['Tea Room', 'Bistro', 'Café', 'Cafeteria'],
                        "I'm too busy to be cozy",
                        'drink a cozy coffee')),
    ('clothes', Question(['Clothing Store', 'Department Store', 'Fabric Shop',
                          'Flea Market', 'Mall'],
                         "my clothes are not ragged yet",
                         'buy new fancy clothes')),
    ('party', Question(['Nightlife'],
                       "my friends are too boring for that",
                       'celebrate with your friends')),
    ('sport', Question(['Outdoors & Recreation'],
                       "as said, I already have the body of a Greek statue",
                       'running in nature')),
    ('culture', Question(['Arts & Entertainment'],
                         "I simply watch TV",
                         'enjoy some cultural attraction')),
])
