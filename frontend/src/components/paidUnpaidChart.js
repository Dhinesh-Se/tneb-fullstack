import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PaidUnpaidChart({ paidAmount, unpaidAmount }) {
  const total = paidAmount + unpaidAmount;

  const paidPercentage =
    total === 0 ? 0 : ((paidAmount / total) * 100).toFixed(2);
  const unpaidPercentage =
    total === 0 ? 0 : ((unpaidAmount / total) * 100).toFixed(2);

  const data = {
    labels: [
      `Paid (${paidPercentage}%)`,
      `Unpaid (${unpaidPercentage}%)`
    ],
    datasets: [
      {
        data: [paidAmount, unpaidAmount],
        backgroundColor: ["#2ecc71", "#e74c3c"],
        borderWidth: 1
      }
    ]
  };

  const options = {
    cutout: "60%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#ffffff",
          font: { size: 14 },
          boxWidth: 18
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `₹${context.raw}`
        }
      }
    }
  };

  return (
    <div style={{ width: "300px" }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}