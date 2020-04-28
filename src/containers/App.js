import React from 'react';
import Container from 'react-bootstrap/Container';

// Local imports
import Header from './Header';
import LineChart from '../components/LineChart';

// CSS
import './App.scss';

class App extends React.Component {

  componentDidMount() {
    fetch('http://localhost:3000/covid_cases/summed_daily_counts')
    .then(res => res.json())
    .then((data) => {
      //console.log(data);
      this.setState({chartData: data});
    })
    .catch(console.log)
  };

  render() {
    return (
      <div>
        <Header>
        </Header>
        <Container>
          {this.state && this.state.chartData && (
            <LineChart data={this.state.chartData}></LineChart>
          )}
        </Container>
      </div>
    );
  };
}

export default App;
