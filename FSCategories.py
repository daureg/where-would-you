#! /usr/bin/python2
# vim: set fileencoding=utf-8
"""Maintain a tree of Foursquare categories and provide query methods."""
from collections import namedtuple
import persistent as p
import string
Category = namedtuple('Category', ['id', 'name', 'depth', 'sub'])
import enum
Field = enum.Enum('Field', 'id name')  # pylint: disable=C0103


def parse_categories(top_list, depth=0):
    """Recursively build Categories"""
    if len(top_list) == 0:
        return []
    res = []
    for cat in top_list:
        subs = []
        if isinstance(cat, dict) and 'categories' in cat:
            subs = parse_categories(cat['categories'], depth+1)
        id_, name = str(cat['id']), unicode(cat['name'])
        res.append(Category(id_, name, depth+1, subs))
    return res


def get_categories():
    """Return categories list from disk or from Foursquare website using
    client"""
    raw_cats = p.load_var('raw_categories')['categories']
    cats = Category('1', 'Venue', 0, parse_categories(raw_cats))
    return cats


CATS = globals()['get_categories']()


def search_categories(query, cats=CATS, field=None):
    """Return a category matching query (either by name or id) and its path
    inside cats."""
    if field is None:
        field = choose_type(query)
    if cats[field] == query:
        return cats, [query]
    for sub_category in cats.sub:
        found, path = search_categories(query, sub_category, field)
        if found is not None:
            return found, [cats[field]] + path
    return None, None


def choose_type(query):
    """Return appropriate field index for `query`."""
    if query[0] in string.digits:
        return 0
    return 1


def pre_traversal(cats, field):
    """Return a flat list of `field` by performing a depth first traversal of
    `cats`, visiting the root first."""
    assert field in [0, 1]
    if not cats.sub:
        return [cats[field]]
    all_subs = [pre_traversal(sub, field) for sub in cats.sub]
    return [cats[field]] + [s for sub in all_subs for s in sub]


def get_subcategories(query, field=None):
    """Return a list of `query` and all its sub categories"""
    root, _ = search_categories(query)
    field = choose_type(query) if not field else field.value - 1
    return pre_traversal(root, field)

if __name__ == '__main__':
    # pylint: disable=C0103
    cbar, bpath = search_categories('Bar')
    all_college = get_subcategories('4d4b7105d754a06372d81259', Field.id)
    print(all_college)
