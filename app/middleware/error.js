const StatusCodes=require('http-status-codes');

const notFound = (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Route not found' });
};

const errorHandler = (err, req, res, next) => {
  console.error('error', err);
  const code = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  res.status(code).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};

module.exports = {
  notFound,
  errorHandler
};
