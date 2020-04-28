import React from 'react';
import PropTypes from 'prop-types';
import './LineChart.css';
import {default as d3LineChart} from "../d3_charts/LineChart";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

function debounce(fn, ms) {
  let timer
  return _ => {
    clearTimeout(timer)
    timer = setTimeout(_ => {
      timer = null
      fn.apply(this, arguments)
    }, ms)
  };
}

class LineChart extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};
    this.datesChanged = this.datesChanged.bind(this);

    var me = this;
    this.debouncedHandleResize = debounce(function handleResize() {
      d3LineChart.updateWidth(me.refs["chartRef"]);
    }, 200);
  }

  datesChanged(newStartDate, newEndDate) {
    this.setState({startDate: newStartDate, endDate: newEndDate});
  }

  componentDidMount() {
    window.addEventListener('resize', this.debouncedHandleResize)

    d3LineChart.create(this.refs["chartRef"], {
      width: '100%',
      dateChangeFunc: this.datesChanged
    }, this.getChartState());
  };

  componentDidUpdate() {
    // d3LineChart.update(this.refs["chartRef"], this.getChartState());
  };

  getChartState() {
    return {
      data: this.props.data
    };
  };

  componentWillUnmount() {
    window.removeEventListener('resize', this.debouncedHandleResize)
    d3LineChart.destroy(this.refs["chartRef"]);
  };

  render() {
    return (
      <div className="space-top space-bottom">
        <h3 className="text-center">Total number of cases</h3>
        <div ref="chartRef" className="d3-chart"></div>
        <div className="lower-info">
          <div className="space-bottom">
            <span className="info-text"><FontAwesomeIcon icon={faInfoCircle} size="lg" className="quarter-space-right" /> Click and drag on the lower chart to zoom into an area of the upper chart</span>
          </div>
          <div>
            <span>Current date range: <strong>{this.state.startDate?.toLocaleDateString("en-US")} - {this.state.endDate?.toLocaleDateString("en-US")}</strong></span>
          </div>
        </div>
      </div>
    );
  };
}

LineChart.propTypes = {
  data: PropTypes.array
};

export default LineChart;