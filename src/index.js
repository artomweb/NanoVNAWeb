import {
  Chart,
  LineController,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LinearScale,
  CategoryScale,
} from "chart.js";

import {
  LineWithErrorBarsController,
  LineWithErrorBarsChart,
  PointWithErrorBar,
} from "chartjs-chart-error-bars"; // Import the error bars plugin

// Register all components needed for your chart
Chart.register(
  LineWithErrorBarsController,
  LineWithErrorBarsChart,
  LineController,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LinearScale,
  CategoryScale,
  PointWithErrorBar
  // ChartErrorBars // Register the error bars plugin
);

import VNAConnection from "./VNAConnection.js";
import MotorConnection from "./MotorConnection.js";
let dataChart = null;

class Controller {
  constructor() {
    this.VNA = null;
    this.motor = null;

    document
      .getElementById("startRun")
      .addEventListener("click", this.startRun.bind(this));
    document
      .getElementById("stopRun")
      .addEventListener("click", this.stopRun.bind(this));
  }

  async connectMotor() {
    try {
      this.motor = new MotorConnection(this);
      await this.motor.openSerialPort();
    } catch {
      this.motor = null;
    }
    console.log(this.VNA, this.motor);
    // if (this.VNA && this.motor) {
    //   document.getElementById("connectBoth").classList.add("btn-disabled");
    //   document
    //     .getElementById("disconnectBoth")
    //     .classList.remove("btn-disabled");
    // }
  }

  async connectVNA() {
    try {
      this.VNA = new VNAConnection(dataChart, this);
      await this.VNA.openSerialPort();
    } catch {
      this.VNA = null;
    }

    console.log(this.VNA, this.motor);
    // if (this.VNA && this.motor) {
    //   document.getElementById("connectBoth").classList.add("btn-disabled");
    //   document
    //     .getElementById("disconnectBoth")
    //     .classList.remove("btn-disabled");
    // }
  }

  async connectBoth() {
    if (this.VNA) {
      this.VNA.closeSerialPort();
      this.VNA = null;
    }
    if (this.motor) {
      this.motor.closeSerialPort();
      this.motor = null;
    }
    await this.connectMotor();
    await this.connectVNA();

    document.getElementById("connectBoth").classList.add("btn-disabled");
    document.getElementById("disconnectBoth").classList.remove("btn-disabled");
  }

  async disconnectBoth() {
    if (this.VNA) {
      this.VNA.closeSerialPort();
      this.VNA = null;
    }
    if (this.motor) {
      this.motor.closeSerialPort();
      this.motor = null;
    }

    document.getElementById("connectBoth").classList.remove("btn-disabled");
    document.getElementById("disconnectBoth").classList.add("btn-disabled");
  }

  // Start Run - Calls getData every 5 seconds
  async startRun() {
    if (this.VNA.dataInterval) return; // Avoid multiple intervals
    this.VNA.clearChart(); // clear the data chart
    this.VNA.startTime = Date.now();

    if (this.motor !== null) {
      await this.motor.setHome();
    } else {
      this.VNA.getData();
    }

    // this.VNA.dataInterval = setInterval(() => {
    //   if (!this.VNA.startTime) return;
    //   const now = Date.now();
    //   if (now - this.VNA.lastDataTime > 5000) {
    //     this.VNA.getData();
    //   }
    // }, 1000);

    // Disable startRun and enable stopRun
    document.getElementById("startRun").classList.add("btn-disabled");
    document.getElementById("stopRun").classList.remove("btn-disabled");
  }

  // Stop Run - Clears interval
  stopRun() {
    if (this.VNA.dataInterval) {
      clearInterval(this.VNA.dataInterval);
      this.VNA.dataInterval = null;
    }
    this.VNA.startTime = null;

    // Enable startRun and disable stopRun
    document.getElementById("startRun").classList.remove("btn-disabled");
    document.getElementById("stopRun").classList.add("btn-disabled");
  }
}
const controller = new Controller();

// document.getElementById("connectBoth").addEventListener("click", async () => {
//   await controller.connectBoth();
// });
// document
//   .getElementById("disconnectBoth")
//   .addEventListener("click", async () => {
//     await controller.disconnectBoth();
//   });
window.addEventListener("load", () => {
  document.getElementById("connectMotor").addEventListener("click", () => {
    controller.connectMotor();
  });

  document.getElementById("connectVNA").addEventListener("click", () => {
    controller.connectVNA();
  });

  const ctx = document.getElementById("dataChart").getContext("2d");

  dataChart = new Chart(ctx, {
    type: "lineWithErrorBars",
    data: {
      datasets: [
        {
          label: "Magnitude (dBm)",
          data: [],
          fill: false,
          borderColor: "blue",
          borderWidth: 2,
          pointRadius: 5,
          pointBackgroundColor: "red",
          yAxisID: "y", // Link to left y-axis
        },
        {
          label: "Phase (degrees)",
          data: [],
          fill: false,
          borderColor: "teal", // Different color for phase
          borderWidth: 2,
          pointRadius: 5,
          pointBackgroundColor: "green",
          yAxisID: "y1", // Link to right y-axis
        },
      ],
    },
    options: {
      animation: {
        duration: 0, // Disable animations
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          min: 0, // Forces the x-axis to start at zero
          title: {
            display: true,
            text: "Time since start of test (seconds)", // Default, updated by VNAConnection
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Magnitude (dBm)", // Left y-axis for magnitude
          },
          position: "left",
        },
        y1: {
          title: {
            display: true,
            text: "Phase (degrees)", // Right y-axis for phase
          },
          position: "right",
          grid: {
            drawOnChartArea: false, // Avoid overlapping grid lines
          },
          ticks: {
            callback: function (value) {
              return value + "°"; // Optional: append degree symbol to tick labels
            },
          },
          // No fixed min/max to allow auto-scaling
        },
      },
      plugins: {
        legend: {
          display: true, // Show legend to distinguish datasets
        },
      },
    },
  });
});
