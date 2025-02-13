export default class MotorConnection {
  constructor(controller) {
    this.controller = controller;
    this.reader = null;
    this.writer = null;
    this.connection = null;
    this.jogAmount = 1;

    this.isAwaiting = false;

    this.position = 0;

    // Handler method mapping
    this.handlers = {
      disconnectMotor: this.closeSerialPort,
      jogForwards: this.jogForwards,
      jogBackwards: this.jogBackwards,
      setHome: this.setHome,
      jogAmount: this.jogAmountChanged,
    };
  }

  async openSerialPort() {
    try {
      this.port = await navigator.serial.requestPort();

      // Open the port with the specified baud rate and buffer size
      await this.port.open({
        baudRate: 250000,
        bufferSize: 1024,
      });
    } catch (error) {
      console.error("Error opening serial port:", error);
      // this.controller.motor = null;
      throw error;
    }

    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();

    this.bindHandlers();

    document
      .getElementById("disconnectMotor")
      .addEventListener("click", this.closePortHandler);

    document.getElementById("disconnectMotor").classList.remove("btn-disabled");
    document.getElementById("connectMotor").classList.add("btn-disabled");

    document.querySelectorAll(".MotoractionButton").forEach((button) => {
      button.classList.remove("btn-disabled");
    });

    this.readLoop().catch((e) => {
      console.error("error reading");
      console.error(e);
      this.closeSerialPort();
    });

    const info = await this.port.getInfo();

    console.log(info);
  }

  jogAmountChanged() {
    this.jogAmount = 2 ** +document.getElementById("jogAmount").value;
    console.log(document.getElementById("jogAmount").value);
    console.log(this.jogAmount);
  }

  async jogForwards() {
    this.isAwaiting = true;
    this.updateSpinner();
    console.log("jogForwards");
    const CMD = new TextEncoder().encode("JOG " + this.jogAmount + "\n");
    await this.writer.write(CMD);
  }
  async jogBackwards() {
    this.isAwaiting = true;
    this.updateSpinner();
    console.log("jogBackwards");
    const CMD = new TextEncoder().encode("JOG " + -this.jogAmount + "\n");
    await this.writer.write(CMD);
  }

  async setHome() {
    this.isAwaiting = true;
    this.updateSpinner();
    const CMD = new TextEncoder().encode("SETHOME");
    await this.writer.write(CMD);
  }

  updateSpinner() {
    if (this.isAwaiting) {
      document.getElementById("spinnerMotor").classList.add("loading");
    } else {
      document.getElementById("spinnerMotor").classList.remove("loading");
    }
  }

  parseData(buffer) {
    this.isAwaiting = false;
    this.updateSpinner();
    let data = new Uint8Array(buffer);
    console.log(data);
    let decoded = new TextDecoder().decode(data).trim();
    console.log(decoded);
    if (decoded === "Stepper ready") {
      document.getElementById("motorConnected").checked = true;
    }
    let split = decoded.split(" ");
    if (split[0] === "SETHOME") {
      this.position = 0;
      return this.controller.VNA.getData(); // Initial call
    }
    this.position = +split[2] || this.position;
    if (!this.controller?.VNA?.startTime) return;
    this.controller.VNA.getData();
  }

  // Loop to continuously read data from the serial stream
  async readLoop() {
    const chPrompt = new TextEncoder().encode("\n");
    let buffer = [];
    while (true) {
      const { value, done } = await this.reader.read();

      if (value) {
        // Append the new value to the buffer
        buffer.push(...value);

        if (this.isPatternMatched(buffer, chPrompt)) {
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
        this.controller.motor = null;

        this.unbindHandlers();

        document.getElementById("motorConnected").checked = false;

        document
          .getElementById("disconnectMotor")
          .classList.add("btn-disabled");
        document
          .getElementById("connectMotor")
          .classList.remove("btn-disabled");
        document
          .querySelectorAll(".MotoractionButton")
          .forEach((button) => button.classList.add("btn-disabled"));
      }
    }
  }

  bindHandlers() {
    for (const [id, handler] of Object.entries(this.handlers)) {
      const element = document.getElementById(id);
      if (element) {
        const eventType = id === "jogAmount" ? "input" : "click";
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
