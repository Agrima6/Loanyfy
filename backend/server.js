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

// CORS: allow all in dev, restrict to Netlify in prod
if (process.env.NODE_ENV === "production") {
  app.use(
    cors({
      origin: [
        "https://loanyfy.netlify.app", // 👉 replace with your actual Netlify URL if different
      ],
      methods: ["GET", "POST"],
    })
  );
} else {
  // local testing (Postman / localhost)
  app.use(cors());
}

app.use(express.json());

// serve uploaded files statically (if you ever need previews)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- MONGO CONNECTION ----------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("Mongo error ❌", err.message));

// ---------- SCHEMA ----------
const applicationSchema = new mongoose.Schema(
  {
    // STEP 1 ---------- Basic Personal Info
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },

    email: String,
    panNumber: String,

    // optional extra fields
    altMobile: String,
    dob: String,
    aadhaarNumber: String,

    // what the user selected on step 3
    productType: String, // "Overdraft Limit" or "Term Loan"

    // STEP 2 ---------- Business Details
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

      monthlyObligation: Number, // total monthly EMIs / CC etc.

      // optional future fields
      gstNumber: String,
      businessType: String,
      employeeCount: String,
      revenueLastYear: String,
      registrationNumber: String,
    },

    // STEP 3 ---------- Loan Calculator Output
    calculator: {
      loanAmount: Number,
      tenureMonths: Number,
      interestRate: Number,
      monthlyEmi: Number,
      totalInterest: Number,
      totalAmount: Number,
    },

    // Uploaded document paths
    documents: {
      pan: String,
      aadhaar: String,
      businessReg: String,
      electricityBill: String,
      bankStatements: [String], // array of file paths
    },

    // for internal tracking
    status: {
      type: String,
      default: "New", // New / In-Progress / Verified / Approved / Rejected
    },
  },
  { timestamps: true }
);

const Application = mongoose.model("Application", applicationSchema);

// ---------- MULTER SETUP (for documents) ----------
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeOriginal = file.originalname.replace(/\s+/g, "_");
    cb(null, `${unique}-${safeOriginal}`);
  },
});

const upload = multer({ storage });

// ---------- ROUTES ----------

// simple health route
app.get("/", (req, res) => {
  res.send("Loanyfy API is running 🚀");
});

/**
 * Create application (Step 1–3)
 * Body: {
 *   fullName, mobile, email, panNumber, productType,
 *   business: {..., monthlyObligation},
 *   calculator: {...}
 * }
 */
app.post("/api/applications", async (req, res) => {
  try {
    const appData = await Application.create(req.body);
    res.status(201).json({
      success: true,
      id: appData._id,
      applicationId: appData._id, // used by frontend
    });
  } catch (err) {
    console.error("Create application error ❌", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * Upload documents for an application
 * multipart/form-data fields:
 *   applicationId (text)
 *   pan (file)
 *   aadhaar (file)
 *   businessReg (file)
 *   electricityBill (file)
 *   bankStatements (multiple files)
 */
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

      const docsUpdate = {
        pan: files.pan?.[0]
          ? `/uploads/${files.pan[0].filename}`
          : undefined,
        aadhaar: files.aadhaar?.[0]
          ? `/uploads/${files.aadhaar[0].filename}`
          : undefined,
        businessReg: files.businessReg?.[0]
          ? `/uploads/${files.businessReg[0].filename}`
          : undefined,
        electricityBill: files.electricityBill?.[0]
          ? `/uploads/${files.electricityBill[0].filename}`
          : undefined,
        bankStatements: files.bankStatements
          ? files.bankStatements.map((f) => `/uploads/${f.filename}`)
          : undefined,
      };

      // build $set with dotted paths so we don't overwrite whole documents object
      const setOps = {};
      Object.entries(docsUpdate).forEach(([key, value]) => {
        if (value !== undefined) {
          setOps[`documents.${key}`] = value;
        }
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

      res.json({
        success: true,
        message: "Documents uploaded & linked to application ✅",
      });
    } catch (err) {
      console.error("Upload docs error ❌", err);
      res.status(500).json({
        success: false,
        message: "Server error while uploading documents",
      });
    }
  }
);

// ---------- START SERVER ----------
const PORT = process.env.PORT || 5001; // Render sets PORT in prod
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ✅`);
});
