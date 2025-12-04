import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

interface ScheduleDisplayProps {
  nextWaterChange: Date | null;
}

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ nextWaterChange }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <Card sx={{backgroundColor: "#2596be"}}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          Current Time
        </Typography>
        <Typography variant="h5">
          {currentTime.toLocaleTimeString()}
        </Typography>
        <Typography color="textSecondary" gutterBottom style={{ marginTop: '16px' }}>
          Next Water Change
        </Typography>
        <Typography variant="h6">
          {nextWaterChange ? nextWaterChange.toLocaleString() : 'Not scheduled'}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ScheduleDisplay;
