import React, { Component } from 'react';
import gql from 'graphql-tag';
import { withApollo } from 'react-apollo';
import Grid from '@material-ui/core/Grid';
import { Line } from 'react-chartjs-2';
import {
	MuiPickersUtilsProvider,
	KeyboardDatePicker,
} from '@material-ui/pickers';
import { get } from 'lodash';
import moment from 'moment';
import Loading from '../components/Loading';
import MomentUtils from '@date-io/moment';

const apiKey = process.env.REACT_APP_API_KEY;

const usageQuery = (fromDate, toDate) => gql`
  {
    project(projectId: ${apiKey}) {
      projectData(
        start: "${fromDate}",
		end: "${toDate}",
        interval: DAILY
      ) { 
        resources {
          intervalStart,
          intervalEnd,
          usage {
            streamedPublishedMinutes,
            streamedSubscribedMinutes
          }
        }
      }
    }
  }
`;

class UsageByDay extends Component {
	constructor(props) {
		super(props);
		this.state = {
			fromDate: moment().subtract(10, 'days'),
			toDate: moment(),
			loading: true,
			usageData: []
		}
	}

	getUsageByDayResult = async (from, to) => {
		const query = { query: usageQuery(from.toISOString(), to.toISOString()) };
		const results = await this.props.client.query(query);
		return get(results.data, 'project.projectData.resources', []);
	}

	handleFromDateChange = date => {
		const { toDate } = this.state;
		this.setState({ fromDate: date, loading: true });
		this.updateUsageResult(date, toDate);
	};

	handleToDateChange = date => {
		const { fromDate } = this.state;
		this.setState({ toDate: date, loading: true });
		this.updateUsageResult(fromDate, date);
	};

	updateUsageResult = async (fromDate, toDate) => {
		const usageData = await this.getUsageByDayResult(fromDate, toDate);
		this.setState({
			usageData,
			loading: false
		});
	}

	componentDidMount(){
		const { fromDate, toDate } = this.state;
		this.updateUsageResult(fromDate, toDate);
	}

	render() {
		const { loading, fromDate, toDate, usageData } = this.state;
		if (loading) return <Loading />;
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
				<Line data={{
							labels: usageData.map(item => moment(item.intervalStart).format('MMM DD')),
							datasets: [
								{
									label: 'Streamed Published Minutes',
									backgroundColor: 'rgba(75,192,192,0.4)',
									data: usageData.map(item => get(item, 'usage.streamedPublishedMinutes', 0)),
								},
								{
									label: 'Streamed Subscribed Minutes',
									backgroundColor: 'rgba(75,75,192,0.4)',
									data: usageData.map(item => get(item, 'usage.streamedSubscribedMinutes', 0)),
								},
							],
						}} />
			</>
		);
	}
}

export default withApollo(UsageByDay);

/* <Query query={query}>
				{({ loading, error, data }) => {
					if (loading) return <Loading />;
					if (error) return <ErrorMessage error={error.message} />;
					const resources = get(data, 'project.projectData.resources', []);
					return (
						<Line data={{
							labels: resources.map(item => moment(item.intervalStart).format('MMM DD')),
							datasets: [
								{
									label: 'Streamed Published Minutes',
									backgroundColor: 'rgba(75,192,192,0.4)',
									data: resources.map(item => get(item, 'usage.streamedPublishedMinutes', 0)),
								},
								{
									label: 'Streamed Subscribed Minutes',
									backgroundColor: 'rgba(75,75,192,0.4)',
									data: resources.map(item => get(item, 'usage.streamedSubscribedMinutes', 0)),
								},
							],
						}} />
					);
				}}
			</Query> */