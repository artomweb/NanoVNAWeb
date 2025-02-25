export default class VNAConnection {
  constructor(dataChart, controller) {
    this.controller = controller;
    this.dataChart = dataChart;
    this.reader = null;
    this.writer = null;
    this.port = null;

    this.isWriting = false; // Flag to control access to the writer

    this.isAwaiting = false;

    this.dataInterval = null;
    this.startTime = null;
    this.lastDataTime = null;
    this.filterDuplicates = true;
    this.lastAvgValue = null;

    // Handler method mapping
    this.handlers = {
      disconnectVNA: this.closeSerialPort,
      screenshot: this.captureScreenshot,
      getPortInfo: this.getPortInfo,
      getSweep: this.getSweep,
      getData: this.getFrequenciesAndData,
      copyResults: this.copyResults,
      filterDuplicates: this.checkBoxChanged,
    };
  }

  copyResults() {
    // Check if there's any data in the chart
    if (
      !this.dataChart ||
      !this.dataChart.data ||
      !this.dataChart.data.datasets[0] ||
      !this.dataChart.data.datasets[0].data
    ) {
      alert("No data to copy.");
      return;
    }

    const data = this.dataChart.data.datasets[0].data;

    // Check if data array is empty
    if (data.length === 0) {
      alert("No data to copy.");
      return;
    }

    // Extract axis titles from the chart options
    const xAxisTitle = this.dataChart.options.scales.x.title.text;
    const yAxisTitle = this.dataChart.options.scales.y.title.text;

    // Create CSV format using the axis titles
    let csvContent = `${xAxisTitle}\t${yAxisTitle} Mean\tMin\tMax\n`;

    // Loop through the dataset and create rows with x, y, yMin, yMax values
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      csvContent += `${point.x}\t${point.y}\t${point.yMin}\t${point.yMax}\n`;
    }

    // Create a textarea for copying the CSV content
    const textArea = document.createElement("textarea");
    textArea.value = csvContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }

  async openSerialPort() {
    try {
      // Specify the VID and PID for NanoVNA
      const VID = 0x0483; // 1155
      const PID = 0x5740; // 22336

      // Request the device via the Web Serial API with filters for VID and PID
      this.port = await navigator.serial.requestPort({
        filters: [{ usbVendorId: VID, usbProductId: PID }],
      });

      // Open the port with the specified baud rate and buffer size
      await this.port.open({
        baudRate: 115200,
        bufferSize: 1024,
      });
    } catch (error) {
      console.error("Error opening serial port:", error);
      // this.controller.VNA = null;
      throw error;
    }

    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();

    this.bindHandlers();

    document.getElementById("disconnectVNA").classList.remove("btn-disabled");
    document.getElementById("connectVNA").classList.add("btn-disabled");

    document.querySelectorAll(".VNAactionButton").forEach((button) => {
      button.classList.remove("btn-disabled");
    });

    this.isAwaiting = true;
    this.updateSpinner();
    console.log("version");
    const cmdString = "version";
    const cmdByteArray = new TextEncoder().encode(cmdString + "\r");

    await this.writer.write(cmdByteArray);

    this.readLoop().catch((e) => {
      console.error("error reading");
      console.error(e);
      this.closeSerialPort();
    });
  }

  checkBoxChanged() {
    this.filterDuplicates = document.getElementById("filterDuplicates").checked;
  }

  async getFrequenciesAndData() {
    this.isAwaiting = true;
    this.updateSpinner();
    const cmdString1 = "frequencies";
    const cmdByteArray1 = new TextEncoder().encode(cmdString1 + "\r");

    await this.writer.write(cmdByteArray1);

    setTimeout(() => {
      this.isAwaiting = true;
      this.updateSpinner();
      const cmdString2 = "data 1";
      const cmdByteArray2 = new TextEncoder().encode(cmdString2 + "\r");

      this.writer.write(cmdByteArray2);
    }, 1000);
  }

  async getData() {
    console.warn("GET DATA");
    this.isAwaiting = true;
    this.updateSpinner();
    const cmdString2 = "data 1";
    const cmdByteArray2 = new TextEncoder().encode(cmdString2 + "\r");

    this.writer.write(cmdByteArray2);
  }

  updateChart(min, max, avg) {
    if (!this.startTime) return;

    // Prevent duplicates if the filter is enabled
    if (this.filterDuplicates && this.lastAvgValue === avg) {
      if (this.startTime) {
        this.getData();
      }
      return;
    }

    this.lastAvgValue = avg;

    const now = Date.now();
    this.lastDataTime = now;

    // Time in seconds since the start
    const elapsedSeconds = ((now - this.startTime) / 1000).toFixed(1);

    let XVal;

    // Check if the motor is connected
    if (this.controller && this.controller.motor != null) {
      const motorPosition = this.controller.motor.position; // Get motor position
      console.log("Motor Position: ", motorPosition);

      if (
        this.dataChart.options.scales.x.title.text !== "Defect Position (mm)"
      ) {
        this.clearChart(); // Clear the chart if the title needs to be updated
        this.dataChart.options.scales.x.title.text = "Defect Position (mm)"; // Update x-axis title
      }
      XVal = motorPosition;
      // Use motor position for x-axis if motor is connected
      //   this.dataChart.data.labels.push(motorPosition); // Motor position as x-axis label
    } else {
      if (
        this.dataChart.options.scales.x.title.text !==
        "Time since start of test (seconds)"
      ) {
        this.clearChart(); // Clear the chart if the title needs to be updated
        this.dataChart.options.scales.x.title.text =
          "Time since start of test (seconds)"; // Update x-axis title
      }
      // Use elapsed time for x-axis if motor is not connected
      console.log("averageValue ", avg, "Time ", elapsedSeconds);
      XVal = elapsedSeconds;
      //   this.dataChart.data.labels.push(elapsedSeconds); // Time as x-axis label
    }

    // Push the new data with error bars
    this.dataChart.data.datasets[0].data.push({
      x: XVal,
      y: avg, // Average value
      yMin: min, // Minimum value
      yMax: max, // Maximum value
    });

    // Update the chart with the new data
    this.dataChart.update();

    console.log(this.dataChart.data);

    if (!this.startTime) return;

    if (this.controller.motor == null) {
      this.getData(); // Continue fetching the next data
      return;
    }

    this.controller.motor.jogForwards();

    console.log("next data");
  }

  clearChart() {
    this.dataChart.data.labels = []; // Remove all time labels
    this.dataChart.data.datasets[0].data = []; // Remove all data points
    this.dataChart.update(); // Refresh the chart
  }

  async getSweep() {
    this.isAwaiting = true;
    this.updateSpinner();
    const cmdString = "sweep";
    const cmdByteArray = new TextEncoder().encode(cmdString + "\r");

    await this.writer.write(cmdByteArray);
  }

  async getPortInfo() {
    console.log(this.port.writable);
    const info = await this.port.getInfo();

    console.log(info);
  }

  updateSpinner() {
    if (this.isAwaiting) {
      document.getElementById("spinner").classList.add("loading");
    } else {
      document.getElementById("spinner").classList.remove("loading");
    }
  }

  async captureScreenshot() {
    this.isAwaiting = true;
    this.updateSpinner();
    const cmdString = "capture";
    const cmdByteArray = new TextEncoder().encode(cmdString + "\r");

    await this.writer.write(cmdByteArray);

    console.log(cmdString);
  }

  async closeSerialPort() {
    if (this.port) {
      try {
        if (this.writer) {
          await this.writer.close();
          this.writer.releaseLock();
          this.writer = null;
        }
        if (this.reader) {
          await this.reader.cancel();
          this.reader.releaseLock();
          this.reader = null;
        }

        await this.port.close(); // Might throw NetworkError if the device is already lost
        console.log("Serial port closed.");
      } catch (error) {
        if (error.message.includes("The device has been lost")) {
          console.warn("Device was already disconnected.");
        } else {
          console.error("Error closing serial port:", error);
        }
      } finally {
        this.port = null;

        this.unbindHandlers();

        document.getElementById("VNAConnected").checked = false;

        document.getElementById("disconnectVNA").classList.add("btn-disabled");
        document.getElementById("connectVNA").classList.remove("btn-disabled");
        document
          .querySelectorAll(".VNAactionButton")
          .forEach((button) => button.classList.add("btn-disabled"));
      }
    }
  }

  // Function to parse data
  parseData(buffer) {
    if (!this.isAwaiting) return;
    this.isAwaiting = false;
    this.updateSpinner();
    let data = new Uint8Array(buffer);
    // Implement your data parsing logic here
    console.log("Parsing Data:", data);

    const crByte = new TextEncoder().encode("\r")[0];
    const chPrompt = new TextEncoder().encode("\r\nch> ");

    const index = data.indexOf(crByte);

    if (index == -1) return;
    // If '\r' is found, split the array into two parts: before and after '\r'
    const beforeCrText = new TextDecoder().decode(data.slice(0, index));
    const afterCr = data.slice(index + 2).slice(0, -chPrompt.length);

    // console.log("Before CR:", beforeCrText); // Outputs: "Hello"
    // console.log("After CR:", afterCr); // Outputs: "World"

    const afterCrText = new TextDecoder().decode(afterCr);

    if (beforeCrText == "sweep") {
      let s = afterCrText.split(" "); // Use map to return the modified array
      if (s[1] < 0) {
        console.log(`Center: ${s[0]}, Span: ${s[1] * -1}, Steps: ${s[2]}`);
        document.getElementById("currentStart").value = "-";
        document.getElementById("currentStop").value = "-";
        document.getElementById("currentCW").value = "-";
        document.getElementById("currentCenter").value = s[0];
        document.getElementById("currentSpan").value = s[1] * -1;
        document.getElementById("currentSteps").value = s[2];
      } else if (s[1] == 0) {
        console.log(`CW frequency: ${s[0]}, Steps: ${s[2]}`);
        document.getElementById("currentStart").value = "-";
        document.getElementById("currentStop").value = "-";
        document.getElementById("currentCW").value = s[0];
        document.getElementById("currentCenter").value = "-";
        document.getElementById("currentSpan").value = "-";
        document.getElementById("currentSteps").value = s[2];
      } else {
        console.log(`Start: ${s[0]}, Stop: ${s[1]}, Steps: ${s[2]}`);
        document.getElementById("currentStart").value = s[0];
        document.getElementById("currentStop").value = s[1];
        document.getElementById("currentCW").value = "-";
        document.getElementById("currentCenter").value = "-";
        document.getElementById("currentSpan").value = "-";
        document.getElementById("currentSteps").value = s[2];
      }
      console.log(s);
    } else if (beforeCrText == "capture") {
      this.displayImage(afterCr, 800, 480);
    } else if (beforeCrText.startsWith("data")) {
      const magnitudes = this.getMags(afterCrText);
      const filteredMagnitudes = magnitudes.filter((value) =>
        Number.isFinite(value)
      );

      if (filteredMagnitudes.length > 0) {
        const max = Math.max(...filteredMagnitudes);
        const min = Math.min(...filteredMagnitudes);
        const sum = filteredMagnitudes.reduce((a, b) => a + b, 0);
        const avg = sum / filteredMagnitudes.length;

        console.log("Min:", min);
        console.log("Max:", max);
        console.log("Mean:", avg);

        this.updateChart(min, max, avg);
      } else {
        console.log("No valid numbers in magnitudes array.");
      }
    } else if (beforeCrText.startsWith("version")) {
      document.getElementById("VNAConnected").checked = true;
    } else {
      console.log(afterCrText);
    }
  }

  getMags(text) {
    const components = text.split("\n");
    return components
      .map((line) => {
        let [real, imag] = line.split(" ").map(Number);
        if (isNaN(real) || isNaN(imag)) return null; // Handle invalid lines
        let magnitude = Math.sqrt(real ** 2 + imag ** 2);
        return 20 * Math.log10(magnitude);
      })
      .filter((x) => x !== null); // Remove invalid entries
  }

  // Loop to continuously read data from the serial stream
  async readLoop() {
    const chPrompt = new TextEncoder().encode("ch> ");
    // const crChar = new TextEncoder().encode("\r");
    let buffer = [];
    while (true) {
      const { value, done } = await this.reader.read();

      if (value) {
        // Append the new value to the buffer
        buffer.push(...value);

        // Check if the buffer contains either "ch>" or "\r"
        if (
          this.isPatternMatched(buffer, chPrompt)
          // ||this.isPatternMatched(buffer, crChar)
        ) {
          // Process the data
          this.parseData(buffer);
          // Clear the buffer after processing
          buffer = [];
        }
      }

      if (done) {
        console.log("[readLoop] DONE", done);
        this.reader.releaseLock();
        break;
      }
    }
  }

  // Check if the buffer matches the given pattern
  isPatternMatched(buffer, pattern) {
    if (buffer.length < pattern.length) return false;
    // Check if the last part of the buffer matches the pattern
    return buffer
      .slice(buffer.length - pattern.length)
      .every((val, index) => val === pattern[index]);
  }

  convertRGB565ToRGBA(data, width, height) {
    const output = new Uint8ClampedArray(width * height * 4); // RGBA8888 format

    for (let i = 0, j = 0; i < data.length; i += 2, j += 4) {
      // Read 2 bytes as little-endian
      let pixel = data[i] | (data[i + 1] << 8);

      // Extract RGB565 components and convert to 8-bit RGB
      let r = (((pixel >> 11) & 0x1f) * 527 + 23) >> 6;
      let g = (((pixel >> 5) & 0x3f) * 259 + 33) >> 6;
      let b = ((pixel & 0x1f) * 527 + 23) >> 6;

      // Store the RGBA components in the output array
      output[j] = r; // Red
      output[j + 1] = g; // Green
      output[j + 2] = b; // Blue
      output[j + 3] = 255; // Alpha (fully opaque)
    }

    return output;
  }

  displayImage(data, width, height) {
    const displayCanvas = document.getElementById("screenshotCanvas");
    const displayCtx = displayCanvas.getContext("2d");

    // Get width & height from the canvas element
    const scaledWidth = displayCanvas.width;
    const scaledHeight = displayCanvas.height;

    // Create an offscreen canvas at full resolution
    const fullCanvas = document.createElement("canvas");
    const fullCtx = fullCanvas.getContext("2d");
    fullCanvas.width = width;
    fullCanvas.height = height;

    // Convert RGB565 to RGBA
    const rgbaData = this.convertRGB565ToRGBA(data, width, height);
    const imageData = new ImageData(rgbaData, width, height);

    // Draw full-resolution image onto the offscreen canvas
    fullCtx.putImageData(imageData, 0, 0);

    // Clear and draw the scaled image
    displayCtx.clearRect(0, 0, scaledWidth, scaledHeight);
    displayCtx.drawImage(fullCanvas, 0, 0, scaledWidth, scaledHeight);
  }

  bindHandlers() {
    for (const [id, handler] of Object.entries(this.handlers)) {
      const element = document.getElementById(id);
      if (element) {
        const eventType = id === "filterDuplicates" ? "change" : "click";
        // Store the bound handler to reference later
        const boundHandler = handler.bind(this);
        this.handlers[id] = { handler: boundHandler, eventType, element };
        element.addEventListener(eventType, boundHandler);
      }
    }
  }

  unbindHandlers() {
    for (const [id, { handler, eventType, element }] of Object.entries(
      this.handlers
    )) {
      if (element) {
        element.removeEventListener(eventType, handler);
      }
    }
  }
}
