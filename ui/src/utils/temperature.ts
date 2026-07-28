export const dangerLevel = ({
  currentTemp,
  lower_temp_limit,
  upper_temp_limit,
}: {
  currentTemp: number;
  lower_temp_limit: number;
  upper_temp_limit: number;
}) => {
  if (currentTemp < lower_temp_limit - 5) {
    return "dangerously cold";
  } else if (currentTemp < lower_temp_limit - 2.5) {
    return "very cold";
  } else if (currentTemp < lower_temp_limit) {
    return "cold";
  } else if (currentTemp > upper_temp_limit + 3) {
    return "dangerously warm";
  } else if (currentTemp > upper_temp_limit + 1.5) {
    return "very warm";
  } else if (currentTemp > upper_temp_limit) {
    return "warm";
  } else {
    return "ideal";
  }
};

export const temperatureGaugeColor = ({
  currentTemp,
  lower_temp_limit,
  upper_temp_limit,
}: {
  currentTemp: number;
  lower_temp_limit: number;
  upper_temp_limit: number;
}) => {
  const danger = dangerLevel({
    currentTemp,
    lower_temp_limit,
    upper_temp_limit,
  });
  switch (danger) {
    case "dangerously cold":
      return "indigo";
    case "very cold":
      return "blue";
    case "cold":
      return "cyan";
    case "dangerously warm":
      return "red";
    case "very warm":
      return "orange";
    case "warm":
      return "yellow";
    default:
      return "lime";
  }
};
