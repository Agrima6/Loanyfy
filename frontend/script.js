document.addEventListener("DOMContentLoaded", () => {
  const steps = Array.from(document.querySelectorAll(".step"));
  const progressFill = document.getElementById("progressFill");
  const stepTitleEl = document.getElementById("stepTitle");

  let currentStep = 1;

  // ------------------ STATE ------------------
  let basic = {
    fullName: "",
    mobile: "",
    email: "",
    panNumber: "",
  };

  let business = {};
  let calcState = {
    loanAmount: 500000,
    tenureMonths: 12,
    interestRate: 16.99,
    monthlyEmi: 0,
    totalInterest: 0,
    totalAmount: 0,
  };

  let applicationId = null;

  // ------------------ STEP NAV ------------------
  function showStep(step) {
    currentStep = step;

    steps.forEach((s) => {
      const stepNum = parseInt(s.dataset.step, 10);
      if (stepNum === step) {
        s.classList.add("step-active");
        s.style.display = "block";
      } else {
        s.classList.remove("step-active");
        s.style.display = "none";
      }
    });

    const pct = (step / 4) * 100;
    progressFill.style.width = pct + "%";

    const labels = {
      1: "Step 1 of 4 – Welcome",
      2: "Step 2 of 4 – Business Details",
      3: "Step 3 of 4 – Loan Offer",
      4: "Step 4 of 4 – Completed",
    };
    stepTitleEl.textContent = labels[step];

    // Card + icon animation
    const activeSection = steps.find(
      (s) => parseInt(s.dataset.step, 10) === step
    );
    if (activeSection && typeof gsap !== "undefined") {
      gsap.fromTo(
        activeSection,
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );

      const icon = activeSection.querySelector(".step-icon-circle");
      if (icon) {
        gsap.fromTo(
          icon,
          { scale: 0.8, y: -4 },
          { scale: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
        );
      }
    }

    // 🔄 Swap side illustrations for this step (if any)
    const sideImgs = document.querySelectorAll(".side-img");
    sideImgs.forEach((img) => {
      const imgStep = Number(img.dataset.step || 0);
      img.classList.toggle("side-img-active", imgStep === step);
    });
  }

  // ------------------ STEP 1 ------------------
  const toStep2Btn = document.getElementById("toStep2Btn");
  toStep2Btn.addEventListener("click", () => {
    const fullName = document.getElementById("fullName").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const email = document.getElementById("email").value.trim();
    const panNumber = document.getElementById("panNumber").value.trim();
    const terms = document.getElementById("termsCheckbox").checked;

    if (!fullName) {
      alert("Please enter your full name.");
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(panNumber)) {
      alert("Please enter a valid PAN card number.");
      return;
    }
    if (!terms) {
      alert("Please agree to the Terms & Conditions.");
      return;
    }

    basic = { fullName, mobile, email, panNumber };
    showStep(2);
  });

  // ------------------ STEP 2 ------------------
  document.getElementById("backTo1").addEventListener("click", () => {
    showStep(1);
  });

  document.getElementById("toStep3Btn").addEventListener("click", () => {
    const tradeName = document.getElementById("tradeName").value.trim();
    const vintage = document.getElementById("vintage").value;
    const address = document.getElementById("address").value.trim();
    const pincode = document.getElementById("pincode").value.trim();
    const city = document.getElementById("city").value.trim();
    const state = document.getElementById("state").value.trim();
    const constitutionType = document.getElementById("constitutionType").value;
    const annualTurnover = document.getElementById("annualTurnover").value;
    const industryType = document.getElementById("industryType").value;
    const monthlyObligationRaw =
      document.getElementById("monthlyObligation").value.trim();

    if (
      !tradeName ||
      !vintage ||
      !address ||
      !pincode ||
      !city ||
      !state ||
      !constitutionType ||
      !annualTurnover ||
      !industryType
    ) {
      alert("Please fill all required business details.");
      return;
    }

    const monthlyObligation = monthlyObligationRaw
      ? Number(monthlyObligationRaw)
      : 0;

    business = {
      tradeName,
      vintage,
      address,
      pincode,
      city,
      state,
      constitutionType,
      annualTurnover,
      industryType,
      monthlyObligation,
    };

    showStep(3);
  });

  // ------------------ CALCULATOR (STEP 3) ------------------
  const loanAmountRange = document.getElementById("loanAmountRange");
  const loanAmountInput = document.getElementById("loanAmountInput");
  const loanAmountLabel = document.getElementById("loanAmountLabel");

  const tenureRange = document.getElementById("tenureRange");
  const tenureInput = document.getElementById("tenureInput");
  const tenureLabel = document.getElementById("tenureLabel");

  const interestRange = document.getElementById("interestRange");
  const interestInput = document.getElementById("interestInput");
  const interestLabel = document.getElementById("interestLabel");
  const interestRateLabel = document.getElementById("interestRateLabel");

  const emiValueEl = document.getElementById("emiValue");
  const totalInterestEl = document.getElementById("totalInterestValue");
  const totalAmountEl = document.getElementById("totalAmountValue");
  const thankYouNameEl = document.getElementById("thankYouName");

  function formatCurrency(num) {
    return (
      "₹ " +
      Math.round(num).toLocaleString("en-IN", { maximumFractionDigits: 0 })
    );
  }

  function calcEmi(principal, months, ratePercent) {
    const r = ratePercent / 12 / 100;
    if (!principal || !months || !r) {
      return { emi: 0, totalInterest: 0, totalAmount: 0 };
    }
    const factor = Math.pow(1 + r, months);
    const emi = (principal * r * factor) / (factor - 1);
    const totalAmount = emi * months;
    const totalInterest = totalAmount - principal;
    return { emi, totalInterest, totalAmount };
  }

  function updateCalculatorFromState(animated = true) {
    const { loanAmount, tenureMonths, interestRate } = calcState;
    const { emi, totalInterest, totalAmount } = calcEmi(
      loanAmount,
      tenureMonths,
      interestRate
    );
    calcState.monthlyEmi = emi;
    calcState.totalInterest = totalInterest;
    calcState.totalAmount = totalAmount;

    loanAmountLabel.textContent = formatCurrency(loanAmount);
    tenureLabel.textContent = tenureMonths + " months";

    if (interestLabel) {
      interestLabel.textContent = interestRate.toFixed(2) + "% p.a.";
    }
    if (interestRateLabel) {
      interestRateLabel.textContent = interestRate.toFixed(2) + "% p.a.";
    }
    if (interestInput) {
      interestInput.value = interestRate.toFixed(2);
    }
    if (interestRange) {
      interestRange.value = interestRate;
    }

    const updateText = (el, value, prefix = "₹ ") => {
      if (!animated || typeof gsap === "undefined") {
        el.textContent =
          prefix +
          Math.round(value).toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          });
        return;
      }
      const currentText = el.textContent.replace(/[^\d]/g, "");
      const current = parseInt(currentText || "0", 10);
      const obj = { val: current };
      gsap.to(obj, {
        val: value,
        duration: 0.6,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent =
            prefix +
            Math.round(obj.val).toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            });
        },
      });
    };

    updateText(emiValueEl, emi);
    updateText(totalInterestEl, totalInterest);
    updateText(totalAmountEl, totalAmount);
  }

  function syncLoanAmount(newVal) {
    const val = Number(newVal);
    if (Number.isNaN(val) || val <= 0) return;
    calcState.loanAmount = val;
    loanAmountRange.value = val;
    loanAmountInput.value = val;
    updateCalculatorFromState();
  }

  function syncTenure(newVal) {
    const val = Number(newVal);
    if (Number.isNaN(val) || val <= 0) return;
    calcState.tenureMonths = val;
    tenureRange.value = val;
    tenureInput.value = val;
    updateCalculatorFromState();
  }

  function syncInterest(newVal) {
    const val = Number(newVal);
    if (Number.isNaN(val) || val <= 0) return;
    calcState.interestRate = val;
    if (interestRange) interestRange.value = val;
    if (interestInput) interestInput.value = val.toFixed(2);
    updateCalculatorFromState();
  }

  // initial defaults
  loanAmountRange.value = calcState.loanAmount;
  loanAmountInput.value = calcState.loanAmount;
  tenureRange.value = calcState.tenureMonths;
  tenureInput.value = calcState.tenureMonths;
  if (interestRange) interestRange.value = calcState.interestRate;
  if (interestInput) interestInput.value = calcState.interestRate.toFixed(2);
  updateCalculatorFromState(false);

  loanAmountRange.addEventListener("input", (e) =>
    syncLoanAmount(e.target.value)
  );
  loanAmountInput.addEventListener("change", (e) =>
    syncLoanAmount(e.target.value)
  );
  tenureRange.addEventListener("input", (e) => syncTenure(e.target.value));
  tenureInput.addEventListener("change", (e) => syncTenure(e.target.value));

  if (interestRange) {
    interestRange.addEventListener("input", (e) =>
      syncInterest(e.target.value)
    );
  }
  if (interestInput) {
    interestInput.addEventListener("change", (e) =>
      syncInterest(e.target.value)
    );
  }

  // ------------------ STEP 3 -> STEP 4 ------------------
  async function handleProcessClick(productType) {
    const payload = {
      fullName: basic.fullName,
      mobile: basic.mobile,
      email: basic.email,
      panNumber: basic.panNumber,
      productType,
      business,
      calculator: {
        loanAmount: calcState.loanAmount,
        tenureMonths: calcState.tenureMonths,
        interestRate: calcState.interestRate,
        monthlyEmi: calcState.monthlyEmi,
        totalInterest: calcState.totalInterest,
        totalAmount: calcState.totalAmount,
      },
    };

    try {
      const base = window.LOANYFY_API_BASE || "";
      const res = await fetch(base + "/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.applicationId) {
          applicationId = data.applicationId;
        }
      } else {
        console.error("Error saving application:", res.status);
      }
    } catch (err) {
      console.error(err);
      alert(
        "We could not save your data right now, but your request has been captured on screen."
      );
    }

    thankYouNameEl.textContent = basic.fullName || "there";
    showStep(4);
    playConfetti();
  }

  const overdraftBtn = document.getElementById("processOverdraftBtn");
  const termLoanBtn = document.getElementById("processTermLoanBtn");

  if (overdraftBtn) {
    overdraftBtn.addEventListener("click", () =>
      handleProcessClick("Overdraft Limit")
    );
  }
  if (termLoanBtn) {
    termLoanBtn.addEventListener("click", () =>
      handleProcessClick("Term Loan")
    );
  }

  // ------------------ STEP 4: DOC UPLOAD + RESTART ------------------
  const submitDocsBtn = document.getElementById("submitDocsBtn");
  const startAgainBtn = document.getElementById("startAgainBtn");

  if (startAgainBtn) {
    startAgainBtn.addEventListener("click", () => window.location.reload());
  }

  if (submitDocsBtn) {
    submitDocsBtn.addEventListener("click", async () => {
      const base = window.LOANYFY_API_BASE || "";

      if (!applicationId) {
        const confirmProceed = confirm(
          "Application ID not found yet. Upload documents anyway?"
        );
        if (!confirmProceed) return;
      }

      const formData = new FormData();
      if (applicationId) formData.append("applicationId", applicationId);

      const docPan = document.getElementById("docPan").files[0];
      const docAadhaar = document.getElementById("docAadhaar").files[0];
      const docBusinessReg =
        document.getElementById("docBusinessReg").files[0];
      const docElectricity =
        document.getElementById("docElectricityBill").files[0];

      const bankFiles = Array.from(
        document.getElementById("docBankStatements").files || []
      );

      if (docPan) formData.append("pan", docPan);
      if (docAadhaar) formData.append("aadhaar", docAadhaar);
      if (docBusinessReg) formData.append("businessReg", docBusinessReg);
      if (docElectricity) formData.append("electricityBill", docElectricity);
      bankFiles.forEach((file, idx) =>
        formData.append("bankStatements", file, file.name || `bank_${idx}`)
      );

      try {
        const res = await fetch(base + "/api/applications/upload-docs", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          alert("Documents uploaded securely. Thank you!");
        } else {
          alert(
            "There was an issue uploading your documents. Please try again."
          );
        }
      } catch (err) {
        console.error(err);
        alert(
          "We could not upload your documents right now. Please try again in some time."
        );
      }
    });
  }

  function playConfetti() {
    const pieces = document.querySelectorAll(".confetti");
    if (typeof gsap === "undefined") return;

    gsap.fromTo(
      pieces,
      { y: -20, opacity: 0, scale: 0.7, rotation: -20 },
      {
        y: 40,
        opacity: 1,
        scale: 1,
        rotation: 20,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
      }
    );

    gsap.fromTo(
      "#thankYouName",
      { scale: 0.9 },
      { scale: 1.05, duration: 0.5, ease: "back.out(2)" }
    );
  }

  // ------------------ GLOBAL ANIMATIONS ------------------
  function initGlobalAnimations() {
    if (typeof gsap === "undefined") return;

    gsap.from(".card", {
      y: 24,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
    });

    gsap.to(".brand-logo", {
      y: -4,
      repeat: -1,
      yoyo: true,
      duration: 2,
      ease: "sine.inOut",
    });

    gsap.to(".primary-btn", {
      y: -2,
      repeat: -1,
      yoyo: true,
      duration: 1.6,
      ease: "sine.inOut",
      stagger: 0.25,
    });

    gsap.from(".blob", {
      opacity: 0,
      duration: 1.2,
      stagger: 0.15,
    });

    gsap.to(".side-illustration", {
      y: -12,
      duration: 6,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }

  // init animations + first step
  initGlobalAnimations();
  showStep(1);
});
