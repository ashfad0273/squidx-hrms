import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AttendanceChartProps {
  data: {
    labels: string[];
    onTime: number[];
    late: number[];
    absent: number[];
  };
}

export function AttendanceBarChart({ data }: AttendanceChartProps) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'On Time',
        data: data.onTime,
        backgroundColor: 'hsl(142, 71%, 45%)',
        borderRadius: 6,
      },
      {
        label: 'Late',
        data: data.late,
        backgroundColor: 'hsl(38, 92%, 50%)',
        borderRadius: 6,
      },
      {
        label: 'Absent',
        data: data.absent,
        backgroundColor: 'hsl(0, 84%, 60%)',
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'hsl(214, 32%, 91%)',
        },
      },
    },
  };

  return (
    <div className="h-80">
      <Bar data={chartData} options={options} />
    </div>
  );
}

interface DepartmentChartProps {
  data: {
    labels: string[];
    values: number[];
  };
}

export function DepartmentDoughnut({ data }: DepartmentChartProps) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        backgroundColor: [
          'hsl(217, 91%, 45%)',
          'hsl(173, 58%, 39%)',
          'hsl(38, 92%, 50%)',
          'hsl(142, 71%, 45%)',
          'hsl(0, 84%, 60%)',
          'hsl(262, 83%, 58%)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 16,
        },
      },
    },
    cutout: '60%',
  };

  return (
    <div className="h-64">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
