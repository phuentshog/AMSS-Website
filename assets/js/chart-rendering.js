(() => {
  const NS = "http://www.w3.org/2000/svg";
  const makeSvg = (host, width, height, className, label) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width)); svg.setAttribute("height", String(height));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.height = `${height}px`;
    if (className) className.split(/\s+/).filter(Boolean).forEach((token) => svg.classList.add(token));
    host.append(svg);
    return svg;
  };
  const scaleY = (value, min, max, top, height) => top + ((max - value) / (max - min)) * height;
  const scaleX = (index, count, left, width) => left + width * (index + 0.5) / count;
  const text = (svg, value, x, y, className, anchor = "middle") => {
    const node = document.createElementNS(NS, "text");
    node.textContent = String(value);
    node.setAttribute("x", String(x)); node.setAttribute("y", String(y));
    node.setAttribute("text-anchor", anchor);
    if (className) node.setAttribute("class", className);
    svg.append(node);
    return node;
  };
  const line = (svg, x1, y1, x2, y2, className) => {
    const node = document.createElementNS(NS, "line");
    node.setAttribute("x1", String(x1)); node.setAttribute("y1", String(y1));
    node.setAttribute("x2", String(x2)); node.setAttribute("y2", String(y2));
    if (className) node.setAttribute("class", className);
    svg.append(node);
    return node;
  };
  const rect = (svg, x, y, width, height, className, fill, tooltip) => {
    const node = document.createElementNS(NS, "rect");
    node.setAttribute("x", String(x)); node.setAttribute("y", String(y));
    node.setAttribute("width", String(Math.max(0, width))); node.setAttribute("height", String(Math.max(0, height)));
    node.setAttribute("rx", "4");
    if (className) node.setAttribute("class", className);
    if (fill) node.setAttribute("fill", fill);
    if (tooltip) {
      const title = document.createElementNS(NS, "title"); title.textContent = tooltip; node.append(title);
      node.setAttribute("aria-label", tooltip);
    }
    svg.append(node);
    return node;
  };
  const circle = (svg, cx, cy, radius, className, fill, tooltip) => {
    const node = document.createElementNS(NS, "circle");
    node.setAttribute("cx", String(cx)); node.setAttribute("cy", String(cy));
    node.setAttribute("r", String(Math.max(0, radius)));
    if (className) node.setAttribute("class", className);
    if (fill) node.setAttribute("fill", fill);
    if (tooltip) {
      const title = document.createElementNS(NS, "title"); title.textContent = tooltip; node.append(title);
      node.setAttribute("aria-label", tooltip);
    }
    svg.append(node);
    return node;
  };
  const verticalBar = (svg, { x, baseline, valueY, width, className, fill, tooltip }) =>
    rect(svg, x, Math.min(baseline, valueY), width, Math.abs(baseline - valueY), className, fill, tooltip);
  const drawYAxis = (svg, { left, right, top, height, min, max, ticks, format, gridClass = "chart-grid-line", zeroClass = "chart-zero-line" }) => {
    const y = (value) => scaleY(value, min, max, top, height);
    for (const tick of ticks) {
      const isZero = Math.abs(tick) < 1e-9;
      line(svg, left, y(tick), right, y(tick), isZero ? zeroClass : gridClass);
      text(svg, format(tick), left - 11, y(tick) + 5, "chart-axis-tick", "end");
    }
    return y;
  };
  const niceStep = (value, targetTicks = 4) => {
    if (!(value > 0)) return 0.25;
    const rough = value / targetTicks;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const scaled = rough / magnitude;
    return (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10) * magnitude;
  };
  const niceMax = (value, targetTicks = 4) => {
    const step = niceStep(value, targetTicks);
    return value > 0 ? Math.ceil(value / step) * step : 1;
  };
  const niceTicks = (value, targetTicks = 4) => {
    const step = niceStep(value, targetTicks), max = niceMax(value, targetTicks);
    return Array.from({ length: Math.round(max / step) + 1 }, (_, index) => Number((index * step).toPrecision(10)));
  };
  const categoryTitle = (node, value) => {
    const title = document.createElementNS(NS, "title"); title.textContent = value; node.append(title); return node;
  };
  const drawLinearIndicator = (host, { value, min = 0, max = 400, label, format = (item) => String(item), classPrefix = "score" }) => {
    host.replaceChildren();
    const width = 720, height = 112, left = 24, right = width - 24, y = 54;
    const svg = makeSvg(host, width, height, `${classPrefix}-scale-svg`, `${label}: ${format(value)} on a ${format(min)} to ${format(max)} scale`);
    text(svg, label, left, 18, `${classPrefix}-scale-title`, "start");
    line(svg, left, y, right, y, `${classPrefix}-scale-track`);
    const position = (item) => left + ((item - min) / (max - min)) * (right - left);
    [min, min + (max - min) / 4, min + (max - min) / 2, min + (max - min) * 3 / 4, max].forEach((tick) => {
      const x = position(tick);
      line(svg, x, y - 7, x, y + 7, `${classPrefix}-scale-tick`);
      text(svg, format(tick), x, 83, `${classPrefix}-scale-label`);
    });
    const markerX = position(Math.max(min, Math.min(max, value)));
    line(svg, markerX, y - 17, markerX, y + 17, `${classPrefix}-scale-marker`);
    text(svg, format(value), Math.max(left + 25, Math.min(right - 25, markerX)), 42, `${classPrefix}-scale-value`);
    return svg;
  };
  window.AMSSCharts = { makeSvg, scaleY, scaleX, text, line, rect, circle, verticalBar, drawYAxis, niceMax, niceStep, niceTicks, categoryTitle, drawLinearIndicator };
})();
