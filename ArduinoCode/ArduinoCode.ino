#include <Arduino.h>
#include <AccelStepper.h>
#include <AccelStepperWithDistance.h>

#define STEP_PIN 3
#define DIR_PIN 2
#define ENABLE_PIN 7  // A4988 Enable pin

#define MS1 6
#define MS2 5
#define MS3 4

AccelStepperWithDistance stepper(AccelStepperWithDistance::DRIVER, STEP_PIN, DIR_PIN);

#define SPINDLE_DIAMETER 10.0               // in mm
#define MM_PER_REV (SPINDLE_DIAMETER * PI)  // Circumference in mm

float currentPosition = 0.0;  // Track the current position in mm

void setup() {
  pinMode(ENABLE_PIN, OUTPUT);
  digitalWrite(ENABLE_PIN, HIGH);  // Disable motor initially

  pinMode(MS1, OUTPUT);
  pinMode(MS2, OUTPUT);
  pinMode(MS3, OUTPUT);
  digitalWrite(MS1, HIGH);
  digitalWrite(MS2, HIGH);
  digitalWrite(MS3, HIGH);

  Serial.begin(250000);
  stepper.setMaxSpeed(1000);
  stepper.setAcceleration(500);
  stepper.setStepsPerRotation(200);            
  stepper.setMicroStep(16);                    
  stepper.setDistancePerRotation(MM_PER_REV); 
  // stepper.setMinPulseWidth(10);
  Serial.println("Stepper ready");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');  // Read the command
    command.trim();                                  // Remove any trailing spaces or newlines

    if (command.startsWith("JOG")) {
      float jogAmount = command.substring(4).toFloat();

      digitalWrite(ENABLE_PIN, LOW);  // Enable motor
      stepper.moveRelative(jogAmount);
      while (stepper.isRunning()) {
        stepper.run();
      }
      digitalWrite(ENABLE_PIN, HIGH);  // Disable motor when done

      currentPosition += jogAmount;
      Serial.print(command);
      Serial.print(" ");
      Serial.print(currentPosition, 2);
      Serial.println();
    } else if (command.startsWith("SETHOME")) {
      currentPosition = 0;
      Serial.print(command);
      Serial.print(" ");
      Serial.print(currentPosition, 2);
      Serial.println();
    }
  }
}
