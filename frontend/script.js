document.addEventListener("DOMContentLoaded", () => {
  const steps = Array.from(document.querySelectorAll(".step"));
  const progressFill = document.getElementById("progressFill");
  const stepTitleEl = document.getElementById("stepTitle");

  let currentStep = 1;

  // ------------------ STATE ------------------
  let basic = { fullName: "", mobile: "", email: "", panNumber: "" };
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

  let isProcessingApplication = false;
  let isUploadingDocs = false;

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

    // for partners lazy load logic from index.html
    document.body.classList.toggle("is-step4", step === 4);

    progressFill.style.width = (step / 4) * 100 + "%";

    const labels = {
      1: "Step 1 of 4 – Welcome",
      2: "Step 2 of 4 – Business Details",
      3: "Step 3 of 4 – Loan Offer",
      4: "Step 4 of 4 – Completed",
    };
    stepTitleEl.textContent = labels[step];

    const activeSection = steps.find((s) => parseInt(s.dataset.step, 10) === step);
    if (activeSection && typeof gsap !== "undefined") {
      gsap.killTweensOf(activeSection);
      gsap.fromTo(
        activeSection,
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
      );

      const icon = activeSection.querySelector(".step-icon-circle");
      if (icon) {
        gsap.killTweensOf(icon);
        gsap.fromTo(
          icon,
          { scale: 0.85, y: -4 },
          { scale: 1, y: 0, duration: 0.35, ease: "back.out(1.7)" }
        );
      }
    }
  }

  // ------------------ STEP 1 ------------------
  const toStep2Btn = document.getElementById("toStep2Btn");
  toStep2Btn.addEventListener("click", () => {
    const fullName = document.getElementById("fullName").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const email = document.getElementById("email").value.trim();
    const panNumber = document.getElementById("panNumber").value.trim();
    const terms = document.getElementById("termsCheckbox").checked;

    if (!fullName) return alert("Please enter your full name.");
    if (!/^\d{10}$/.test(mobile)) return alert("Please enter a valid 10-digit mobile number.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("Please enter a valid email address.");
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(panNumber)) return alert("Please enter a valid PAN card number.");
    if (!terms) return alert("Please agree to the Terms & Conditions.");

    basic = { fullName, mobile, email, panNumber };
    showStep(2);
  });

  // ------------------ STEP 2 ------------------
  document.getElementById("backTo1").addEventListener("click", () => showStep(1));

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
    const monthlyObligationRaw = document.getElementById("monthlyObligation").value.trim();

    if (!tradeName || !vintage || !address || !pincode || !city || !state || !constitutionType || !annualTurnover || !industryType) {
      return alert("Please fill all required business details.");
    }

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
      monthlyObligation: monthlyObligationRaw ? Number(monthlyObligationRaw) : 0,
    };

    showStep(3);
  });

  // ------------------ CALCULATOR ------------------
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
    return "₹ " + Math.round(num).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }

  function calcEmi(principal, months, ratePercent) {
    const r = ratePercent / 12 / 100;
    if (!principal || !months || !r) return { emi: 0, totalInterest: 0, totalAmount: 0 };
    const factor = Math.pow(1 + r, months);
    const emi = (principal * r * factor) / (factor - 1);
    const totalAmount = emi * months;
    const totalInterest = totalAmount - principal;
    return { emi, totalInterest, totalAmount };
  }

  let calcRAF = 0;
  function scheduleCalculatorUpdate(animated = true) {
    if (calcRAF) cancelAnimationFrame(calcRAF);
    calcRAF = requestAnimationFrame(() => {
      updateCalculatorFromState(animated);
      calcRAF = 0;
    });
  }

  function updateCalculatorFromState(animated = true) {
    const { loanAmount, tenureMonths, interestRate } = calcState;
    const { emi, totalInterest, totalAmount } = calcEmi(loanAmount, tenureMonths, interestRate);

    calcState.monthlyEmi = emi;
    calcState.totalInterest = totalInterest;
    calcState.totalAmount = totalAmount;

    loanAmountLabel.textContent = formatCurrency(loanAmount);
    tenureLabel.textContent = tenureMonths + " months";

    if (interestLabel) interestLabel.textContent = interestRate.toFixed(2) + "% p.a.";
    if (interestRateLabel) interestRateLabel.textContent = interestRate.toFixed(2) + "% p.a.";
    if (interestInput) interestInput.value = interestRate.toFixed(2);
    if (interestRange) interestRange.value = interestRate;

    const updateText = (el, value, prefix = "₹ ") => {
      if (!el) return;
      if (typeof gsap !== "undefined") gsap.killTweensOf(el);

      if (!animated || typeof gsap === "undefined") {
        el.textContent = prefix + Math.round(value).toLocaleString("en-IN");
        return;
      }

      const currentText = el.textContent.replace(/[^\d]/g, "");
      const current = parseInt(currentText || "0", 10);
      const obj = { val: current };

      gsap.to(obj, {
        val: value,
        duration: 0.35,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = prefix + Math.round(obj.val).toLocaleString("en-IN");
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
    scheduleCalculatorUpdate(true);
  }

  function syncTenure(newVal) {
    const val = Number(newVal);
    if (Number.isNaN(val) || val <= 0) return;
    calcState.tenureMonths = val;
    tenureRange.value = val;
    tenureInput.value = val;
    scheduleCalculatorUpdate(true);
  }

  function syncInterest(newVal) {
    const val = Number(newVal);
    if (Number.isNaN(val) || val <= 0) return;
    calcState.interestRate = val;
    if (interestRange) interestRange.value = val;
    if (interestInput) interestInput.value = val.toFixed(2);
    scheduleCalculatorUpdate(true);
  }

  loanAmountRange.value = calcState.loanAmount;
  loanAmountInput.value = calcState.loanAmount;
  tenureRange.value = calcState.tenureMonths;
  tenureInput.value = calcState.tenureMonths;
  if (interestRange) interestRange.value = calcState.interestRate;
  if (interestInput) interestInput.value = calcState.interestRate.toFixed(2);
  updateCalculatorFromState(false);

  loanAmountRange.addEventListener("input", (e) => syncLoanAmount(e.target.value), { passive: true });
  loanAmountInput.addEventListener("change", (e) => syncLoanAmount(e.target.value));
  tenureRange.addEventListener("input", (e) => syncTenure(e.target.value), { passive: true });
  tenureInput.addEventListener("change", (e) => syncTenure(e.target.value));
  if (interestRange) interestRange.addEventListener("input", (e) => syncInterest(e.target.value), { passive: true });
  if (interestInput) interestInput.addEventListener("change", (e) => syncInterest(e.target.value));

  // ------------------ PREWARM RENDER (optional but helps) ------------------
  (function prewarm() {
    const base = window.LOANYFY_API_BASE || "";
    fetch(base + "/health").catch(() => {});
  })();

  // ------------------ CREATE APPLICATION HELPER ------------------
  async function createApplication(productType) {
    const base = window.LOANYFY_API_BASE || "";

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

    const res = await fetch(base + "/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Create application failed");
    const data = await res.json().catch(() => null);
    applicationId = data?.applicationId || data?.id || applicationId;
    return applicationId;
  }

  async function ensureApplicationId(productTypeForCreate = "Business Loan") {
    if (applicationId) return applicationId;
    return await createApplication(productTypeForCreate);
  }

  // ------------------ STEP 3 -> STEP 4 (INSTANT) ------------------
  const overdraftBtn = document.getElementById("processOverdraftBtn");
  const termLoanBtn = document.getElementById("processTermLoanBtn");

  function setProcessButtonsLoading(isLoading) {
    const btns = [overdraftBtn, termLoanBtn].filter(Boolean);
    btns.forEach((b) => {
      b.disabled = isLoading;
      b.style.opacity = isLoading ? "0.7" : "1";
      b.style.pointerEvents = isLoading ? "none" : "auto";
    });

    if (overdraftBtn) overdraftBtn.textContent = isLoading ? "Processing..." : "Overdraft Limit";
    if (termLoanBtn) termLoanBtn.textContent = isLoading ? "Processing..." : "Term Loan";
  }

  async function handleProcessClick(productType) {
    if (isProcessingApplication) return;
    isProcessingApplication = true;
    setProcessButtonsLoading(true);

    // ✅ move forward instantly (no 20 sec wait)
    thankYouNameEl.textContent = basic.fullName || "there";
    showStep(4);
    playConfetti();

    // ✅ create application in background
    createApplication(productType)
      .catch((e) => console.error("Background create failed:", e))
      .finally(() => {
        isProcessingApplication = false;
        setProcessButtonsLoading(false);
      });
  }

  if (overdraftBtn) overdraftBtn.addEventListener("click", () => handleProcessClick("Overdraft Limit"));
  if (termLoanBtn) termLoanBtn.addEventListener("click", () => handleProcessClick("Term Loan"));

  // ------------------ STEP 4: DOC UPLOAD ------------------
  const submitDocsBtn = document.getElementById("submitDocsBtn");
  const startAgainBtn = document.getElementById("startAgainBtn");

  if (startAgainBtn) startAgainBtn.addEventListener("click", () => window.location.reload());

  function setUploadLoading(isLoading) {
    if (!submitDocsBtn) return;
    submitDocsBtn.disabled = isLoading;
    submitDocsBtn.style.opacity = isLoading ? "0.75" : "1";
    submitDocsBtn.style.pointerEvents = isLoading ? "none" : "auto";
    submitDocsBtn.textContent = isLoading ? "Uploading..." : "Upload Documents Securely";
  }

  if (submitDocsBtn) {
    submitDocsBtn.addEventListener("click", async () => {
      if (isUploadingDocs) return;
      isUploadingDocs = true;
      setUploadLoading(true);

      const base = window.LOANYFY_API_BASE || "";

      try {
        // ✅ guarantee applicationId exists
        await ensureApplicationId("Business Loan");

        const formData = new FormData();
        formData.append("applicationId", applicationId);

        const docPan = document.getElementById("docPan")?.files?.[0];
        const docAadhaar = document.getElementById("docAadhaar")?.files?.[0];
        const docBusinessReg = document.getElementById("docBusinessReg")?.files?.[0];
        const docElectricity = document.getElementById("docElectricityBill")?.files?.[0];
        const bankFiles = Array.from(document.getElementById("docBankStatements")?.files || []);

        if (docPan) formData.append("pan", docPan);
        if (docAadhaar) formData.append("aadhaar", docAadhaar);
        if (docBusinessReg) formData.append("businessReg", docBusinessReg);
        if (docElectricity) formData.append("electricityBill", docElectricity);
        bankFiles.forEach((file) => formData.append("bankStatements", file));

        const res = await fetch(base + "/api/applications/upload-docs", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          // ✅ show green success screen only on true success
          if (typeof window.LOANYFY_openUploadSuccess === "function") {
            window.LOANYFY_openUploadSuccess();
          } else {
            alert("Documents uploaded securely. Thank you!");
          }
        } else {
          const errText = await res.text().catch(() => "");
          console.error("Upload failed:", res.status, errText);
          alert("There was an issue uploading your documents. Please try again.");
        }
      } catch (err) {
        console.error(err);
        alert("We could not upload right now. Please try again in some time.");
      } finally {
        isUploadingDocs = false;
        setUploadLoading(false);
      }
    });
  }

  function playConfetti() {
    const pieces = document.querySelectorAll(".confetti");
    if (typeof gsap === "undefined") return;

    gsap.killTweensOf(pieces);
    gsap.fromTo(
      pieces,
      { y: -20, opacity: 0, scale: 0.7, rotation: -20 },
      { y: 40, opacity: 1, scale: 1, rotation: 20, duration: 0.8, ease: "power3.out", stagger: 0.1 }
    );

    gsap.killTweensOf("#thankYouName");
    gsap.fromTo("#thankYouName", { scale: 0.95 }, { scale: 1.05, duration: 0.45, ease: "back.out(2)" });
  }

  // ------------------ GLOBAL ANIMATIONS ------------------
  function initGlobalAnimations() {
    if (typeof gsap === "undefined") return;

    gsap.from(".card", { y: 24, opacity: 0, duration: 0.6, ease: "power2.out" });

    gsap.to(".primary-btn", {
      y: -2,
      repeat: -1,
      yoyo: true,
      duration: 2.2,
      ease: "sine.inOut",
      stagger: 0.25,
    });

    gsap.from(".blob", { opacity: 0, duration: 1.1, stagger: 0.12 });
  }

  initGlobalAnimations();
  showStep(1);
});
