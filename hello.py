#! /usr/bin/python2
# vim: set fileencoding=utf-8
import os
import re
import pymongo
from collections import defaultdict, Counter
from datetime import datetime as dt
from flask.ext.compress import Compress
import flask as f
import utils as u
import cities as c
import questions as q
import schemas as s
import jsonschema as jsa
QUESTIONS_NAME = q.QUESTIONS.keys() + ['end']
VENUE_ID = re.compile(r'[0-9a-f]{24}')
from flask.ext.assets import Environment, Bundle

app = f.Flask(__name__)
app.config.update(dict(
    DEBUG=os.environ.get('DEBUG', True),
    MOCKING=os.environ.get('MOCKING', False),
    MONGO_URL=os.environ.get('MONGOHQ_URL', None)
))
Compress(app)
assets = Environment(app)

js = Bundle('app.js', output='gen/packed.js')
css = Bundle('app.css', output='gen/packed.css')
assets.register('css_all', css)


def connect_db():
    """Return a client to the default mongo database."""
    return pymongo.MongoClient(app.config['MONGO_URL'])


def get_db():
    """Opens a new database connection if there is none yet for the current
    application context.
    """
    if not hasattr(f.g, 'mongo_db'):
        f.g.mongo_db = connect_db()
    return f.g.mongo_db


def question_name(session):
    return QUESTIONS_NAME[session['qid']]


def actual_question(session):
    return q.QUESTIONS[question_name(session)]


def next_question_name(session):
    return QUESTIONS_NAME[session['qid']+1]


@app.teardown_appcontext
def close_db(error):
    """Closes the database again at the end of the f.request."""
    if hasattr(f.g, 'mongo_db'):
        f.g.mongo_db.close()


@app.route('/skip/<city>')
def skip(city):
    """Skip to the next question in city."""
    f.session['qid'] += 1
    question = question_name(f.session)
    if city not in c.SHORT_KEY:
        city = f.session['city']
    return f.redirect(f.url_for('ask_or_record', city=city,
                                question=question))


@app.route('/<question>/<city>', methods=['GET', 'POST'])
def ask_or_record(question, city):
    """Dispatch request concerning questions and cities."""
    if 'id_' not in f.session:
            return f.redirect(f.url_for('welcome'))
    if question not in QUESTIONS_NAME:
        question = question_name(f.session)
        return f.redirect(f.url_for('ask_or_record', city=f.session['city'],
                                    question=question))
    if f.request.method == 'GET':
        if city in f.session['answers'].get(question, []):
            f.session['qid'] += 1
            question = question_name(f.session)
        return ask_user(question, city)
    return record_answer(question, city)


def record_answer(question, city):
    """Save the posted answer in DB and mark the (question, city) as done"""
    nq = f.request.form['nq']
    if nq != question:
        f.session['qid'] += 1
    try:
        new_answers = f.json.loads(f.request.form['ans'])
        timing = f.json.loads(f.request.form['timing'])
    except ValueError:
        return "ko"
    answers = []
    common = {'uid': str(f.session['id_']), 'city': city, 'question':
              question, 'when': dt.utcnow()}
    for a in new_answers:
        if not validate_space(a):
            app.logger.info(a)
            continue
        del a['id_']
        answers.append(dict(common, **a))
    if validate_time(timing):
        common['type'] = 'timing'
        answers.append(dict(common, **timing))
    if len(answers) > 0:
        db = get_db().get_default_database()['answers']
        try:
            db.insert(answers, continue_on_error=True)
        except pymongo.errors.PyMongoError as oops:
            app.logger.warn(str(oops))
        f.session['answers'].setdefault(question, []).append(city)
    return "ko"


def validate_time(ans):
    """Make sure that the `ans` dict is a well formed timing answer."""
    if not isinstance(ans, dict):
        return False
    fields = set(ans.keys())
    period = ['both', 'weekend', 'weekday']
    if fields != set(period + ['hour']):
        return False
    hour = ans['hour']
    if not isinstance(hour, int) and not (0 <= hour <= 23):
        return False
    for key in period:
        if not isinstance(ans[key], bool):
            return False
    return True


def validate_space(ans):
    """Make sure that the `ans` dict is a well formed answer object."""
    if not isinstance(ans, dict):
        return False
    fields = set(ans.keys())
    if fields != set(['id_', 'geo', 'radius', 'type', 'venues']):
        return False
    if ans['type'] not in ['circle', 'polygon']:
        return False
    if not isinstance(ans['id_'], int) or not (0 <= ans['id_'] <= 2):
        return False
    radius = ans['radius']
    if not isinstance(radius, float) or not (0 <= radius <= 50000):
        return False
    geo = ans['geo']
    scheme = s.point if radius > 1 else s.polygon
    try:
        jsa.validate(geo, scheme)
    except (jsa.SchemaError, jsa.ValidationError) as invalid:
        app.logger.info('{}'.format(geo, invalid))
        return False
    venues = ans['venues']
    if not isinstance(venues, list) or not (0 <= len(venues) <= 5):
        return False
    for vid in venues:
        if not VENUE_ID.match(vid):
            return False
    return True


def ask_user(question, city):
    """If arguments are valid, show a map where user can answer, otherwise,
    redirect appropriately."""
    if f.session['city'] is None:
        if 'id_' in f.session and city in c.SHORT_KEY:
            f.session['city'] = city
        else:
            return f.redirect(f.url_for('welcome'))
    if city not in c.SHORT_KEY:
        return f.redirect(f.url_for('ask_or_record', city=f.session['city'],
                                    question=question))
    if question == 'end':
        return f.redirect(f.url_for('thank_you'))
    next_question = next_question_name(f.session)
    previous = f.session['answers'].get(question, []) + [city]
    other_cities = [_ for _ in c.BCITIES if _.short not in previous]
    return f.render_template('draw.html', bbox=c.BBOXES[city],
                             total=len(QUESTIONS_NAME)-1, cities=other_cities,
                             current=question, city=f.session['city'],
                             next=next_question,
                             **q.QUESTIONS[question]._asdict())


@app.route('/thanks')
def thank_you():
    answers = f.session['answers']
    done = True
    if len(answers) < 2:
        question = question_name(f.session)
        if question == 'end':
            done = False
        else:
            return f.redirect(f.url_for('ask_or_record',
                                        city=f.session['city'],
                                        question=question))
    cities = [ct for cts in answers.itervalues() for ct in cts]
    app.logger.info(Counter(cities))
    cities = [_ for _ in c.BCITIES if _.short in Counter(cities).keys()]
    names = ', '.join([_.long for _ in cities])
    first, _, last = names.rpartition(',')
    if len(first) > 0:
        names = first + ' and' + last
    return f.render_template('end.html', done=done, names=names,
                             cities=cities)


@app.route('/cities')
def show_cities():
    imgs = [_ for _ in c.BCITIES
            if _.short in ['paris', 'helsinki', 'berlin', 'rome', 'newyork',
                           'barcelona', 'sanfrancisco']]
    return f.render_template('cities.html', cities=imgs)


@app.route('/reset')
def reset():
    [f.session.pop(_, None) for _ in ['answers', 'id_', 'qid', 'city']]
    return f.redirect(f.url_for('welcome'))


@app.route('/')
def welcome():
    if 'id_' not in f.session:
        add_new_user()
    question = question_name(f.session)
    if not f.session['city']:
        return f.render_template('index.html', cities=c.BCITIES,
                                 question=question)
    return f.redirect(f.url_for('ask_or_record', question=question,
                                city=f.session['city']))


def add_new_user():
    """Populate f.session with new user variable"""
    import uuid
    id_ = uuid.uuid4()
    qid = 0
    answers = defaultdict(list)
    f.session.update(id_=id_, city=None, qid=qid, answers=answers)


@app.route('/venues', methods=['POST'])
def display_venues():
    venues = get_db().get_default_database()['venue']
    geo = f.json.loads(f.request.form['geo'])
    radius = float(f.request.form['radius'])
    # cat = q.QUESTIONS[question].cat
    if radius > 0:
        geo = fake_geo(int(radius)) if app.config['MOCKING'] else geo
        space = {'$near': {'$geometry': geo, 'maxDistance': radius}}
        is_within = lambda p: u.geodesic_distance(p, geo) <= radius
    else:
        space = {'$geoWithin': geo}
        is_within = lambda p: True
    res = venues.find({'loc': space}, {'name': 1, 'loc': 1}, limit=5)
    url = 'https://foursquare.com/v/'
    ven = [{'name': v['name'], 'url': url+v['_id']}
           for v in res if is_within(v['loc'])]
    return f.jsonify(r=ven)


def fake_geo(radius):
    """Return point inside Paris based on trigger value `radius`."""
    res = {'type': 'Point'}
    coords = {532: [2.3, 48.85]}
    res['coordinates'] = coords.get(radius, [2.3, 48.85])
    return res


# set the secret key.  keep this really secret:
app.secret_key = os.environ['SECRET_KEY']
if __name__ == '__main__':
    app.run()
