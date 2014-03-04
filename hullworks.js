var hullworks = function() {
  
}


if (typeof module !== "undefined" && typeof module.exports == "object") {
  module.exports = hullworks;
}

if (typeof window !== "undefined") {
  window.hullworks = window.hullworks || hullworks;
}
