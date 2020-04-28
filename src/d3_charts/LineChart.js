import * as d3 from "d3";
import { timeMonth, timeWeek, timeDay } from 'd3-time';
import './LineChart.scss';

var d3Chart = {};

// store constants here
d3Chart.constants = {
  margins: {
    top: 50,
    right: 40,
    left: 80,
    bottom: 40
  },
  yAxisTextPadding: 30,
  xAxisTextPadding: 40,
  mainChartHeight: 400,
  mainToBrushPadding: 60,
  brushChartHeight: 150
};

// store some state variables for use across file
d3Chart.vars = {
  props: {},
  scales: {},
  dates: {
    today: null,
    twoWeeksAgo: null,
    dateStart: null,
    dateEnd: null
  },
  wrappers: {
    svg: null, // outer svg element
    chartWrapper: null, // wrapper around everything --- svg -> chartWrapper -> [EVERYTHING ELSE]
    xAxis: null,
    yAxis: null,
    xAxisLabel: null,
    yAxisLabel: null,
    yGridLines: null,
    twoWeekRectWrapper: null,
    mainPlot: null,
    zoomSelection: null,
    brushChart: null,
    brushChartXAxis: null,
    brushChartYAxis: null,
    brushChartPlot: null
  },
  data: null,
  filteredData: null,
  element: null,
  brushChart: null,
  defaultXTicks: null,
  brushSet: false
};

/** Public methods, callable from react components **/

/**
  Called to create the inital chart. It only appends all the wrapper groups,
  before calling internal drawInitial function
**/
d3Chart.create = function(el, props, state) {
  d3Chart._doInitialSetup(el, props);
  this._drawInitial(el, state);
};

/** 
  Called when the window width is updated. Be sure to debounce the call!
**/
d3Chart.updateWidth = function(el) {
  d3Chart._updateInternal(true);
}

/**
 Destroy the chart and do any cleanup if needed
**/
d3Chart.destroy = function(el) {
  // TODO
};

/** ----------------------------------------------------------------------- **/
/** Private methods (prefixed by _) **/

d3Chart._doInitialSetup = function(el, props) {
  d3Chart.vars.element = el;
  d3Chart.vars.props = props;

  d3Chart.vars.wrappers.svg = d3.select(el).append('svg')
    .attr('class', 'd3')
    .attr('width', props.width)
    .attr('height', d3Chart.constants.mainChartHeight + d3Chart.constants.brushChartHeight);

  d3Chart.vars.wrappers.chartWrapper = d3Chart.vars.wrappers.svg.append('g')
      .attr('class', 'chart-wrapper')
      .attr("transform", "translate(" + d3Chart.constants.margins.left + "," + d3Chart.constants.margins.right + ")");

  d3Chart.vars.wrappers.xAxis = d3Chart.vars.wrappers.chartWrapper.append('g')
    .attr('class', 'x-axis');

  d3Chart.vars.wrappers.yAxis = d3Chart.vars.wrappers.chartWrapper.append('g')
    .attr('class', 'y-axis');

  d3Chart.vars.wrappers.xAxisLabel = d3Chart.vars.wrappers.chartWrapper.append('g')
    .attr('class', 'x-axis-label');

  d3Chart.vars.wrappers.yAxisLabel = d3Chart.vars.wrappers.chartWrapper.append('g')
    .attr('class', 'y-axis-label');

  d3Chart.vars.wrappers.yGridLines = d3Chart.vars.wrappers.chartWrapper.append('g')
    .attr('class', 'y-gridlines');

  d3Chart.vars.wrappers.twoWeekRectWrapper = d3Chart.vars.wrappers.chartWrapper.append("g")
    .attr("class", "two-week-rect-wrapper");

  d3Chart.vars.wrappers.mainPlot = d3Chart.vars.wrappers.chartWrapper.append('g')
    .attr('class', 'main-plot');

  d3Chart.vars.wrappers.zoomSelection = d3Chart.vars.wrappers.chartWrapper.append('g')
    .attr('class', 'zoom-selection');

  d3Chart.vars.wrappers.brushChart = d3Chart.vars.wrappers.chartWrapper.append('g')
    .attr('class', 'brush-chart');

  d3Chart.vars.wrappers.brushChartXAxis = d3Chart.vars.wrappers.brushChart.append("g")
    .attr("class", "brush-x-axis");

  d3Chart.vars.wrappers.brushChartYAxis = d3Chart.vars.wrappers.brushChart.append("g")
    .attr("class", "brush-y-axis");

  d3Chart.vars.wrappers.brushPlot = d3Chart.vars.wrappers.brushChart.append("g")
    .attr("class", "brush-plot");
};

/**
  This function is only called once, when the chart is first drawn
**/
d3Chart._drawChart = function(el, data, dimensions) {
  this._drawScales(el, data, dimensions);

  var defs = d3Chart.vars.wrappers.svg.append("defs");

  defs.append("svg:clipPath")
    .attr("id", "clip-outside")
    .append("svg:rect")
    .attr("class", "clip-outside-rect")
    .attr("width", dimensions.width )
    .attr("height", dimensions.height + 4 )
    .attr("x", 0)
    .attr("y", -2);

  defs.append("svg:clipPath")
    .attr("id", "brush-clip-outside")
    .append("svg:rect")
    .attr("class", "brush-clip-outside-rect")
    .attr("width", dimensions.width )
    .attr("height", d3Chart.constants.brushChartHeight + 4 )
    .attr("x", 0)
    .attr("y", dimensions.height + d3Chart.constants.mainToBrushPadding - 2);

  var mainLine = d3Chart.vars.wrappers.mainPlot.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("class", "main-trendline")
    .attr("stroke", "#ad0534")
    .attr("stroke-width", 3)
    .attr("d", d3.line()
      .x(function(d) { return d3Chart.vars.scales.x(d3.timeParse("%Y-%m-%d")(d.date)) })
      .y(function(d) { return d3Chart.vars.scales.y(d.count) })
    )
    .attr("clip-path", "url(#clip-outside)");
  
  var brushLine = d3Chart.vars.wrappers.brushPlot.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("class", "brush-trendline")
    .attr("stroke", "#ad0534")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .x(function(d) { return d3Chart.vars.scales.xBrush(d3.timeParse("%Y-%m-%d")(d.date)) })
      .y(function(d) { return d3Chart.vars.scales.yBrush(d.count) })
    )
    .attr("clip-path", "url(#brush-clip-outside)");

  d3Chart.vars.wrappers.brushPlot
    .append("g")
    .attr("class", "brush")
    .call(d3Chart.vars.brush);

  var lineLength = mainLine.node().getTotalLength();

  mainLine
    .attr("stroke-dasharray", lineLength + " " + lineLength)
    .attr("stroke-dashoffset", lineLength)
    .transition()
      .duration(1000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

  brushLine
    .attr("stroke-dasharray", lineLength + " " + lineLength)
    .attr("stroke-dashoffset", lineLength)
    .transition()
      .duration(1000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

  var newDateStart = d3Chart.vars.scales.xBrush.domain()[0];
  var newDateEnd = d3Chart.vars.scales.xBrush.domain()[d3Chart.vars.scales.xBrush.domain().length-1];

  d3Chart.vars.dates.dateStart = newDateStart;
  d3Chart.vars.dates.dateEnd = newDateEnd;

  d3Chart.vars.props.dateChangeFunc(d3Chart.vars.dates.dateStart, d3Chart.vars.dates.dateEnd);

  d3Chart.vars.dates.today = Date.now();
  d3Chart.vars.dates.twoWeeksAgo = new Date(d3Chart.vars.dates.today - 1209600000); // magic number 2 weeks in ms
  
  var xPosTwoWeeksAgo = d3Chart.vars.scales.x(d3Chart.vars.dates.twoWeeksAgo);
  var xPosToday = d3Chart.vars.scales.x(d3Chart.vars.dates.today);

  d3Chart.vars.wrappers.twoWeekRectWrapper
    .append("rect")
    .attr("class", 'two-week-rect')
    .attr("x", xPosTwoWeeksAgo)
    .attr("y", 0)
    .attr("width", xPosToday - xPosTwoWeeksAgo)
    .attr("height", dimensions.height)
    .attr("stroke", "#ff9898")
    .attr("stroke-width", 1)
    .attr("fill", "#ff9898")
    .attr("fill-opacity", 0.5)
    .attr("clip-path", "url(#clip-outside)");

};

/** Wrapper function to do the inital draw **/
d3Chart._drawInitial = function(el, state) {
  d3Chart.vars.data = state.data;
  d3Chart.vars.filteredData = state.data;
  var dimensions = d3Chart._getWidthAndHeight();

  this._scales(el, state.data, dimensions);
  this._drawChart(el, state.data, dimensions);
};

d3Chart._makeYGridlines = function() {
  return d3.axisLeft(d3Chart.vars.scales.y)
};

d3Chart._calcDateDifference = function(dateStart, dateEnd) {
  var dateDifference = dateEnd.getTime() - dateStart.getTime(); 
  return dateDifference / (1000 * 3600 * 24); 
};

d3Chart._numXTicks = function(dateDifferenceDays) {
  if (dateDifferenceDays > 90) {
    return timeMonth.every(1);
  }
  else if (dateDifferenceDays > 21) {
    return timeWeek.every(1);
  }
  else if (dateDifferenceDays > 12) {
    return timeDay.every(2);
  }
  else {
    return timeDay.every(1);
  }
};

d3Chart._getWidthAndHeight = function() {
  var width = d3Chart.vars.element.offsetWidth - d3Chart.constants.margins.left - d3Chart.constants.margins.right;
  var height = d3Chart.constants.mainChartHeight - d3Chart.constants.margins.bottom - d3Chart.constants.margins.top;
  return {width: width, height: height}
}

d3Chart._updateInternal = function(widthChanged = false) {
  var dimensions = d3Chart._getWidthAndHeight();

  d3Chart.vars.wrappers.svg.select("#clip-outside")
    .transition()
    .duration(1000)
    .select(".clip-outside-rect")
    .attr("width", dimensions.width )

    d3Chart.vars.wrappers.svg.select("#brush-clip-outside")
      .transition()
      .duration(1000)
      .select(".brush-clip-outside-rect")
      .attr("width", dimensions.width )

  // redefine x scale range & domain
  d3Chart.vars.scales.x.range([0, dimensions.width]);
  d3Chart.vars.scales.x.domain([d3Chart.vars.dates.dateStart, d3Chart.vars.dates.dateEnd]);

  // redefine y scale domain
  d3Chart.vars.scales.y.domain([0, d3.max(d3Chart.vars.filteredData, function(d) { return d.count })]);

  // redefine the x range for the brush chart
  d3Chart.vars.scales.xBrush.range([0, dimensions.width]);

  // resize the selected rect if it is set
  var brush = d3Chart.vars.wrappers.brushPlot
    .select(".brush")

  var selectedRect = brush
    .select(".selection")

  if (selectedRect.attr("width") > 0) {
    selectedRect
      .transition()
      .duration(1000)
      .attr("x", d3Chart.vars.scales.xBrush(d3Chart.vars.dates.dateStart))
      .attr("width", d3Chart.vars.scales.xBrush(d3Chart.vars.dates.dateEnd) - d3Chart.vars.scales.xBrush(d3Chart.vars.dates.dateStart))
      .on("end", function() {
        var newExtent = [[0,dimensions.height + d3Chart.constants.mainToBrushPadding-5], [dimensions.width,dimensions.height + d3Chart.constants.mainToBrushPadding + d3Chart.constants.brushChartHeight - d3Chart.constants.margins.bottom+5] ];

        brush.call(d3Chart.vars.brush.extent(newExtent));

        d3Chart.vars.brush.move( brush, [
          d3Chart.vars.scales.xBrush(d3Chart.vars.dates.dateStart),
          d3Chart.vars.scales.xBrush(d3Chart.vars.dates.dateEnd)
        ]);
      });
    }

  // Figure out best xTicks value to use
  var dateDifferenceDays = d3Chart._calcDateDifference(d3Chart.vars.dates.dateStart, d3Chart.vars.dates.dateEnd);
  var xTicks = d3Chart._numXTicks(dateDifferenceDays);

  // redraw the x axis
  d3Chart.vars.wrappers.xAxis
    .transition()
    .duration(1000)
    .call(d3.axisBottom(d3Chart.vars.scales.x).ticks(xTicks));

  // redraw the y axis
  d3Chart.vars.wrappers.yAxis
    .transition()
    .duration(1000)
    .call(d3.axisLeft(d3Chart.vars.scales.y));

  // redraw the x axis on the brush
  d3Chart.vars.wrappers.brushChartXAxis
    .transition()
    .duration(1000)
    .call(d3.axisBottom(d3Chart.vars.scales.xBrush).ticks(d3Chart.vars.defaultXTicks));

  // Update the y gridlines
  d3Chart.vars.wrappers.yGridLines
    .transition()
    .duration(1000)
    .call(d3Chart._makeYGridlines()
      .tickSize(-dimensions.width)
      .tickFormat("")
     )

  // redraw the trendline
  d3Chart.vars.wrappers.mainPlot
    .select(".main-trendline")
    .attr("stroke-dasharray", null)
    .transition()
    .duration(1000)
    .attr("d", d3.line()
      .x(function(d) { return d3Chart.vars.scales.x(d3.timeParse("%Y-%m-%d")(d.date)) })
      .y(function(d) { return d3Chart.vars.scales.y(d.count) })
    )
    .attr("clip-path", "url(#clip-outside)");

  // redraw the brush trendline
  d3Chart.vars.wrappers.brushPlot
    .select(".brush-trendline")
    .attr("stroke-dasharray", null)
    .transition()
    .duration(1000)
    .attr("d", d3.line()
      .x(function(d) { return d3Chart.vars.scales.xBrush(d3.timeParse("%Y-%m-%d")(d.date)) })
      .y(function(d) { return d3Chart.vars.scales.yBrush(d.count) })
    )
    .attr("clip-path", "url(#brush-clip-outside)");

  // resize the two week rect
  var xPosTwoWeeksAgo = d3Chart.vars.scales.x(d3Chart.vars.dates.twoWeeksAgo);
  var xPosToday = d3Chart.vars.scales.x(d3Chart.vars.dates.today);

  d3Chart.vars.wrappers.twoWeekRectWrapper
    .select(".two-week-rect")
    .transition()
    .duration(1000)
    .attr("x", xPosTwoWeeksAgo)
    .attr("width", xPosToday - xPosTwoWeeksAgo);

  if (widthChanged) {
    //move the x axis label if width changed
    d3Chart.vars.wrappers.xAxisLabel
      .select("text")
      .transition()
      .duration(1000)
      .attr("x", ((d3Chart.vars.element.offsetWidth - d3Chart.constants.margins.left - d3Chart.constants.margins.right) / 2))
  }
};

d3Chart._sameDay = function(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

d3Chart._updateChartAfterBrush = function() {
  var newDateStart = null;
  var newDateEnd = null;
  if (d3.event.selection) {
    d3Chart.vars.brushSet = true;
    var extent = d3.event.selection;

    newDateStart = d3Chart.vars.scales.xBrush.invert(extent[0]);
    newDateEnd = d3Chart.vars.scales.xBrush.invert(extent[1]);

    if (!d3Chart._sameDay(d3Chart.vars.dates.dateStart, newDateStart) || !d3Chart._sameDay(d3Chart.vars.dates.dateEnd, newDateEnd)) {
      var filteredValues = d3Chart.vars.data.filter(function(dataPoint) {
        var dataPointDate = d3.timeParse("%Y-%m-%d")(dataPoint.date);
        return dataPointDate >= newDateStart && dataPointDate <= newDateEnd;
      });

      d3Chart.vars.filteredData = filteredValues;
      d3Chart.vars.dates.dateStart = newDateStart;
      d3Chart.vars.dates.dateEnd = newDateEnd;

      d3Chart.vars.props.dateChangeFunc(d3Chart.vars.dates.dateStart, d3Chart.vars.dates.dateEnd);

      // now do the redraw, same as we would do for resizing
      d3Chart._updateInternal();
    }
  }
  else if (d3Chart.vars.brushSet) {
    d3Chart.vars.brushSet = false;
    d3Chart.vars.wrappers.brushChart
      .select(".brush-plot")
      .select(".brush")
      .call(d3Chart.vars.brush.move, null);

    newDateStart = d3Chart.vars.scales.xBrush.domain()[0];
    newDateEnd = d3Chart.vars.scales.xBrush.domain()[d3Chart.vars.scales.xBrush.domain().length-1];

    d3Chart.vars.filteredData = d3Chart.vars.data;
    d3Chart.vars.dates.dateStart = newDateStart;
    d3Chart.vars.dates.dateEnd = newDateEnd;

    d3Chart.vars.props.dateChangeFunc(d3Chart.vars.dates.dateStart, d3Chart.vars.dates.dateEnd);
    
    d3Chart._updateInternal();
  }
};

d3Chart._scales = function(el, data, dimensions) {
  if (!data) {
    return null;
  }

  var x = d3.scaleTime()
    .range([0, dimensions.width])
    .domain([d3.min(data, function(d) { return d3.timeParse("%Y-%m-%d")(d.date); }), Date.now()]);

  var y = d3.scaleLinear()
    .range([dimensions.height, 0])
    .domain([0, d3.max(data, function(d) { return d.count; })]);

  var xBrush = d3.scaleTime()
    .range([0, dimensions.width])
    .domain([d3.min(data, function(d) { return d3.timeParse("%Y-%m-%d")(d.date); }), Date.now()]);

  var yBrush = d3.scaleLinear()
    .range([dimensions.height + d3Chart.constants.mainToBrushPadding + (d3Chart.constants.brushChartHeight - d3Chart.constants.margins.bottom), dimensions.height + d3Chart.constants.mainToBrushPadding])
    .domain([0, d3.max(data, function(d) { return d.count; })]);

  d3Chart.vars.scales = {x: x, y: y, xBrush: xBrush, yBrush: yBrush};
};

d3Chart._drawScales = function(el, data, dimensions) {
  d3Chart.vars.dates.dateStart  = d3.min(d3Chart.vars.filteredData, function(d) { return d3.timeParse("%Y-%m-%d")(d.date) });
  d3Chart.vars.dates.dateEnd = d3.max(d3Chart.vars.filteredData, function(d) { return d3.timeParse("%Y-%m-%d")(d.date) });

  var dateDifferenceDays = d3Chart._calcDateDifference(d3Chart.vars.dates.dateStart, d3Chart.vars.dates.dateEnd);
  var xTicks = d3Chart._numXTicks(dateDifferenceDays);
  d3Chart.vars.defaultXTicks = xTicks;

  d3Chart.vars.wrappers.xAxis
    .attr("transform", "translate(0," + dimensions.height + ")")
    .call(d3.axisBottom(d3Chart.vars.scales.x).ticks(d3Chart.vars.defaultXTicks));

  d3Chart.vars.wrappers.yAxis
    .call(d3.axisLeft(d3Chart.vars.scales.y));

  d3Chart.vars.wrappers.brushChartXAxis
    .attr("transform", "translate(0," + (dimensions.height + d3Chart.constants.mainToBrushPadding + (d3Chart.constants.brushChartHeight - d3Chart.constants.margins.bottom)) + ")")
    .call(d3.axisBottom(d3Chart.vars.scales.xBrush).ticks(d3Chart.vars.defaultXTicks));

  d3Chart.vars.wrappers.brushChartYAxis
    .call(d3.axisLeft(d3Chart.vars.scales.yBrush).ticks(5));

  d3Chart.vars.wrappers.yGridLines
    .attr("transform","translate(0,0)")
    .style("stroke-dasharray",("3,3"))
    .call(d3Chart._makeYGridlines()
      .tickSize(-dimensions.width)
      .tickFormat("")
    )

  d3Chart.vars.wrappers.yAxisLabel
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -dimensions.height/2)
    .attr("y", -d3Chart.constants.margins.left + d3Chart.constants.yAxisTextPadding)
    .attr("stroke-width", 0.5)
    .attr("class", "axis-label")
    .style("text-anchor", "middle")
    .text("Number of cases");

  d3Chart.vars.wrappers.xAxisLabel
    .append("text")
    .attr("x", ((el.offsetWidth - d3Chart.constants.margins.left - d3Chart.constants.margins.right) / 2))
    .attr("y", dimensions.height + d3Chart.constants.xAxisTextPadding)
    .attr("stroke-width", 0.5)
    .style("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Date");

  d3Chart.vars.brush = d3.brushX()
    .extent( [ [0,dimensions.height + d3Chart.constants.mainToBrushPadding - 5], [dimensions.width,dimensions.height + d3Chart.constants.mainToBrushPadding + d3Chart.constants.brushChartHeight - d3Chart.constants.margins.bottom + 5] ] )
    .on("end", d3Chart._updateChartAfterBrush)
}

export default d3Chart;