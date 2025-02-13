#include <Arduino.h>
#include <AccelStepper.h>
#include <AccelStepperWithDistance.h>

#define STEP_PIN 2
#define DIR_PIN 3

AccelStepperWithDistance stepper(AccelStepperWithDistance::DRIVER, STEP_PIN, DIR_PIN);

#define SPINDLE_DIAMETER 10.0               // in mm
#define MM_PER_REV (SPINDLE_DIAMETER * PI)  // Circumference in mm

float currentPosition = 0.0;  // Track the current position in mm

void setup() {
  Serial.begin(250000);  // Set a higher baud rate for faster communication
  stepper.setMaxSpeed(100);
  stepper.setAcceleration(100);
  stepper.setStepsPerRotation(200);            // For a 1.8° stepper motor
  stepper.setMicroStep(16);                    // If using 1/16 microstepping
  stepper.setDistancePerRotation(MM_PER_REV);  // If one rotation moves 8mm
  Serial.println("Stepper ready");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');  // Read the command
    command.trim();                                 // Remove any trailing spaces or newlines

    if (command.startsWith("JOG")) {
      // Parse the jog amount
      float jogAmount = command.substring(4).toFloat();

      stepper.moveRelative(jogAmount);  // Set the relative movement
      while (stepper.isRunning()) {
        stepper.run();  // Keep moving the motor
      }

      currentPosition += jogAmount;  // Update position based on jogAmount

      // Output the results over serial
      Serial.print(command);  // Echo command
      Serial.print(" ");
      Serial.print(currentPosition, 2);  // Print position in mm
      Serial.println();
    } else if (command.startsWith("SETHOME")) {
      currentPosition = 0;

      Serial.print(command);  // Echo command
      Serial.print(" ");
      Serial.print(currentPosition, 2);  // Print position in mm
      Serial.println();
    }
  }
}
