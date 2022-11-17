import { useTheme } from '@mui/material/styles'
import { styled } from '@mui/material/styles';
import { Box } from "@mui/system";
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
    height: 10,
    borderRadius: 5,
    [`&.${linearProgressClasses.colorPrimary}`]: {
      backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
    },
    [`& .${linearProgressClasses.bar}`]: {
      borderRadius: 5,
      //backgroundColor: theme.palette.mode === 'light' ? '#1a90ff' : '#308fe8',
    },
  }));

export default function CustomLinearProgress() {

    const theme = useTheme();

    return (
        <Box
            alignItems="center"
            justifyContent="center"
            sx={{ 
                width: '50%',
                height: '10px',
            }}
        >
            <BorderLinearProgress color="secondary" />
        </Box>
    );
}