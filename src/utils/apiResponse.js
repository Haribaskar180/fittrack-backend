/**
 * Standardised JSON response helpers.
 */

const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message = 'Error', statusCode = 500, error = null) => {
  const body = { success: false, message };
  if (error && process.env.NODE_ENV === 'development') {
    body.error = error;
  }
  return res.status(statusCode).json(body);
};

const sendPaginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
