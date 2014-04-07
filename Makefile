SOURCES_JS = static/minified-custom.js \
	     static/leaflet-src.js \
	     static/leaflet.draw-src.js
SOURCES_CSS = static/normalize.css \
	      static/buttons.css \
	      static/leaflet.css \
	      static/leaflet.draw.css \
	      static/mine.css \
	      static/wait.css
PROD = 1

all: app.css app.js

app.css: $(SOURCES_CSS)
	cat $(SOURCES_CSS) > __tmp.css
ifeq ($(PROD), 1)
	node_modules/clean-css/bin/cleancss -e --s0 __tmp.css > $@
else
	cat __tmp.css > $@
endif
	rm __tmp.css
	mv app.css static/app.css
	gzip -fqk -9 static/app.css

app.js: $(SOURCES_JS)
ifeq ($(PROD), 1)
	# sed -e '/console.log(/d' $(SOURCES_JS) > __tmp.js
	# node_modules/uglify-js/bin/uglifyjs __tmp.js -cm > $@
	sed -e '/console.log(/d' static/draw.js > __tmp.js
	node_modules/uglify-js/bin/uglifyjs __tmp.js -cm > static/rdraw.js
	sed -i  "s/='draw.js'/='rdraw.js'/" templates/draw.html
	rm __tmp.js
else
	node_modules/uglify-js/bin/uglifyjs $(SOURCES_JS) -b > $@
	sed -i  "s/='rdraw.js'/='draw.js'/" templates/draw.html
endif
	# mv app.js static/app.js
	gzip -fqk -9 static/app.js
	gzip -fqk -9 static/rdraw.js

clean:
	rm -f static/app.css* static/app.js*
