const mongoose = require("mongoose")
const Schema = mongoose.Schema

const salesReportSchema = new Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
    },
    reportType: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", "custom"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    totalCouponDiscount: {
      type: Number,
      default: 0,
    },
    netRevenue: {
      type: Number,
      default: 0,
    },
    ordersByStatus: {
      pending: { type: Number, default: 0 },
      shipped: { type: Number, default: 0 },
      "out for delivery": { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      returned: { type: Number, default: 0 },
      "return pending": { type: Number, default: 0 },
    },
    paymentMethodBreakdown: {
      COD: { type: Number, default: 0 },
      online: { type: Number, default: 0 },
      wallet: { type: Number, default: 0 },
      paypal: { type: Number, default: 0 },
    },
    topSellingProducts: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: Number,
        revenue: Number,
      },
    ],
    topCategories: [
      {
        category: {
          type: Schema.Types.ObjectId,
          ref: "Category",
        },
        quantity: Number,
        revenue: Number,
      },
    ],
    dailySalesData: [
      {
        date: Date,
        sales: Number,
        orders: Number,
      },
    ],
    customerSegments: [
      {
        segment: String,
        count: Number,
        revenue: Number,
      },
    ],
    includedOrders: [
      {
        type: Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    cacheExpiry: {
      type: Date,
      default: () => {
        return new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
    },
  },
  { timestamps: true },
)

salesReportSchema.pre("save", function (next) {
  if (this.isNew) {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = ("0" + (date.getMonth() + 1)).slice(-2)
    const day = ("0" + date.getDate()).slice(-2)
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")
    this.reportId = `REP${year}${month}${day}${random}`
  }
  next()
})

salesReportSchema.index({ reportType: 1, startDate: 1, endDate: 1 })
salesReportSchema.index({ createdAt: -1 })
salesReportSchema.index({ cacheExpiry: 1 })

const SalesReport = mongoose.model("SalesReport", salesReportSchema)
module.exports = SalesReport
