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
    this.motor = new MotorConnection(this);
    await this.motor.openSerialPort();

    console.log(this.VNA, this.motor);
    if (this.VNA && this.motor) {
      document.getElementById("connectBoth").classList.add("btn-disabled");
      document
        .getElementById("disconnectBoth")
        .classList.remove("btn-disabled");
    }
  }

  async connectVNA() {
    this.VNA = new VNAConnection(dataChart, this);
    await this.VNA.openSerialPort();
    console.log(controller);

    console.log(this.VNA, this.motor);
    if (this.VNA && this.motor) {
      document.getElementById("connectBoth").classList.add("btn-disabled");
      document
        .getElementById("disconnectBoth")
        .classList.remove("btn-disabled");
    }
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

    await this.motor.setHome();

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

document.getElementById("connectMotor").addEventListener("click", () => {
  controller.connectMotor();
});

document.getElementById("connectVNA").addEventListener("click", () => {
  controller.connectVNA();
});

document.getElementById("connectBoth").addEventListener("click", async () => {
  await controller.connectBoth();
});
document
  .getElementById("disconnectBoth")
  .addEventListener("click", async () => {
    await controller.disconnectBoth();
  });

window.addEventListener("load", () => {
  const ctx = document.getElementById("dataChart").getContext("2d");

  dataChart = new Chart(ctx, {
    type: "lineWithErrorBars",
    data: {
      datasets: [
        {
          label: "Average Data",
          data: [],
          fill: false, // No fill under the line
          borderColor: "blue", // Line color
          borderWidth: 2, // Line width
          pointRadius: 5, // Size of points
          pointBackgroundColor: "red", // Point color
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
            text: "Time since start of test (seconds)", // Y-axis label
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Signal strength (dBm)", // Y-axis label
          },
        },
      },
      plugins: {
        legend: {
          display: false, // Hides the legend
        },
      },
    },
  });
});
