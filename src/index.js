class SerialService {
  constructor() {
    this.reader = null;
    this.writer = null;
    this.port = null;

    this.isWriting = false; // Flag to control access to the writer

    this.isAwaiting = false;

    this.closePortHandler = this.closeSerialPort.bind(this);
    this.screenshotHandler = this.captureScreenshot.bind(this);
    this.portInfoHandler = this.getPortInfo.bind(this);
    this.getSweepHandler = this.getSweep.bind(this);
    this.getDataHandler = this.getData.bind(this);
  }

  async openSerialPort() {
    try {
      // Specify the VID and PID for NanoVNA or tinySA
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
      return;
    }

    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();

    document
      .getElementById("disconnect")
      .addEventListener("click", this.closePortHandler);

    document
      .getElementById("screenshot")
      .addEventListener("click", this.screenshotHandler);

    document
      .getElementById("getPortInfo")
      .addEventListener("click", this.portInfoHandler);
    document
      .getElementById("getSweep")
      .addEventListener("click", this.getSweepHandler);
    document
      .getElementById("getData")
      .addEventListener("click", this.getDataHandler);

    document.getElementById("disconnect").classList.remove("btn-disabled");
    document.getElementById("connect").classList.add("btn-disabled");
    const actionButtons = document.querySelectorAll(".actionButton");

    actionButtons.forEach((button) => {
      button.classList.remove("btn-disabled");
    });

    this.readLoop().catch((e) => {
      console.error("error reading");
      console.error(e);
      this.closeSerialPort();
    });
  }

  async getData() {
    this.isAwaiting = true;
    this.updateSpinner();
    const cmdString1 = "frequencies";
    const cmdByteArray1 = new TextEncoder().encode(cmdString1 + "\r");

    await this.writer.write(cmdByteArray1);

    const cmdString2 = "data 1";
    const cmdByteArray2 = new TextEncoder().encode(cmdString2 + "\r");

    await this.writer.write(cmdByteArray2);
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

        // Cleanup UI
        document
          .getElementById("disconnect")
          .removeEventListener("click", this.closePortHandler);
        document
          .getElementById("screenshot")
          .removeEventListener("click", this.screenshotHandler);
        document
          .getElementById("getPortInfo")
          .removeEventListener("click", this.portInfoHandler);
        document
          .getElementById("getSweep")
          .removeEventListener("click", this.getSweepHandler);
        document
          .getElementById("getData")
          .removeEventListener("click", this.getDataHandler);

        document.getElementById("disconnect").classList.add("btn-disabled");
        document.getElementById("connect").classList.remove("btn-disabled");
        document
          .querySelectorAll(".actionButton")
          .forEach((button) => button.classList.add("btn-disabled"));
      }
    }
  }

  // Function to parse data
  parseData(buffer) {
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

    console.log("Before CR:", beforeCrText); // Outputs: "Hello"
    console.log("After CR:", afterCr); // Outputs: "World"

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
      console.log(afterCrText);
      console.log(magnitudes);
      const max = Math.max(...magnitudes);
      console.log(max);
      const sum = magnitudes.reduce((a, b) => a + b, 0);
      const avg = sum / magnitudes.length || 0;
      console.log(avg);
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

  // async readUntil(reader, pattern) {
  //   let chunks = [];
  //   let done = false;

  //   while (!done) {
  //     const { value, done: readerDone } = await reader.read();
  //     if (readerDone) {
  //       break;
  //     }

  //     // Append the new chunk to the chunks buffer
  //     chunks.push(...value);

  //     // Only check for the pattern in the most recent chunk and the previous ones
  //     let startIdx = Math.max(0, chunks.length - pattern.length);

  //     // Slice the chunks buffer to check for the pattern
  //     let patternMatch = chunks.slice(startIdx).join("") === pattern.join("");
  //     if (patternMatch) {
  //       done = true;
  //     }
  //   }

  //   return new Uint8Array(chunks);
  // }

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
}

let serialService;
// Initialize the SerialService and open the port when the button is clicked
document.getElementById("connect").addEventListener("click", () => {
  serialService = new SerialService();

  serialService.openSerialPort();
});
