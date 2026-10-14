// Helper kit inlined into every widget document, after the runtime. Model code
// calls these instead of drawing SVG or formatting numbers by hand, so charts
// look the same in every widget and bad input never reaches the screen as NaN.
//
// API (window.arda):
//   fmt(value, format)        "amount" (compact: 1,25 tỷ) | "vnd" (exact: 1.250.000.000 VNĐ)
//                             | "percent" | "int" | "number"; non-finite → "—"
//   exact(value, format)      the full figure behind a compact one ("amount" → "vnd")
//   num(value, fallback)      Number(value) when finite, else fallback
//   $(id)                     document.getElementById
//   val(id, fallback)         numeric value of an input, clamped to its min/max
//   set(id, text)             textContent setter
//   set(id, value, format)    compact text, exact figure in the title (hover)
//   live(render)              render now and on every input/change in the page
//   chart(target, spec)       SVG chart, redrawn on resize
//   chartSvg(spec, width)     the same chart as an SVG string (pure)
//   table(target, spec)       {columns: [{key, label, format?}], rows}; "amount"
//                             cells print the exact figure without the unit (put
//                             "(VNĐ)" in the label); tables are for checking
//
// Compact figures are for glancing (cards, axes, legends); the exact figure is
// always one hover away (title, chart tooltips) and in every table cell.
//
// spec: {type: "bar" | "line" | "area" | "stacked" | "donut", categories,
//        series: [{name, values}], format?, height?}
//
// Constraints: this text sits in an inline <script> that is not escaped, so it
// must not contain a closing script tag or an HTML comment opener; it must not
// contain "arda:" message literals (the runtime test counts them); ES5 only,
// no template literals.
export const WIDGET_KIT = `(function () {
  var nf = {};
  function numberFormat(digits) {
    if (!nf[digits]) {
      try { nf[digits] = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }); }
      catch (e) { nf[digits] = { format: function (v) { return String(Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits)); } }; }
    }
    return nf[digits];
  }
  function finite(v) { return typeof v === "number" && isFinite(v); }
  function num(value, fallback) {
    var n = typeof value === "number" ? value : (typeof value === "string" && value.trim() !== "" ? Number(value) : NaN);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }
  function fmt(value, format) {
    var v = num(value, NaN);
    if (!isFinite(v)) return "\\u2014";
    var abs = Math.abs(v);
    switch (format) {
      case "percent": return numberFormat(2).format(v) + "%";
      case "int": return numberFormat(0).format(v);
      case "amount":
        if (abs >= 1e9) return numberFormat(2).format(v / 1e9) + " t\\u1ef7";
        if (abs >= 1e6) return numberFormat(2).format(v / 1e6) + " tri\\u1ec7u";
        return numberFormat(0).format(v);
      case "vnd": return numberFormat(0).format(v) + " VN\\u0110";
      default: return numberFormat(2).format(v);
    }
  }
  function exact(value, format) { return fmt(value, format === "amount" ? "vnd" : format); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(target) { return typeof target === "string" ? document.getElementById(target) : target; }
  function val(id, fallback) {
    var input = el(id);
    if (!input) return fallback === undefined ? 0 : fallback;
    var v = num(input.value, fallback);
    var min = num(input.min, -Infinity), max = num(input.max, Infinity);
    if (input.min !== "" && input.min != null && v < min) v = min;
    if (input.max !== "" && input.max != null && v > max) v = max;
    return v;
  }
  function set(id, value, format) {
    var node = el(id);
    if (!node) return;
    if (format === undefined) {
      node.textContent = value == null ? "" : String(value);
      if (node.removeAttribute) node.removeAttribute("title");
      return;
    }
    node.textContent = fmt(value, format);
    node.title = exact(value, format);
  }
  function live(render) {
    document.addEventListener("input", function () { render(); });
    document.addEventListener("change", function () { render(); });
    render();
  }
  function color(i) { return "var(--chart-" + ((i % 10) + 1) + ")"; }

  // Round axis steps: 1, 2, 2.5, 5 times a power of ten.
  function niceTicks(min, max, count) {
    if (min === max) { if (max === 0) { max = 1; } else if (max > 0) { min = 0; } else { max = 0; } }
    var span = max - min, raw = span / Math.max(1, count);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag, step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
    for (var t = lo; t <= hi + step / 2; t += step) ticks.push(Math.abs(t) < step / 1e6 ? 0 : t);
    return ticks;
  }
  function seriesOf(spec) {
    var cats = (spec && spec.categories) || [];
    return ((spec && spec.series) || []).map(function (s, i) {
      var values = [];
      for (var k = 0; k < cats.length; k++) values.push(num(s && s.values ? s.values[k] : undefined, 0));
      return { name: String((s && s.name) || ("Series " + (i + 1))), values: values, color: color(i) };
    });
  }
  function legend(series, width) {
    if (series.length < 2) return { svg: "", height: 0 };
    var x = 0, y = 10, out = "";
    series.forEach(function (s) {
      var w = 18 + s.name.length * 6.5 + 14;
      if (x > 0 && x + w > width) { x = 0; y += 18; }
      out += '<rect x="' + x + '" y="' + (y - 8) + '" width="10" height="10" rx="2" style="fill:' + s.color + '"/>' +
        '<text x="' + (x + 15) + '" y="' + (y + 1) + '" style="fill:var(--foreground)">' + esc(s.name) + '</text>';
      x += w;
    });
    return { svg: out, height: y + 12 };
  }

  function donutSvg(spec, width, height) {
    var series = seriesOf(spec), cats = spec.categories || [], format = spec.format;
    var values = series.length ? series[0].values.map(function (v) { return Math.max(0, v); }) : [];
    var total = values.reduce(function (a, b) { return a + b; }, 0);
    var r = Math.max(20, Math.min(height / 2 - 8, width / 4)), cx = r + 8, cy = height / 2, ir = r * 0.6;
    var out = "", angle = -Math.PI / 2;
    if (total <= 0) {
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r + ir) / 2 + '" style="fill:none;stroke:var(--border);stroke-width:' + (r - ir) + '"/>';
    }
    values.forEach(function (v, i) {
      if (total <= 0 || v <= 0) return;
      var a = (v / total) * Math.PI * 2, end = angle + Math.min(a, Math.PI * 2 - 1e-4), large = a > Math.PI ? 1 : 0;
      var p = function (rad, ang) { return (cx + rad * Math.cos(ang)).toFixed(2) + " " + (cy + rad * Math.sin(ang)).toFixed(2); };
      out += '<path d="M' + p(r, angle) + " A" + r + " " + r + " 0 " + large + " 1 " + p(r, end) +
        " L" + p(ir, end) + " A" + ir + " " + ir + " 0 " + large + " 0 " + p(ir, angle) + 'Z" style="fill:' + color(i) + ';stroke:var(--card);stroke-width:1">' +
        "<title>" + esc(cats[i]) + ": " + esc(exact(v, format)) + "</title></path>";
      angle += a;
    });
    out += '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" style="fill:var(--foreground);font-weight:600;font-size:13px">' + esc(fmt(total, format)) + "</text>";
    var lx = cx + r + 20, rows = Math.max(1, Math.floor((height - 8) / 18)), shown = Math.min(cats.length, rows);
    for (var i = 0; i < shown; i++) {
      var y = cy - (shown * 18) / 2 + i * 18 + 13;
      var pct = total > 0 ? " (" + numberFormat(1).format((values[i] / total) * 100) + "%)" : "";
      out += '<rect x="' + lx + '" y="' + (y - 9) + '" width="10" height="10" rx="2" style="fill:' + color(i) + '"/>' +
        '<text x="' + (lx + 15) + '" y="' + y + '" style="fill:var(--foreground)">' + esc(cats[i]) +
        '<tspan style="fill:var(--muted-foreground)"> ' + esc(fmt(values[i], format) + pct) + "</tspan></text>";
    }
    return out;
  }

  function chartSvg(spec, width) {
    spec = spec || {};
    var type = spec.type || "bar", format = spec.format, height = num(spec.height, 220);
    width = Math.max(160, num(width, 560));
    var head = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height +
      '" role="img" style="display:block;font:11px system-ui,sans-serif;overflow:visible">';
    if (type === "donut" || type === "pie") return head + donutSvg(spec, width, height) + "</svg>";

    var cats = (spec.categories || []).map(function (c) { return String(c == null ? "" : c); });
    var series = seriesOf(spec), n = cats.length;
    var stacked = type === "stacked";
    var lg = legend(series, width), out = lg.svg;
    var lo = 0, hi = 0;
    for (var k = 0; k < n; k++) {
      var pos = 0, neg = 0;
      series.forEach(function (s) {
        var v = s.values[k];
        if (stacked) { if (v >= 0) pos += v; else neg += v; }
        else { if (v > hi) hi = v; if (v < lo) lo = v; }
      });
      if (stacked) { if (pos > hi) hi = pos; if (neg < lo) lo = neg; }
    }
    var ticks = niceTicks(lo, hi, 5), y0 = ticks[0], y1 = ticks[ticks.length - 1];
    var labelW = 0;
    ticks.forEach(function (t) { labelW = Math.max(labelW, fmt(t, format).length * 6.2); });
    var left = Math.ceil(labelW) + 8, top = lg.height + 8, bottom = 22, right = 8;
    var pw = Math.max(40, width - left - right), ph = Math.max(40, height - top - bottom);
    var y = function (v) { return top + ph - ((v - y0) / (y1 - y0 || 1)) * ph; };
    var band = n ? pw / n : pw;
    var cx = function (i) { return left + band * i + band / 2; };

    ticks.forEach(function (t) {
      var ty = y(t).toFixed(1);
      out += '<line x1="' + left + '" x2="' + (left + pw) + '" y1="' + ty + '" y2="' + ty + '" style="stroke:var(--border);stroke-opacity:' + (t === 0 ? 1 : 0.5) + '"/>' +
        '<text x="' + (left - 6) + '" y="' + (Number(ty) + 4) + '" text-anchor="end" style="fill:var(--muted-foreground)">' + esc(fmt(t, format)) + "</text>";
    });
    var every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 56))));
    cats.forEach(function (c, i) {
      if (i % every !== 0) return;
      var label = c.length > 14 ? c.slice(0, 13) + "\\u2026" : c;
      out += '<text x="' + cx(i).toFixed(1) + '" y="' + (top + ph + 15) + '" text-anchor="middle" style="fill:var(--muted-foreground)">' + esc(label) + "</text>";
    });

    if (type === "line" || type === "area") {
      series.forEach(function (s) {
        var pts = s.values.map(function (v, i) { return cx(i).toFixed(1) + "," + y(v).toFixed(1); });
        if (!pts.length) return;
        if (type === "area") {
          out += '<path d="M' + cx(0).toFixed(1) + "," + y(Math.max(y0, Math.min(0, y1))).toFixed(1) + " L" + pts.join(" L") + " L" + cx(n - 1).toFixed(1) + "," +
            y(Math.max(y0, Math.min(0, y1))).toFixed(1) + 'Z" style="fill:' + s.color + ';fill-opacity:0.15"/>';
        }
        out += '<polyline points="' + pts.join(" ") + '" style="fill:none;stroke:' + s.color + ';stroke-width:2;stroke-linejoin:round;stroke-linecap:round"/>';
        if (n <= 24) s.values.forEach(function (v, i) {
          out += '<circle cx="' + cx(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="2.5" style="fill:var(--card);stroke:' + s.color + ';stroke-width:1.5"/>';
        });
      });
    } else {
      var groups = stacked ? 1 : Math.max(1, series.length);
      var bw = Math.max(2, Math.min(36, (band * 0.7) / groups));
      for (var i = 0; i < n; i++) {
        var pos2 = 0, neg2 = 0;
        series.forEach(function (s, j) {
          var v = s.values[i], from, to, x;
          if (stacked) { from = v >= 0 ? pos2 : neg2; to = from + v; if (v >= 0) pos2 = to; else neg2 = to; x = cx(i) - bw / 2; }
          else { from = 0; to = v; x = cx(i) - (bw * groups) / 2 + bw * j; }
          var ya = y(Math.max(from, to)), yb = y(Math.min(from, to));
          out += '<rect x="' + x.toFixed(1) + '" y="' + ya.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, yb - ya).toFixed(1) +
            '" rx="2" style="fill:' + s.color + '"/>';
        });
      }
    }
    // One transparent hit area per category carries the native tooltip.
    cats.forEach(function (c, i) {
      var tip = esc(c) + series.map(function (s) { return "\\n" + esc(s.name) + ": " + esc(exact(s.values[i], format)); }).join("");
      out += '<rect x="' + (left + band * i).toFixed(1) + '" y="' + top + '" width="' + band.toFixed(1) + '" height="' + ph + '" style="fill:transparent"><title>' + tip + "</title></rect>";
    });
    return head + out + "</svg>";
  }

  function chart(target, spec) {
    var node = el(target);
    if (!node) return;
    node.__ardaSpec = spec;
    var draw = function () { node.innerHTML = chartSvg(node.__ardaSpec, node.clientWidth || 560); };
    draw();
    if (!node.__ardaObserved && typeof ResizeObserver === "function") {
      node.__ardaObserved = true;
      var lastW = node.clientWidth;
      new ResizeObserver(function () { if (node.clientWidth !== lastW) { lastW = node.clientWidth; draw(); } }).observe(node);
    }
  }

  function table(target, spec) {
    var node = el(target);
    if (!node) return;
    var cols = (spec && spec.columns) || [], rows = (spec && spec.rows) || [];
    var html = "<table><thead><tr>" + cols.map(function (c) { return "<th>" + esc(c.label) + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) {
      html += "<tr>" + cols.map(function (c) {
        var v = r ? r[c.key] : undefined;
        return "<td>" + esc(!c.format ? v : c.format === "amount" ? fmt(v, "int") : exact(v, c.format)) + "</td>";
      }).join("") + "</tr>";
    });
    node.innerHTML = html + "</tbody></table>";
  }

  window.arda = { fmt: fmt, exact: exact, num: num, $: el, val: val, set: set, live: live, chart: chart, chartSvg: chartSvg, table: table };
})();`
