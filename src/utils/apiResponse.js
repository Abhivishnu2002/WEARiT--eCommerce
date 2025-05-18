const apiResponse = {
  
  success: (res, message, data = null, statusCode = 200) => {
    const response = {
      success: true,
      message,
    }

    if (data) {
      response.data = data
    }

    return res.status(statusCode).json(response)
  },
  error: (res, message, statusCode = 500, error = null) => {
    const response = {
      success: false,
      message,
    }
    if (process.env.NODE_ENV === "development" && error) {
      response.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    return res.status(statusCode).json(response)
  },
}
module.exports = apiResponse
