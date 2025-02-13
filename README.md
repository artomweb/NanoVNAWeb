## Web interface for NanoVNA

![alt text](screenshot.png)

Connects to a portable Vector Network Analyser with the WebSerialAPI. The `Run` button starts recording the average of the S21 parameter and plots it on the graph. The `Copy Results` button copies the data as TSV so that it can be pasted into Excel/Sheets.

It's designed for moving an defect down a Gas Insulated Line and recording the magnitude of the standing wave. The motor moves the defect, then the VNA records the standing wave amplitude, then the cycle repeats.
