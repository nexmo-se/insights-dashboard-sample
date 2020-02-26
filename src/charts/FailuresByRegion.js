import React, { Component } from 'react';
import Grid from '@material-ui/core/Grid';
import { withApollo } from 'react-apollo';
import {
	MuiPickersUtilsProvider,
	KeyboardDatePicker,
} from '@material-ui/pickers';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MomentUtils from '@date-io/moment';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import gql from 'graphql-tag';
import { Bar } from 'react-chartjs-2';
import { get } from 'lodash';
import moment from 'moment';
import Loading from '../components/Loading';

const apiKey = process.env.REACT_APP_API_KEY;
const countries = ['SA', 'EG', 'US', 'IN', 'GB'];

const browsersQuery = (fromDate, toDate) => gql`
  {
    project(projectId: ${apiKey}) {
      projectData(
		start: "${fromDate}",
		end: "${toDate}",
        groupBy: [COUNTRY],
        country: [SA, EG, US, IN, GB]
      ) { 
        resources {
          country,
          errors {
            connect {
              failures
            },
            publish {
              failures
            },
            subscribe {
              failures
            }
          }
        }
      }
    }
  }
`;

const browsersRegionQuery = (fromDate, toDate, country) => gql`
  {
    project(projectId: ${apiKey}) {
      projectData(
		start: "${fromDate}",
		end: "${toDate}",
        groupBy: [COUNTRY, BROWSER]
		browser: [CHROME, FIREFOX, IE, EDGE,SAFARI, OTHER],
		country: ${country}
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


class FailuresByRegion extends Component {
	constructor(props) {
		super(props);
		this.state = {
			fromDate: moment().subtract(10, 'days'),
			toDate: moment(),
			regionsChartData: [],
			loading: true,
			countries: [],
			currentCountry: 'None'
		}
	}

	handleFromDateChange = date => {
		const { toDate, currentCountry } = this.state;
		this.setState({ fromDate: date, loading: true });
		this.updateChartsResult(date, toDate, currentCountry);
	};

	handleToDateChange = date => {
		const { fromDate, currentCountry } = this.state;
		this.setState({ toDate: date, loading: true });
		this.updateChartsResult(fromDate, date, currentCountry);
	};

	handleOnChangeCountry = event => {
		const { fromDate, toDate } = this.state;
		const country = event.target.value;
		console.log('handleOnChangeCountry', event.target.value)
		this.updateChartsResult(fromDate, toDate, country);
		this.setState({ loading: true, currentCountry: country });

	};

	getBrowsersResult = async (from, to) => {
		const query = { query: browsersQuery(from.toISOString(), to.toISOString()) };
		const results = await this.props.client.query(query);
		return get(results.data, 'project.projectData.resources', []);
	}

	getBrowsersRegionResult = async (from, to, country) => {
		const query = { query: browsersRegionQuery(from.toISOString(), to.toISOString(), country) };
		const results = await this.props.client.query(query);
		return get(results.data, 'project.projectData.resources', []);
	}

	updateChartsResult = async (fromDate, toDate, country) => {
		let regionsChartData = null;
		if (country === 'None') {
			regionsChartData = await this.getBrowsersResult(fromDate, toDate);
		} else {
			regionsChartData = await this.getBrowsersRegionResult(fromDate, toDate, country);
		}
		this.setState({
			regionsChartData,
			loading: false,
		});
	}

	async componentDidMount() {
		const { fromDate, toDate, currentCountry } = this.state;
		this.updateChartsResult(fromDate, toDate, currentCountry);
	}

	render() {
		const { fromDate, toDate, regionsChartData, loading, currentCountry } = this.state;
		if (loading) return <Loading />;
		const barChartOptions = {
			legend: {
				display: false,
			},
			scales: {
				xAxes: [{ stacked: true }], yAxes: [{ stacked: true }],
			}
		};
		let labels = [];
		let datasets = [];
		if (currentCountry === 'None') {
			labels = regionsChartData.map(item => item.country);
			datasets = [{
				label: 'Connect Failures',
				backgroundColor: '#F25F5C',
				data: regionsChartData.map(item => get(item, 'errors.connect.failures', 0)),
				stack: '1'
			},
			{
				label: 'Publish Failures',
				backgroundColor: '#F25F5C',
				data: regionsChartData.map(item => get(item, 'errors.publish.failures', 0)),
				stack: '1'
			},
			{
				label: 'Subscribe Failures',
				backgroundColor: '#F25F5C',
				data: regionsChartData.map(item => get(item, 'errors.subscribe.failures', 0)),
				stack: '1'
			}];
		} else {
			labels = regionsChartData.map(item => item.browser);
			datasets = [
				{
					label: 'Connect Attempts',
					backgroundColor: '#224870',
					data: regionsChartData.map(item => get(item, 'errors.connect.attempts', 0)),
					stack: '1'
				},
				{
					label: 'Connect Failures',
					backgroundColor: '#F25F5C',
					data: regionsChartData.map(item => get(item, 'errors.connect.failures', 0)),
					stack: '1'
				},
				{
					label: 'Publish Attempts',
					backgroundColor: '#44CFCB',
					data: regionsChartData.map(item => get(item, 'errors.publish.attempts', 0)),
					stack: '2'
				},
				{
					label: 'Publish Failures',
					backgroundColor: '#F25F5C',
					data: regionsChartData.map(item => get(item, 'errors.publish.failures', 0)),
					stack: '2'
				},
				{
					label: 'Subscribe Attempts',
					backgroundColor: '#247BA0',
					data: regionsChartData.map(item => get(item, 'errors.subscribe.attempts', 0)),
					stack: '3'
				},
				{
					label: 'Subscribe Failures',
					backgroundColor: '#F25F5C',
					data: regionsChartData.map(item => get(item, 'errors.subscribe.failures', 0)),
					stack: '3'
				}
			];
		}
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
				<FormControl>
					<InputLabel id="demo-simple-select-helper-label">Countries</InputLabel>
					<Select
						labelId="demo-simple-select-helper-label"
						id="demo-simple-select-helper"
						value={currentCountry}
						onChange={this.handleOnChangeCountry}
					>
						<MenuItem value="None">
							<em>None</em>
						</MenuItem>
						{countries.map(item =>
							<MenuItem value={item} key={item}>
								<em>{item}</em>
							</MenuItem>
						)}
					</Select>
				</FormControl>
				<Bar data={{
					/* labels: regionsChartData.map(item => item.country), */
					labels,
					datasets
					// Iterate over browsers label
					/* datasets: [
						{
							label: 'Connect Failures',
							backgroundColor: '#F25F5C',
							data: regionsChartData.map(item => get(item, 'errors.connect.failures', 0)),
							stack: '1'
						},
						{
							label: 'Publish Failures',
							backgroundColor: '#F25F5C',
							data: regionsChartData.map(item => get(item, 'errors.publish.failures', 0)),
							stack: '1'
						},
						{
							label: 'Subscribe Failures',
							backgroundColor: '#F25F5C',
							data: regionsChartData.map(item => get(item, 'errors.subscribe.failures', 0)),
							stack: '1'
						}
					], */
				}}
					options={barChartOptions}
				/>
			</>
		);
	}
}

export default withApollo(FailuresByRegion);
