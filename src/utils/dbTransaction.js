const mongoose = require("mongoose")
const { createLogger } = require("./logger")
const logger = createLogger("db-transaction")
const executeTransaction = async (callback) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const result = await callback(session)
    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction()
    logger.error(`Transaction aborted: ${error.message}`, { stack: error.stack })
    throw error
  } finally {
    session.endSession()
  }
}

module.exports = {
  executeTransaction,
}
