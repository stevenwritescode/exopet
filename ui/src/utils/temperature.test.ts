import { dangerLevel, temperatureGaugeColor } from "./temperature";

const limits = { lower_temp_limit: 24, upper_temp_limit: 28 };

describe("dangerLevel", () => {
  it.each([
    [18, "dangerously cold"],
    [21, "very cold"],
    [23.5, "cold"],
    [26, "ideal"],
    [28.5, "warm"],
    [30, "very warm"],
    [31.5, "dangerously warm"],
  ])("maps %s°C to %s", (currentTemp, expected) => {
    expect(dangerLevel({ currentTemp, ...limits })).toBe(expected);
  });
});

describe("temperatureGaugeColor", () => {
  it.each([
    [18, "indigo"],
    [21, "blue"],
    [23.5, "cyan"],
    [26, "lime"],
    [28.5, "yellow"],
    [30, "orange"],
    [31.5, "red"],
  ])("maps %s°C to %s", (currentTemp, expected) => {
    expect(temperatureGaugeColor({ currentTemp, ...limits })).toBe(expected);
  });
});
