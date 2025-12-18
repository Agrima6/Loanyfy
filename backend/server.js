// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

// ---------- MIDDLEWARE ----------
if (process.env.NODE_ENV === "production") {
  app.use(
    cors({
      origin: ["https://loanyfybusinessloanapi.netlify.app"],
      methods: ["GET", "POST"],
      credentials: false,
    })
  );
} else {
  app.use(cors());
}

app.use(express.json());

// serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- MONGO CONNECTION ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("Mongo error ❌", err.message));

// ---------- SCHEMA ----------
const applicationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },

    email: String,
    panNumber: String,

    altMobile: String,
    dob: String,
    aadhaarNumber: String,

    productType: String,

    business: {
      tradeName: String,
      vintage: String,
      address: String,
      pincode: String,
      city: String,
      state: String,
      constitutionType: String,
      annualTurnover: String,
      industryType: String,
      monthlyObligation: Number,

      gstNumber: String,
      businessType: String,
      employeeCount: String,
      revenueLastYear: String,
      registrationNumber: String,
    },

    calculator: {
      loanAmount: Number,
      tenureMonths: Number,
      interestRate: Number,
      monthlyEmi: Number,
      totalInterest: Number,
      totalAmount: Number,
    },

    documents: {
      pan: String,
      aadhaar: String,
      businessReg: String,
      electricityBill: String,
      bankStatements: [String],
    },

    status: { type: String, default: "New" },
  },
  { timestamps: true }
);

const Application = mongoose.model("Application", applicationSchema);

// ---------- MULTER SETUP ----------
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeOriginal = (file.originalname || "file").replace(/\s+/g, "_");
    cb(null, `${unique}-${safeOriginal}`);
  },
});
const upload = multer({ storage });

// ---------- ROUTES ----------
app.get("/", (req, res) => res.send("Loanyfy API is running 🚀"));

app.post("/api/applications", async (req, res) => {
  try {
    const appData = await Application.create(req.body);
    res.status(201).json({
      success: true,
      id: appData._id,
      applicationId: appData._id,
    });
  } catch (err) {
    console.error("Create application error ❌", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post(
  "/api/applications/upload-docs",
  upload.fields([
    { name: "pan", maxCount: 1 },
    { name: "aadhaar", maxCount: 1 },
    { name: "businessReg", maxCount: 1 },
    { name: "electricityBill", maxCount: 1 },
    { name: "bankStatements", maxCount: 20 },
  ]),
  async (req, res) => {
    try {
      const { applicationId } = req.body;
      if (!applicationId) {
        return res.status(400).json({
          success: false,
          message: "applicationId is required to attach documents",
        });
      }

      const files = req.files || {};

      // ✅ FULL BASE URL (so Netlify can open images from Render)
      const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

      const docsUpdate = {
        pan: files.pan?.[0] ? `${baseUrl}/uploads/${files.pan[0].filename}` : undefined,
        aadhaar: files.aadhaar?.[0] ? `${baseUrl}/uploads/${files.aadhaar[0].filename}` : undefined,
        businessReg: files.businessReg?.[0]
          ? `${baseUrl}/uploads/${files.businessReg[0].filename}`
          : undefined,
        electricityBill: files.electricityBill?.[0]
          ? `${baseUrl}/uploads/${files.electricityBill[0].filename}`
          : undefined,
        bankStatements: files.bankStatements
          ? files.bankStatements.map((f) => `${baseUrl}/uploads/${f.filename}`)
          : undefined,
      };

      const setOps = {};
      Object.entries(docsUpdate).forEach(([key, value]) => {
        if (value !== undefined) setOps[`documents.${key}`] = value;
      });

      if (!Object.keys(setOps).length) {
        return res.status(400).json({
          success: false,
          message: "No documents received to upload",
        });
      }

      const updated = await Application.findByIdAndUpdate(
        applicationId,
        { $set: setOps },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Application not found for given applicationId",
        });
      }

      res.json({ success: true, message: "Documents uploaded & linked ✅" });
    } catch (err) {
      console.error("Upload docs error ❌", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// ---------- START SERVER ----------
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));
