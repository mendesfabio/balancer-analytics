import {useEffect} from "react";
import {CORE_POOLS_ARBITRUM, CORE_POOLS_MAINNET, CORE_POOLS_POLYGON} from "../../constants";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import {useActiveNetworkVersion} from "../../state/application/hooks";
import * as React from "react";
import {DateTime} from "luxon";
import {useBalancerPools} from "../../data/balancer/usePools";
import useAggregatedProtocolData from "../../data/balancer/useAggregatedProtocolData";
import useGetCollectedFeesSummary from "../../data/maxis/useGetCollectedFeesSummary";
import {getSnapshotFees, useBalancerPoolFeeSnapshotData} from "../../data/balancer/useBalancerPoolFeeSnapshotData";
import NavCrumbs, {NavElement} from '../../components/NavCrumbs';
import {EthereumNetworkInfo} from "../../constants/networks";
import Select, {SelectChangeEvent} from "@mui/material/Select";
import {Alert, Box, Card, CircularProgress, Divider, Grid, IconButton, Typography} from "@mui/material";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {DatePicker} from "@mui/x-date-pickers/DatePicker";
import {unixToDate} from "../../utils/date";
import TextField from "@mui/material/TextField";
import CustomLinearProgress from "../../components/Progress/CustomLinearProgress";
import {PoolFeeSnapshotData} from "../../data/balancer/balancerTypes";
import ProtocolFeeTable from "../../components/Tables/ProtocolFeeTable";
import useGetCorePoolCurrentFees from "../../data/maxis/useGetCorePoolCurrentFees";


import useGetBalancerV3StakingGauges from "../../data/balancer-api-v3/useGetBalancerV3StakingGauges";
import useGetGaugeShares from "../../data/balancer-gauges/useGetGaugeShares";
import useGetPoolUserBalances from "../../data/balancer/useGetPoolUserBalances";
import {useBlocksFromTimestamps} from "../../hooks/useBlocksFromTimestamps";
import CloseIcon from "@mui/icons-material/Close";

interface PoolsMapping {
    [key: string]: string[];
}

export default function ProtocolFees() {

    const POOLS: PoolsMapping = {
        MAINNET: CORE_POOLS_MAINNET,
        ARBITRUM: CORE_POOLS_ARBITRUM,
        POLYGON: CORE_POOLS_POLYGON,
    };

    //States
    dayjs.extend(quarterOfYear);
    const currentQuarter = dayjs().quarter();
    const [activeNetwork] = useActiveNetworkVersion()
    //const corePools = POOLS[activeNetwork.v3NetworkID]
    //const balPriceData = useCoinGeckoSimpleTokenPrices([activeNetwork.balAddress]);
    const [timeRange, setTimeRange] = React.useState('14');
    const [showDate, setShowDate] = React.useState(false);
    const [feesAlert, setFeesAlert] = React.useState(true);
    const feesAlertMessage = 'This view is using the Balancer subgraph as data source. User discretion is advised when consulting TVL metrics. Earned fee metrics are based on pool snapshots without calculating BPT TWAP.'

    //Poolsnapshots are taken OO:OO UTC.
    // Get the current UTC time
    const currentUTCTime = DateTime.utc();
    //const startTimestamp = Math.floor(currentUTCTime.startOf('day').toMillis() / 1000);

    // Get the UTC time for a week ago
    const weekAgoUTCTime = currentUTCTime.minus({ days: 7 });
    //const endTimeStamp = Math.floor(weekAgoUTCTime.startOf('day').toMillis() / 1000);


    const [startTimestamp, setStartTimestamp] = React.useState(Math.floor(DateTime.utc().minus({ minutes: 1 }).toMillis() / 1000));
    const [endTimeStamp, setEndTimeStamp] = React.useState(Math.floor(DateTime.utc().minus({ days: 14 }).startOf('day').toMillis() / 1000));
    //console.log("startTimestamp", startTimestamp)
    //Date States
    const [startDate, setStartDate] = React.useState(startTimestamp);
    const [endDate, setEndDate] = React.useState(endTimeStamp);
    //const poolsData = useBalancerPools(250, startDate, endDate).filter(pool => pool.poolType !== 'LiquidityBootstrapping');
    //const aggregatedProtocolData = useAggregatedProtocolData();
    //const collectedFees = useGetCollectedFeesSummary()

    //----Fee data---
    const [feeDelta, setFeeDelta] = React.useState<PoolFeeSnapshotData | undefined>();
    const corePools = useGetCorePoolCurrentFees();
    const currentFeeSnapshot = useBalancerPoolFeeSnapshotData(activeNetwork.clientUri, startTimestamp)
    console.log("currentFeeSnapshot", currentFeeSnapshot)
    const pastFeeSnapshot = useBalancerPoolFeeSnapshotData(activeNetwork.clientUri, endTimeStamp)
    console.log("pastFeeSnapshot", pastFeeSnapshot)

    // Handler
    const handleFeesAlert = () => {
        setFeesAlert(false);
    };

    useEffect(() => {
        if (currentFeeSnapshot && pastFeeSnapshot) {
            const newFeeDelta = getSnapshotFees(currentFeeSnapshot, pastFeeSnapshot, endTimeStamp);
            setFeeDelta(newFeeDelta); // Update feeDelta state to trigger a re-render
        }
    }, [startTimestamp, endTimeStamp, currentFeeSnapshot?.pools.length, pastFeeSnapshot?.pools.length]);

    //Navigation
    const homeNav: NavElement = {
        name: 'Home',
        link: ''
    }
    const navCrumbs: NavElement[] = []
    navCrumbs.push(homeNav)

    //Change management
    const handleChange = (event: SelectChangeEvent) => {
        setTimeRange(event.target.value as string);

        if (event.target.value === '1000') {
            setShowDate(true);
        } else if (event.target.value === '0') {
            setEndDate(EthereumNetworkInfo.startTimeStamp);

            const newEndDate = DateTime.utc().startOf('day');
            setStartDate(newEndDate.toSeconds());
            setShowDate(false);
        } else {
            const startTimestamp = DateTime.utc().startOf('day').toSeconds();
            setStartDate(startTimestamp);
            setShowDate(false);
            setStartTimestamp(startTimestamp)

            const daysToSubtract = Number(event.target.value);
            const newEndDate = DateTime.utc().minus({days: daysToSubtract}).startOf('day');
            setEndDate(newEndDate.toSeconds());
            setEndTimeStamp(newEndDate.toMillis() / 1000)
        }
    };


    const parseDateString = (dateString: string): number | null => {
        // Expected format "DD.MM.YYYY"
        const parts = dateString.split('.');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JS months start from 0
            const year = parseInt(parts[2], 10);

            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                return new Date(year, month, day).getTime() / 1000; // Convert to UNIX timestamp
            }
        }
        return null; // Return null if the format is incorrect
    };

    const handleStartDateChange = (value: number | null, keyboardInputValue?: string) => {
        if (value) {
            const newStartTimestamp = Math.floor(new Date(value).getTime() / 1000);
            setStartDate(newStartTimestamp);
            setStartTimestamp(newStartTimestamp);
        } else if (keyboardInputValue) {
            const timestamp = parseDateString(keyboardInputValue);
            if (timestamp) {
                setStartDate(timestamp);
                setStartTimestamp(timestamp);
            }
        }
    };

    const handleEndDateChange = (value: number | null, keyboardInputValue?: string) => {
        if (value) {
            const newEndTimeStamp = Math.floor(new Date(value).getTime() / 1000);
            setEndDate(newEndTimeStamp);
            setEndTimeStamp(newEndTimeStamp);
        } else if (keyboardInputValue) {
            const timestamp = parseDateString(keyboardInputValue);
            if (timestamp) {
                setEndDate(timestamp);
                setEndTimeStamp(timestamp);
            }
        }
    };

    return (
        <Box>
            <Box mb={1} sx={{flexGrow: 2, justifyContent: "center"}}>
                {feesAlert && (
                    <Alert
                        severity="info"
                        action={
                            <IconButton
                                aria-label="close"
                                color="inherit"
                                size="small"
                                onClick={handleFeesAlert}
                            >
                                <CloseIcon fontSize="inherit"/>
                            </IconButton>
                        }
                    >
                        {feesAlertMessage}
                    </Alert>
                )}
            </Box>
            {currentFeeSnapshot && currentFeeSnapshot.pools && pastFeeSnapshot && pastFeeSnapshot.pools && feeDelta && feeDelta.pools ?
                <Grid
                    container
                    spacing={1}
                    sx={{justifyContent: 'center'}}
                >
                    <Grid item xs={11}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <NavCrumbs crumbSet={navCrumbs} destination={'Reports'}/>
                        </Box>
                    </Grid>
                    <Grid
                        item
                        mt={1}
                        mb={1}
                        xs={11}
                    >
                        <Box display="flex" alignItems="center">
                            <Box>
                                <Typography variant={"h5"}>Protocol Fees (Beta)</Typography>
                            </Box>

                        </Box>
                        <Box>
                            <Typography variant={"body2"}>Create aggregated views of protocol fees by specifying a time-range.
                                Metrics combine net fees earned unless stated otherwise</Typography>
                        </Box>
                    </Grid>
                    <Grid
                        item
                        mt={1}
                        mb={1}
                        xs={11}
                    >

                        <Box display="flex" alignItems="center" mb={1}>
                            <Box>
                                <Typography>Choose Time Range:</Typography>
                            </Box>
                            <Box ml={1}>
                                <FormControl size="small">
                                    <Select
                                        sx={{
                                            backgroundColor: "background.paper",
                                            boxShadow: 2,
                                            borderRadius: 2,
                                            borderColor: 0,
                                        }}
                                        color="primary"
                                        labelId="timeRangeSelectLabel"
                                        id="timeRangeSelect"
                                        onChange={handleChange}
                                        value={timeRange}
                                        inputProps={{
                                            name: 'timeRange',
                                            id: 'timeRangeId-native-simple',
                                        }}
                                    >
                                        <MenuItem disabled={true} dense={true}>Time range:</MenuItem>
                                        <Divider/>
                                        <MenuItem value={'7'}>Last 7 days</MenuItem>
                                        <MenuItem value={'14'}>Last 14 days</MenuItem>
                                        <MenuItem value={'30'}>Last 30 days</MenuItem>
                                        <MenuItem value={'90'}>Last 90 days</MenuItem>
                                        <MenuItem value={'180'}>Last 180 days</MenuItem>
                                        <MenuItem value={'365'}>Last 365 days</MenuItem>
                                        <MenuItem value={'0'}>All time</MenuItem>
                                        <MenuItem value={'1000'}>Custom </MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            {showDate ?
                                <Box p={0.5} display="flex" justifyContent="left" sx={{alignSelf: 'flex-end'}}>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            label="Start Date"
                                            maxDate={Date.now()}
                                            minDate={EthereumNetworkInfo.startTimeStamp}
                                            value={unixToDate(endDate)}
                                            onChange={handleEndDateChange}
                                            renderInput={(params) => <TextField size='small'
                                                                                sx={{maxWidth: '150px'}} {...params} />}
                                        />
                                    </LocalizationProvider>
                                    <Box p={1}>
                                        <Typography>to</Typography>
                                    </Box>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            label="End Date"
                                            maxDate={Date.now()}
                                            minDate={EthereumNetworkInfo.startTimeStamp}
                                            value={unixToDate(startDate)}
                                            onChange={handleStartDateChange}
                                            renderInput={(params) => <TextField size='small'
                                                                                sx={{maxWidth: '150px'}} {...params} />}
                                        />
                                    </LocalizationProvider>
                                </Box> : null}
                        </Box>
                        <Divider />
                    </Grid>
                    <Grid
                        item
                        mt={2}
                        xs={11}
                    >
                        <Box  display="flex" justifyContent="space-between" alignItems="row">
                            <Box display="flex" alignItems='center'>
                                <Typography variant="h5">Fees Earned Metrics</Typography>
                            </Box>

                        </Box>
                        <Box mb={1} display="flex" alignItems='center'>
                            <Typography variant="body2">Aggregated Fees earned for {activeNetwork.name}</Typography>
                        </Box>
                    <Grid
                        item
                        mt={2}
                        xs={11}
                    >
                        <ProtocolFeeTable poolDatas={feeDelta?.pools || []} corePools={corePools} />

                    </Grid>
                    </Grid>
                </Grid>:
                <Grid
                    container
                    spacing={2}
                    mt='25%'
                    sx={{justifyContent: 'center'}}
                >
                    <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <CustomLinearProgress/>
                        <Box mt={1}>
                        <Typography variant={'caption'}>Please stay patient friend. Subgraph goblins are indexing fees.</Typography>
                        </Box>
                    </Box>




                </Grid>
                    }
        </Box>
    );
}