var ROOT = "http://localhost:5000/";
var city = 'paris';
var acity = 'newyork';
var first_question = 'fastfood';
var second_question = 'romance';
var NBQ = 2;
var lets_go = 'a#start';
casper.element_is_disable = function(selector) {
	return this.getElementAttribute(selector,  'class').indexOf('disabled') > -1;
};
casper.interactions_are_disabled = function() {
	this.test.assertNotVisible('#skip');
	this.test.assertNotVisible('#done-ctn');
	this.test.assertNotVisible('.leaflet-draw');
};
casper.interactions_are_enabled = function() {
	this.test.assertNotVisible('#skip'); //cannot skip anymore after first answer
	this.test.assertVisible('#done-ctn');
	this.test.assertVisible('.leaflet-draw');
};

casper.fast_no_answer = function(nid) {
    this.click('a.leaflet-draw-draw-circle');
    this.mouse.down(350, 150);
    this.mouse.move(380, 120);
    this.mouse.up(380, 120);
    this.wait(600, function(){  
        this.click('#n_'+nid);
    });
};

casper.test.begin('User have to start at homepage', 1, function suite(test) {
    var first_question_label = 'eat some fast food';
    casper.start(ROOT+'romance/paris', function() {
        test.assertUrlMatch(new RegExp(ROOT));
    });
    casper.run(function() { test.done(); });
});
/*
casper.test.begin('Homepage let user choose a city the first time', 10, function suite(test) {
    var first_question_label = 'eat some fast food';
    casper.start(ROOT, function() {
        test.assertTitle("Where would you… a urban activity survey", "homepage title is the one expected");
        test.assertExists('select#pick', "User can choose a city");
        test.assertExists(lets_go, "User would eventually be able to leave the page");
        test.assert(this.element_is_disable(lets_go), "But not now");
    });
    casper.then(function() {
        this.fillSelectors('form#choose', {'select#pick': city}, false);
        this.wait(50, function(){  
            var new_link = this.getElementAttribute(lets_go,  'href');
            test.assert(new_link === first_question+'/'+city,
                "After choosing a city, link changed");
            test.assertFalsy(this.element_is_disable(lets_go), "and is visually clickable");
        }); 
    });
    casper.thenClick(lets_go, function() {
        test.assertTitle("Where would you "+first_question_label+" in "+city+"?",
            "Title of the first question is correct");
    });
    var reg = new RegExp(first_question + '/' + city + '$');
    casper.thenOpen(ROOT, function() {
        test.assertUrlMatch(reg, 'When trying to return to /, get back to the current question');
    });
    casper.thenOpen(ROOT+first_question+'/nantes', function() {
        test.assertUrlMatch(reg, 'When going to an invalid city, get back to the current question');
    });
    casper.thenOpen(ROOT+'crime/'+city, function() {
        test.assertUrlMatch(reg, 'When going to an invalid question, get back to the current question');
    });
    casper.run(function() { test.done(); });
});
*/
/*
casper.test.begin('User can answer at the right time', 20, function suite(test) {
    casper.userAgent('Mozilla/5.0 (X11; Linux x86_64; rv:28.0) Gecko/20100101 Firefox/28.0');
    casper.start(ROOT, function() {
    casper.viewport(1440, 900);
        this.fillSelectors('form#choose', {'select#pick': city}, false);
    });
    casper.thenClick(lets_go, function() {
        test.assertVisible('#skip', "user can leave the question");
        test.assertNotVisible('#done-ctn', "user is not done yet");
        test.assertVisible('.leaflet-draw-section', "user can draw region");
    });
    casper.thenClick('a.leaflet-draw-draw-circle', function() {
        test.assertDoesntExist('div#venues', "Initialy, there is no venues list");
        this.mouse.down(350, 150);
        this.mouse.move(380, 120);
        this.mouse.up(380, 120);
        this.wait(100, function(){  
            test.assertExists('div.leaflet-popup-content-wrapper', "After drawing a circle, a popup appears");
            test.assertExists('div#venues', "After drawing a circle, a popup appears");
            this.interactions_are_disabled();
            this.fill('div#venues', {'4b7b7a3bf964a520f6642fe3': true});
            this.click('#y_0');
            this.interactions_are_enabled();
            test.assertDoesntExist('div#venues', "After answering, popup disappears");
            test.assertEvalEquals(function() {return ANSWER.length;}, 1, 'Answer push in JS');
        });
    });
    // draw outside and check that ANSWER doesn't grow
    casper.thenClick('a.leaflet-draw-draw-circle', function() {
        this.mouse.down(1250, 100);
        this.mouse.move(1260, 70);
        this.mouse.up(1280, 70);
        this.wait(100, function(){  
            test.assertEvalEquals(function() {return ANSWER.length;}, 1,
                'Drawing outside bounds does not push answer');
        });
    });
    casper.thenClick('#done', function() {
        this.interactions_are_disabled();
        test.assertVisible('#time', 'time dialog appears when user clicked done');
        this.fill('#time > form', {'day': 'weekend', 'hour': '15'});
        this.click('#next');
        // require('utils').dump(this.evaluate(function() {return ANSWER;}));
        this.wait(100, function() {
            var reg = new RegExp(second_question + '/' + city + '$');
            test.assertUrlMatch(reg, 'After filling time, go to the next question');
        });
    });
    casper.run(function() { test.done(); });
});
*/
/*
casper.test.begin('User cannot answer more than 3 time', 8, function suite(test) {
    casper.userAgent('Mozilla/5.0 (X11; Linux x86_64; rv:28.0) Gecko/20100101 Firefox/28.0');
    casper.start(ROOT, function() {
        casper.viewport(1440, 900);
        this.fillSelectors('form#choose', {'select#pick': city}, false);
    });
    casper.thenClick(lets_go, function() {
        var reg = new RegExp(first_question + '/' + city + '$');
        test.assertUrlMatch(reg);
    });
    casper.then(function() {
        this.fast_no_answer(0);
        this.wait(200);
    });
    casper.then(function() {
        test.assertEvalEquals(function() {return ANSWER.length;}, 1, 'Answer push in JS');
        this.wait(200);
        this.fast_no_answer(1);
    });
    casper.then(function() {
        test.assertEvalEquals(function() {return ANSWER.length;}, 2, 'Answer push in JS');
        this.wait(200);
        this.fast_no_answer(2);
    });
    casper.then(function() {
        test.assertEvalEquals(function() {return ANSWER.length;}, 3, 'Answer push in JS');
        this.interactions_are_disabled();
        test.assertVisible('#time', 'time dialog appears after 3 answers');
        // require('utils').dump(this.evaluate(function() {return ANSWER;}));
    });
    casper.thenClick('#next', function() {this.wait(60);});
    casper.run(function() { test.done(); });
});
*/
/*
casper.test.begin('User can answer same question in another city', 2, function suite(test) {
    casper.userAgent('Mozilla/5.0 (X11; Linux x86_64; rv:28.0) Gecko/20100101 Firefox/28.0');
    casper.start(ROOT, function() {
        casper.viewport(1440, 900);
        this.fillSelectors('form#choose', {'select#pick': city}, false);
    });
    casper.thenClick(lets_go, function() {
        var reg = new RegExp(first_question + '/' + city + '$');
        test.assertUrlMatch(reg);
    });
    casper.then(function() { this.fast_no_answer(0); this.wait(200); });
    casper.thenClick('#done', function() {
        this.fillSelectors('#time > form', {'select#pick': acity}, false);
        this.wait(100, function() {
            var reg = new RegExp(first_question + '/' + acity + '$');
            test.assertUrlMatch(reg);
        });
    });
    casper.thenClick('#next', function() { this.echo(this.getCurrentUrl()); this.fast_no_answer(0); this.wait(600); });
    casper.thenClick('#done');
    casper.thenClick('#next');
    casper.then(function() { this.fast_no_answer(0); this.wait(600); });
    casper.thenClick('#done');
    casper.thenClick('#next', function() {
        this.wait(100, function() {this.capture('end.png');});});
    casper.run(function() { test.done(); });
});
*/
/*
casper.test.begin('User can reach the end page', 2, function suite(test) {
    casper.userAgent('Mozilla/5.0 (X11; Linux x86_64; rv:28.0) Gecko/20100101 Firefox/28.0');
    casper.start(ROOT, function() {
        casper.viewport(1440, 900);
        this.fillSelectors('form#choose', {'select#pick': city}, false);
    });
    casper.thenClick(lets_go, function() {
        var reg = new RegExp(first_question + '/' + city + '$');
        test.assertUrlMatch(reg);
    });
    casper.then(function() { this.fast_no_answer(0); this.wait(600); });
    casper.thenClick('#done');
    casper.thenClick('#next');
    casper.then(function() { this.echo(this.getCurrentUrl()); this.fast_no_answer(0); this.wait(600); });
    casper.thenClick('#done');
    casper.thenClick('#next', function() {
        this.wait(100, function() {
        test.assertUrlMatch(/end/);
        });
    });
    casper.run(function() { test.done(); });
});
*/
