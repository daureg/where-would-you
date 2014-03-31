#! /usr/bin/python2
# vim: set fileencoding=utf-8
"""The list of questions to ask."""
from collections import namedtuple, OrderedDict
Question = namedtuple('Question', 'id_ cat skip label'.split())
QUESTIONS = OrderedDict([
    # real pizza: 4d4b7105d754a06374d81259
    ('pizza', Question(0, '4d4b7105d754a06374d81259', 'my body is a temple',
                       'eat a quick pizza')),
    ('romance', Question(1, '4d4b7105d754a06374d81259', 'we eat at home',
                         'bring your date to a romantic restaurant')),
])
