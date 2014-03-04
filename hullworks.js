if (typeof require !== 'undefined') {
  var ClipperLib = require('./clipper');
}

function HullWorks(precision) {
  this.precision = precision || this.precision;
}

HullWorks.prototype.precision = 1000;
HullWorks.prototype.lightenThreshold = 0.1;
HullWorks.prototype.cleanThreshold = 1;

HullWorks.prototype.offset = function(hulls, offsetAmount) {
  var result = null;

  var ignore = {}, paths = new Array(hulls.length), ret = [];
  var i, j, k;
  for (j = 0; j<hulls.length; j++) {
    var path = new Array(hulls[j].points.length);
    var points = hulls[j].points;
    for (k = 0; k<points.length; k++) {
      path[k] = { X: points[k].x, Y: points[k].y };
    }

    if (!hulls[j].isHole) {
      var offsetPath = this.offsetHull([path], offsetAmount);
      if (!result) {
        result = offsetPath;
      } else {
        result = this.union(offsetPath, result);
      }
    } else {
      paths[j] = path;
    }
  }

  ret.push(result);

  // Holes
  for (j = 0; j<paths.length; j++) {
    if (ignore[j] || !paths[j]) {
      continue;
    }

    result = this.offsetHull([paths[j]], -offsetAmount);
    var localRet = [result[0]];

    var sential = 10000;
    while (result && sential--) {

      var offset = this.offsetHull([result[result.length-1]], -offsetAmount);

      if (!offset || ClipperLib.Clipper.Area(offset[0]) <= 0) {
        break;
      }

      localRet.push(offset[0]);

      // TODO: if the hull is a hole, and a raytrace into the
      // original mesh turns up empty, then we can ignore it as well.
      //
      // Why? when we are cutting out holes that traverse the depth of
      //      the model, there is no point in stepping in on every layer.
      //
      //  The same is true for contours. Just because it's not a hole
      //  does not mean that we should only do one iteration.

      result = this.xor(offset, result);
    }

    // TODO: yikes. why is this still scaled?
    ClipperLib.JS.ScaleDownPaths(result, this.precision);
    ret.push(localRet.concat(result));
  }

  return ret;
};

HullWorks.prototype.union = function(a, b) {
  var cpr = new ClipperLib.Clipper();
  cpr.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  cpr.AddPaths(b, ClipperLib.PolyType.ptClip, true);

  var ret = new ClipperLib.Paths();

  cpr.Execute(
    ClipperLib.ClipType.ctUnion,
    ret,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );

  ClipperLib.JS.Lighten(ret, this.lightenThreshold);

  return ret;
};

HullWorks.prototype.xor = function(a, b) {
  var cpr = new ClipperLib.Clipper();
  cpr.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  cpr.AddPaths(b, ClipperLib.PolyType.ptClip, true);

  var ret = new ClipperLib.Paths();

  cpr.Execute(
    ClipperLib.ClipType.ctXor,
    ret,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );

  ClipperLib.JS.Lighten(ret, this.lightenThreshold);
  return ret;
};

HullWorks.prototype.offsetHull = function (paths, offsetAmount) {
  var co = new ClipperLib.ClipperOffset(0, 0);

  ClipperLib.JS.ScaleUpPaths(paths, this.precision);

  co.AddPaths(paths,
    ClipperLib.JoinType.jtMiter,
    ClipperLib.EndType.etClosedPolygon
  );

  var result = new ClipperLib.Paths();
  co.Execute(result, offsetAmount * this.precision);
  if (result.length) {
    ClipperLib.JS.ScaleDownPaths(result, this.precision);
    return ClipperLib.JS.Clean(result, this.cleanThreshold);
  }
};

if (typeof module !== "undefined" && typeof module.exports == "object") {
  module.exports = HullWorks;
}

if (typeof window !== "undefined") {
  window.HullWorks = window.HullWorks || HullWorks;
}
