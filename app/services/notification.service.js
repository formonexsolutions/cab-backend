// Replace with Firebase Admin SDK integration if you want real push
const notifyUser = async (userId, payload) => {
  // store in DB / send via FCM
  console.log(' notify user', userId, payload.type || 'event');
};
const notifyRideUpdate = async (rideId, payload) => {
  console.log('notify ride update', rideId, payload.type || 'event');
};
module.exports = {
  notifyUser,
  notifyRideUpdate
};
