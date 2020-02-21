import React, { Component } from 'react';
import Grid from '@material-ui/core/Grid';
import { withApollo } from 'react-apollo';
import {
	MuiPickersUtilsProvider,
	KeyboardDatePicker,
} from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import gql from 'graphql-tag';
import { Bar } from 'react-chartjs-2';
import { get } from 'lodash';
import moment from 'moment';
import Loading from '../components/Loading';

const apiKey = process.env.REACT_APP_API_KEY;
const browsersQuery = (fromDate, toDate) => gql`
  {
    project(projectId: ${apiKey}) {
      projectData(
		start: "${fromDate}",
		end: "${toDate}",
        groupBy: BROWSER,
        browser: [CHROME, FIREFOX, IE, EDGE,SAFARI, OTHER]
      ) { 
        resources {
          browser,
          errors {
            connect {
			  attempts
              failures
            },
            publish {
			  attempts
              failures
            },
            subscribe {
			  attempts
              failures
            }
          }
        }
      }
    }
  }
`;


class FailuresByBrowser extends Component {
	constructor(props) {
		super(props);
		this.state = {
			fromDate: moment().subtract(10, 'days'),
			toDate: moment(),
			browsersChartData: [],
			loading: true,
		}
	}

	handleFromDateChange = date => {
		const { toDate } = this.state;
		this.setState({ fromDate: date, loading: true });
		this.updateChartsResult(date, toDate);
	};

	handleToDateChange = date => {
		const { fromDate } = this.state;
		this.setState({ toDate: date, loading: true });
		this.updateChartsResult(fromDate, date);
	};

	getBrowsersResult = async (from, to) => {
		const query = { query: browsersQuery(from.toISOString(), to.toISOString()) };
		const results = await this.props.client.query(query);
		return get(results.data, 'project.projectData.resources', []);
	}

	updateChartsResult = async (fromDate, toDate) => {
		const browsersChartData = await this.getBrowsersResult(fromDate, toDate);
		this.setState({
			browsersChartData,
			loading: false
		});
	}

	async componentDidMount() {
		const { fromDate, toDate } = this.state;
		this.updateChartsResult(fromDate, toDate);
	}

	render() {
		const { fromDate, toDate, browsersChartData, loading } = this.state;
		if (loading) return <Loading />;
		const barChartOptions = {
			legend: {
				display: false,
			},
			scales: {
				xAxes: [{ stacked: true }], yAxes: [{ stacked: true }],
			}
		};
		return (
			<>
				<MuiPickersUtilsProvider utils={MomentUtils}>
					<Grid container justify="space-around">
						<KeyboardDatePicker
							value={fromDate} onChange={this.handleFromDateChange}
							disableFuture={true}
							disableToolbar
							variant="inline"
							margin="normal"
							label="From date"
							KeyboardButtonProps={{
								'aria-label': 'change date',
							}}
						/>
						<KeyboardDatePicker
							disableFuture={true}
							disableToolbar
							variant="inline"
							margin="normal"
							id="date-picker-inline"
							label="To date"
							value={toDate}
							onChange={this.handleToDateChange}
							KeyboardButtonProps={{
								'aria-label': 'change date',
							}}
						/>
					</Grid>
				</MuiPickersUtilsProvider>
				<Bar data={{
					labels: browsersChartData.map(item => item.browser),
					datasets: [
						{
							label: 'Connect Attempts',
							backgroundColor: '#224870',
							data: browsersChartData.map(item => get(item, 'errors.connect.attempts', 0)),
							stack: '1'
						},
						{
							label: 'Connect Failures',
							backgroundColor: '#F25F5C',
							data: browsersChartData.map(item => get(item, 'errors.connect.failures', 0)),
							stack: '1'
						},
						{
							label: 'Publish Attempts',
							backgroundColor: '#44CFCB',
							data: browsersChartData.map(item => get(item, 'errors.publish.attempts', 0)),
							stack: '2'
						},
						{
							label: 'Publish Failures',
							backgroundColor: '#F25F5C',
							data: browsersChartData.map(item => get(item, 'errors.publish.failures', 0)),
							stack: '2'
						},
						{
							label: 'Subscribe Attempts',
							backgroundColor: '#247BA0',
							data: browsersChartData.map(item => get(item, 'errors.subscribe.attempts', 0)),
							stack: '3'
						},
						{
							label: 'Subscribe Failures',
							backgroundColor: '#F25F5C',
							data: browsersChartData.map(item => get(item, 'errors.subscribe.failures', 0)),
							stack: '3'
						}
					],
				}}
					options={barChartOptions}
				/>
			</>
		);
	}
}

export default withApollo(FailuresByBrowser);
