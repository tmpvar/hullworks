var hullworks;
if (typeof require !== "undefined") {
  hullworks = require("../hullworks.js");
} else {
  hullworks = window.hullworks;
}

var ok = function(a, msg) { if (!a) throw new Error(msg || "not ok"); };
var eq = function(a, b) { if (a!==b) throw new Error(a + " !== " + b); };

describe('hullworks', function() {
  describe('#', function() {
    it('', function() {
      
    });
  });
});
