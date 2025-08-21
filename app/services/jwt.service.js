const jwt= require('jsonwebtoken');


const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

module.exports = {
  signToken,
  verifyToken
};