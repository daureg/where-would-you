#! /usr/bin/python2
# vim: set fileencoding=utf-8
import os
from flask import Flask

app = Flask(__name__)
app.config['DEBUG'] = os.environ.get('DEBUG', False)


@app.route('/')
def hello():
    return 'Hello World!'

if __name__ == '__main__':
    app.run()
