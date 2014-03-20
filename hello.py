#! /usr/bin/python2
# vim: set fileencoding=utf-8
import os
import pymongo
from flask import Flask, session, redirect, url_for, request, g
import flask as f
import utils as u
import cities
import questions as q
QUESTIONS_NAME = q.QUESTIONS.keys() + ['end']

app = Flask(__name__)
app.config.update(dict(
    DEBUG=os.environ.get('DEBUG', False),
    MONGO_URL=os.environ.get('MONGOHQ_URL', None)
))


def connect_db():
    """Return a client to the default mongo database."""
    return pymongo.MongoClient(app.config['MONGO_URL'])


def get_db():
    """Opens a new database connection if there is none yet for the current
    application context.
    """
    if not hasattr(g, 'mongo_db'):
        g.mongo_db = connect_db()
    return g.mongo_db


@app.teardown_appcontext
def close_db(error):
    """Closes the database again at the end of the request."""
    if hasattr(g, 'mongo_db'):
        g.mongo_db.close()


@app.route('/debug', methods=['POST'])
def echo():
    return str(request.form)

@app.route('/<question>/<city>', methods=['GET', 'POST'])
def ask_or_record(question, city):
    # TODO redirect to next question
    assert question in QUESTIONS_NAME
    app.logger.info(request.method)
    if request.method == 'GET':
        return ask_user(question, city)
    app.logger.info('POST')
    return record_answer(question, city)


def record_answer(question, city):
    #TODO save in DB, mark question done in session
    app.logger.info(request.form['send'])
    ans = f.json.loads(request.form['send'])
    # nq = f.json.loads(request.form['nq'])
    # nc = f.json.loads(request.form['nc'])
    nq, nc = str(ans['nq']), str(ans['nc'])
    ans = ans['a']
    if nq != question:
        session['qid'] = session['qid'] + 1
    app.logger.info('update {}'.format(session['qid']))
    app.logger.info(nq)
    app.logger.info(nc)
    return "ok"


def ask_user(question, city):
    if session['city'] is None:
        if city in cities.SHORT_KEY:
            session['city'] = city
        else:
            return redirect(url_for('welcome'))
    if question == 'end':
        return f.render_template('end.html',
                                 city=cities.FULLNAMES[session['city']])
    app.logger.info('next question is {}'.format(session['qid']+1))
    next_question_name = QUESTIONS_NAME[session['qid']+1]
    return f.render_template('draw.html', bbox=cities.BBOXES[city],
                             cities=cities.BCITIES, current=question,
                             city=session['city'], next=next_question_name,
                             **q.QUESTIONS[question]._asdict())


@app.route('/reset')
def reset():
    [session.pop(_, None) for _ in ['id_', 'qid', 'city']]
    return redirect(url_for('welcome'))


@app.route('/')
def welcome():
    app.logger.info(os.environ)
    if 'id_' not in session:
        add_new_user()
    question_name = QUESTIONS_NAME[session['qid']]
    if not session['city']:
        return f.render_template('index.html', cities=cities.BCITIES,
                                 question=question_name)
    return redirect(url_for('ask_user', question=question_name,
                            city=session['city']))


def add_new_user():
    """Populate session with new user variable"""
    import uuid
    id_ = uuid.uuid4()
    qid = 0
    question = q.QUESTIONS[QUESTIONS_NAME[qid]]
    session.update(id_=id_, city=None, qid=qid)


@app.route('/venues', methods=['POST'])
def display_venues():
    venues = get_db()['foursquare']['venue']
    geo = f.json.loads(request.form['geo'])
    radius = float(request.form['radius'])
    # cat = q.QUESTIONS[question].cat
    if radius > 0:
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


# set the secret key.  keep this really secret:
app.secret_key = os.environ['SECRET_KEY']
if __name__ == '__main__':
    print(os.environ)
    app.run()
