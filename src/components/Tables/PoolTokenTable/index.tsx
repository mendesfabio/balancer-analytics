import * as React from 'react';
import Box from '@mui/material/Box';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Grid, Typography } from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { visuallyHidden } from '@mui/utils';
import { CircularProgress } from '@mui/material';
import { formatDollarAmount, formatPercentageAmount } from '../../../utils/numbers';
import TokensWhite from '../../../assets/svg/tokens_white.svg';
import TokensBlack from '../../../assets/svg/tokens_black.svg';
import { useTheme } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom';
import { networkPrefix } from '../../../utils/networkPrefix';
import { useActiveNetworkVersion } from '../../../state/application/hooks';
import { NetworkInfo } from '../../../constants/networks';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { PoolData, PoolTokenData, TokenData } from '../../../data/balancer/balancerTypes'
import CurrencyLogo from '../../CurrencyLogo';
import { green } from '@mui/material/colors';


interface Data {
    token: PoolTokenData;
    balance: number,
    tvl: number;
}

function createData(
    token: PoolTokenData,
    balance: number,
    tvl: number,
): Data {
    return {
        token,
        balance,
        tvl,
    };
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

type Order = 'asc' | 'desc';

function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key,
): (
    a: { [key in Key]: number | string | PoolTokenData },
    b: { [key in Key]: number | string | PoolTokenData },
) => number {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

// This method is created for cross-browser compatibility, if you don't
// need to support IE11, you can use Array.prototype.sort() directly
function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) {
            return order;
        }
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

interface HeadCell {
    disablePadding: boolean;
    id: keyof Data;
    label: string;
    numeric: boolean;
}

const headCells: readonly HeadCell[] = [
    {
        id: 'token',
        numeric: false,
        disablePadding: false,
        label: 'Token',
    },
    {
        id: 'balance',
        numeric: true,
        disablePadding: false,
        label: 'Pool Balance',
    },
    {
        id: 'tvl',
        numeric: true,
        disablePadding: false,
        label: 'Value',
    },
];

interface EnhancedTableProps {
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof Data) => void;
    order: Order;
    orderBy: string;
    rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
    const { order, orderBy, rowCount, onRequestSort } =
        props;
    const createSortHandler =
        (property: keyof Data) => (event: React.MouseEvent<unknown>) => {
            onRequestSort(event, property);
        };

    const theme = useTheme()

    return (
        <TableHead>
            <TableRow>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label === '' ? <img src={(theme.palette.mode === 'dark') ? TokensWhite : TokensBlack} alt="Theme Icon" width="25" /> : headCell.label}
                            {orderBy === headCell.id ? (
                                <Box component="span" sx={visuallyHidden}>
                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </Box>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

export default function PoolTokenTable({
    tokenDatas
}: {
    tokenDatas?: PoolTokenData[]
}) {
    const [order, setOrder] = React.useState<Order>('desc');
    const [orderBy, setOrderBy] = React.useState<keyof Data>('tvl');
    const [page, setPage] = React.useState(0);
    const [dense, setDense] = React.useState(false);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [activeNetwork] = useActiveNetworkVersion();
    let navigate = useNavigate();

    if (!tokenDatas) {
        return <CircularProgress />;
    }

    if (tokenDatas.length < 1) {
        return (
            <Grid>
                <CircularProgress />
            </Grid>
        );
    }

    const filteredTokenDatas = tokenDatas.filter(x => x.address.toLowerCase() !== '0x1aafc31091d93c3ff003cff5d2d8f7ba2e728425');

    const sortedTokenDats = filteredTokenDatas.sort(function (a, b) {
        return b.tvl - a.tvl;
    });

    const rows = sortedTokenDats.map(el =>
        createData(el, el.balance, el.tvl)

    )

    const handleRequestSort = (
        event: React.MouseEvent<unknown>,
        property: keyof Data,
    ) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleChangeDense = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDense(event.target.checked);
    };


    // Avoid a layout jump when reaching the last page with empty rows.
    const emptyRows =
        page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

    const getLink = (activeNetwork: NetworkInfo, id: string) => {
        return networkPrefix(activeNetwork) + 'tokens/' + id;
    }


    //Table generation

    return (
        <Box sx={{ width: '100%'}}>
            <Paper elevation={3} sx={{ mb: 2 }}>
                <TableContainer>
                    <Table
                        //sx={{ minWidth: 750 }}
                        aria-labelledby="tableTitle"
                        size={dense ? 'small' : 'medium'}
                    >
                        <EnhancedTableHead
                            order={order}
                            orderBy={orderBy}
                            onRequestSort={handleRequestSort}
                            rowCount={rows.length}
                        />
                        <TableBody>
                            {/* if you don't need to support IE11, you can replace the `stableSort` call with:
              rows.sort(getComparator(order, orderBy)).slice() */}
                            {stableSort(rows, getComparator(order, orderBy))
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((row, index) => {
                                    const labelId = `enhanced-table-checkbox-${index}`;

                                    return (
                                        <TableRow
                                            hover
                                            onClick={() => { navigate(`${getLink(activeNetwork, row.token.address)}/`); }}
                                            role="number"
                                            tabIndex={-1}
                                            key={row.token.address}
                                        >
                                            <TableCell
                                                align="left"
                                            >
                                                <Box display="flex" alignItems="center">
                                                    <Box mr={1}>
                                                <CurrencyLogo address={row.token.address}/>
                                                </Box>
                                                <Typography>{row.token.symbol}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                {Number(row.balance).toFixed(2)}
                                            </TableCell>
                                            <TableCell align="right">
                                               {row.tvl === 0 ? '-' : formatDollarAmount(row.tvl)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            {emptyRows > 0 && (
                                <TableRow
                                    style={{
                                        height: (dense ? 33 : 53) * emptyRows,
                                    }}
                                >
                                    <TableCell colSpan={6} />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}

