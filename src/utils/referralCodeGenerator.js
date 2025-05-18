const crypto = require("crypto")
const User = require("../models/userModel")

async function generateReferralCode(prefix = "WI") {
  let isUnique = false
  let code

  while (!isUnique) {
    const randomString = crypto.randomBytes(3).toString("hex").toUpperCase()
    code = `${prefix}${randomString}`
    const existingUser = await User.findOne({ referralCode: code })

    if (!existingUser) {
      isUnique = true
    }
  }

  return code
}

module.exports = { generateReferralCode }
