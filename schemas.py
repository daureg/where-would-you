# from https://github.com/JasonSanford/geojsonlint.com/
position = {
    "type": "array",
    "minItems": 2,
    "maxItems": 3,
    "items": {
        "type": "number"
    }
}

point = {
    "type": "object",
    "$schema": "http://json-schema.org/draft-04/schema#",
    "title": "Point",
    "properties": {
        "type": {
            "pattern": "^Point$"
        },
        "coordinates": position
    },
    "required": ["type", "coordinates"]
}

polygon = {
    "type": "object",
    "properties": {
        "type": {
            "pattern": "^Polygon$"
        },
        "coordinates": {
            "type": "array",
            "items": {
                "type": "array",
                "minItems": 4,
                "items": position
            }
        }
    },
    "required": ["type", "coordinates"]
}
