if (typeof require !== 'undefined') {
  var ClipperLib = require('./clipper');
} else {
  var ClipperLib = window.ClipperLib;
}

ClipperLib.Error = function(msg) { throw new Error(msg) };

function HullWorks(precision) {
  this.precision = precision || this.precision;
}

HullWorks.prototype.precision = 100000;
HullWorks.prototype.lightenThreshold = 0.1;
HullWorks.prototype.cleanThreshold = 0.00001;

HullWorks.prototype.offset = function(hulls, offsetAmount) {
  var result = null;

  if (!hulls) {
    return result;
  }

  var ignore = {}, paths = new Array(hulls.length), ret = [];
  var i, j, k;
  for (j = 0; j<hulls.length; j++) {
    if (!hulls[j] || !hulls[j].points || !hulls[j].points.length) {
      continue;
    }

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
        result = this.union(result, offsetPath);
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
    if (!result || !result.length) {
      continue;
    }

    var localRet = [result[0]];

    var sential = 10000;
    while (result && sential--) {

      var offset = this.offsetHull([result[result.length-1]], -offsetAmount);

      if (!offset) {
        break;
      }

      if (ClipperLib.Clipper.Area(offset[0]) < 0) {
        offset[0].reverse();
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

    ret.push(localRet.concat(result));
  }

  return ret;
};

HullWorks.prototype.union = function(a, b) {
  var cpr = new ClipperLib.Clipper();
  if (!a) {
    return b;
  }

  if (!b) {
    return a;
  }

  cpr.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  cpr.AddPaths(b, ClipperLib.PolyType.ptClip, true);

  var ret = new ClipperLib.Paths();

  cpr.Execute(
    ClipperLib.ClipType.ctUnion,
    ret,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );

  //ClipperLib.JS.Lighten(ret, this.lightenThreshold);

  return ClipperLib.JS.Clean(ret, this.precision * this.cleanThreshold);
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

  //ClipperLib.JS.Lighten(ret, this.lightenThreshold);
  return ClipperLib.JS.Clean(ret, this.precision * this.cleanThreshold);
};

HullWorks.prototype.offsetHull = function (paths, offsetAmount) {
  if (!paths || !paths.length) {
    return;
  }

  var co = new ClipperLib.ClipperOffset(0, 0);

  ClipperLib.JS.ScaleUpPaths(paths, this.precision);
  ClipperLib.JS.Clean(paths, this.precision * this.cleanThreshold);

  co.AddPaths(paths,
    ClipperLib.JoinType.jtMiter,
    ClipperLib.EndType.etClosedPolygon
  );

  var result = new ClipperLib.Paths();
  co.Execute(result, offsetAmount * this.precision);
  ClipperLib.JS.ScaleDownPaths(paths, this.precision);

  if (result && result.length) {
    ClipperLib.JS.ScaleDownPaths(result, this.precision);
    return ClipperLib.JS.Clean(result, this.precision * this.cleanThreshold);
  }
};

if (typeof module !== "undefined" && typeof module.exports == "object") {
  module.exports = HullWorks;
}

if (typeof window !== "undefined") {
  window.HullWorks = window.HullWorks || HullWorks;
}
