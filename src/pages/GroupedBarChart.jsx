import React, { useEffect, useRef } from 'react';
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
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const getCSSVar = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();

const getChartColors = () => ({
  total: getCSSVar('--hs-chart-4') || '#d97706',
  afk: getCSSVar('--hs-chart-3') || '#059669',
  active: getCSSVar('--hs-chart-1') || '#2463eb',
});

const getTextColor = () => getCSSVar('--hs-chart-text') || '#475569';

const getChartBg = () => getCSSVar('--hs-bg-card') || '#ffffff';

const getGridColor = () => getCSSVar('--hs-chart-grid') || '#e2e8f0';

const getTooltipBg = () => getCSSVar('--hs-chart-tooltip-bg') || '#ffffff';

const getTooltipBorder = () => getCSSVar('--hs-chart-tooltip-border') || '#e2e8f0';

const roundedBarPlugin = {
  id: 'roundedBar',
  beforeDatasetsDraw(chart) {
    const { ctx, data } = chart;
    ctx.save();

    data.datasets.forEach((dataset, datasetIndex) => {
      chart.getDatasetMeta(datasetIndex).data.forEach((bar) => {
        if (bar.y >= bar.base) return;

        const radius = 4;
        const barX = bar.x - bar.width / 2;
        const barY = bar.y;
        const barWidth = bar.width;
        const barHeight = bar.base - bar.y;

        ctx.beginPath();
        ctx.fillStyle = dataset.backgroundColor;

        ctx.moveTo(barX, barY + radius);
        ctx.arcTo(barX, barY, barX + barWidth, barY, radius);
        ctx.arcTo(barX + barWidth, barY, barX + barWidth, barY + radius, radius);
        ctx.lineTo(barX + barWidth, barY + barHeight);
        ctx.lineTo(barX, barY + barHeight);

        ctx.closePath();
        ctx.fill();
      });
    });
    ctx.restore();
  },
};

const formatAxisLabel = (label) => {
  if (!label) return '';
  const today = new Date().toISOString().split('T')[0];
  if (label === today) return 'Today';
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (label === yesterday) return 'Yesterday';
  const parts = label.split('-');
  if (parts.length === 3) {
    const month = new Date(label).toLocaleString('en', { month: 'short' });
    const day = parseInt(parts[2], 10);
    return `${month} ${day}`;
  }
  return label;
};

const GroupedBarChart = ({ labels, totalData, afkData, activeData, compact = false, height = '350px' }) => {
  const chartRef = useRef(null);

  const textColor = getTextColor();
  const chartColors = getChartColors();
  const chartBg = getChartBg();
  const gridColor = getGridColor();
  const tooltipBg = getTooltipBg();
  const tooltipBorder = getTooltipBorder();

  const chartBackgroundPlugin = {
    id: 'chartBackground',
    beforeDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      ctx.save();
      ctx.fillStyle = chartBg;
      ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      ctx.restore();
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'Total Time (Minutes)',
        data: totalData,
        backgroundColor: chartColors.total,
        barThickness: 15,
        categoryPercentage: 0.8,
        barPercentage: 0.9,
      },
      {
        label: 'AFK Time (Minutes)',
        data: afkData,
        backgroundColor: chartColors.afk,
        barThickness: 15,
        categoryPercentage: 0.8,
        barPercentage: 0.9,
      },
      {
        label: 'Active Time (Minutes)',
        data: activeData,
        backgroundColor: chartColors.active,
        barThickness: 15,
        categoryPercentage: 0.8,
        barPercentage: 0.9,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 200,
    animation: {
      duration: 500,
    },
    layout: {
      padding: compact ? 4 : 10,
    },
    scales: {
      x: {
        grid: { display: false },
        title: {
          display: !compact,
          text: 'Date',
          color: textColor,
          font: {
            size: 15,
            weight: 'bold',
            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
        },
        ticks: {
          color: textColor,
          maxRotation: compact ? 0 : 50,
          autoSkip: true,
          maxTicksLimit: compact ? 4 : undefined,
          font: {
            size: compact ? 10 : 13,
            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          callback: (value, index) => formatAxisLabel(labels[index]),
        },
        border: { color: gridColor },
        stacked: false,
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          display: true,
          color: gridColor,
          drawBorder: false,
        },
        title: {
          display: !compact,
          text: 'Duration (Minutes)',
          color: textColor,
          font: {
            size: 15,
            weight: 'bold',
            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
        },
        ticks: {
          color: textColor,
          maxTicksLimit: compact ? 4 : undefined,
          font: {
            size: compact ? 10 : 13,
            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
        },
        border: { color: gridColor },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: compact ? 'bottom' : 'right',
        labels: {
          color: textColor,
          font: {
            size: compact ? 10 : 14,
            weight: '500',
            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          padding: compact ? 8 : 15,
          usePointStyle: true,
          boxWidth: compact ? 8 : undefined,
          boxHeight: compact ? 8 : undefined,
        },
      },
      tooltip: {
        enabled: true,
        position: 'nearest',
        backgroundColor: tooltipBg,
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: { weight: '700', size: 13 },
        bodyFont: { weight: '500', size: 12 },
        callbacks: {
          title: (tooltipItems) => {
            const today = new Date().toISOString().split('T')[0];
            return tooltipItems[0].label === today ? 'Today' : tooltipItems[0].label;
          },
          label: (tooltipItem) => {
            const dataValue = tooltipItem.raw;
            const hours = Math.floor(dataValue / 60);
            const minutes = Math.floor(dataValue % 60);
            const seconds = Math.floor((dataValue % 1) * 60);
            return `${tooltipItem.dataset.label}: ${hours}h ${minutes}m ${seconds}s`;
          },
        },
      },
    },
    hover: {
      mode: 'index',
      intersect: true,
    },
  };

  ChartJS.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ChartJS.defaults.font.size = 14;
  ChartJS.defaults.devicePixelRatio = window.devicePixelRatio || 1;

  return (
    <div style={{ height, width: '100%' }}>
      <Bar ref={chartRef} data={data} options={options} plugins={[roundedBarPlugin, chartBackgroundPlugin]} />
    </div>
  );
};

export default GroupedBarChart;
