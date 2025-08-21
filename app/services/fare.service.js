// simple base fare calculator — replace with your own logic + Google Distance Matrix if needed
export const calculateFare = ({ distanceKm = 0, durationMin = 0, surgeMultiplier = 1 }) => {
  const base = 30;              // base fare
  const perKm = 12;             // per km
  const perMin = 1;             // per minute
  const fare = (base + distanceKm * perKm + durationMin * perMin) * surgeMultiplier;
  return Math.round(fare);
};
export const calculateSurgeFare = (fare, surgeMultiplier) => {
  return Math.round(fare * surgeMultiplier);
};
