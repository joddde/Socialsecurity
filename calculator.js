(function () {
  "use strict";

  function formatMoney(n) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showError(msg) {
    var err = document.getElementById("error");
    if (!err) return;
    err.textContent = msg;
    err.style.display = "block";
    var res = document.getElementById("result");
    if (res) {
      res.style.display = "none";
      res.innerHTML = "";
    }
  }

  function clearError() {
    var err = document.getElementById("error");
    if (!err) return;
    err.textContent = "";
    err.style.display = "none";
  }

  // Months between now and target date (month precision, ignore days)
  function monthsUntil(targetDate) {
    var now = new Date();
    return (targetDate.getFullYear() - now.getFullYear()) * 12
         + (targetDate.getMonth() - now.getMonth());
  }

  function calculateBreakEven(evt) {
    try {
      if (evt && typeof evt.preventDefault === "function") evt.preventDefault();
      clearError();

      var currentAge = parseInt(document.getElementById("currentAge").value, 10);
      var earlyBenefit = parseFloat(document.getElementById("earlyBenefit").value);
      var lateBenefit = parseFloat(document.getElementById("lateBenefit").value);

      if (isNaN(currentAge) || isNaN(earlyBenefit) || isNaN(lateBenefit)) {
        showError("Please fill in all fields with valid numbers.");
        return;
      }
      if (currentAge < 0 || currentAge > 61) {
        showError("Current Age must be between 0 and 61 for this calculator version.");
        return;
      }
      if (earlyBenefit < 0 || lateBenefit < 0) {
        showError("Benefit amounts must be zero or positive.");
        return;
      }

      // Timing
      var now = new Date();
      var currentYear = now.getFullYear();
      var reductionStart = new Date(2035, 0, 1); // Jan 1, 2035
      var monthsToReduction = monthsUntil(reductionStart);

      // Approximate months to 62/67 (whole-year estimate)
      var monthsTo62 = Math.max(0, (62 - currentAge) * 12);
      var monthsTo67 = (67 - currentAge) * 12;

      // 1) Total collected from 62 to 67 (60 months), applying reduction precisely at 2035
      var monthsBetween62And67 = 60;
      var totalCollectedAt62 = 0;
      for (var m = 0; m < monthsBetween62And67; m++) {
        var idxFromNow = monthsTo62 + m;
        var reduced = idxFromNow >= monthsToReduction; // on/after Jan 2035
        var monthlyAmount = reduced ? earlyBenefit * 0.8 : earlyBenefit;
        totalCollectedAt62 += monthlyAmount;
      }

      // 2) Monthly differences after 67, pre/post reduction
      var D1 = lateBenefit - earlyBenefit; // before 2035
      if (D1 <= 0) {
        showError("Your benefit at 67 must be greater than your benefit at 62 to compute a break-even point.");
        return;
      }
      var D2 = 0.8 * D1; // on/after 2035

      // Months after 67 that still occur before reduction date
      var monthsBeforeReductionAfter67 = Math.max(0, monthsToReduction - monthsTo67);

      // 3) Compute break-even months after 67 across the two segments
      var breakEvenMonthsAfter67 = 0;
      var usedPreReductionMonths = 0;
      var usedPostReductionMonths = 0;

      if (monthsBeforeReductionAfter67 <= 0) {
        // Reduction already in effect at 67
        breakEvenMonthsAfter67 = Math.ceil(totalCollectedAt62 / D2);
        usedPostReductionMonths = breakEvenMonthsAfter67;
      } else {
        var maxCatchUpBeforeReduction = D1 * monthsBeforeReductionAfter67;
        if (totalCollectedAt62 <= maxCatchUpBeforeReduction) {
          // Break-even occurs before 2035
          breakEvenMonthsAfter67 = Math.ceil(totalCollectedAt62 / D1);
          usedPreReductionMonths = breakEvenMonthsAfter67;
        } else {
          // Use all pre-2035 months, then continue post-2035
          var remainingHeadStart = totalCollectedAt62 - maxCatchUpBeforeReduction;
          var extraMonthsAfterReduction = Math.ceil(remainingHeadStart / D2);
          breakEvenMonthsAfter67 = monthsBeforeReductionAfter67 + extraMonthsAfterReduction;
          usedPreReductionMonths = monthsBeforeReductionAfter67;
          usedPostReductionMonths = extraMonthsAfterReduction;
        }
      }

      var breakEvenAge = 67 + (breakEvenMonthsAfter67 / 12);
      var breakEvenAgeStr = breakEvenAge.toFixed(1);

      // Notes for reductions shown to user
      var note62 = "";
      if (monthsTo62 >= monthsToReduction) {
        note62 = "<br>(reduced to $" + formatMoney(earlyBenefit * 0.8) + " on/after Jan 2035)";
      } else if (monthsTo62 + monthsBetween62And67 > monthsToReduction) {
        note62 = "<br>(reduced to $" + formatMoney(earlyBenefit * 0.8) + " starting Jan 2035 within the 62–67 period)";
      }

      var note67 = "";
      if (monthsTo67 >= monthsToReduction) {
        note67 = "<br>(reduced to $" + formatMoney(lateBenefit * 0.8) + " on/after Jan 2035)";
      }

      var catchupLine = ""
        + "<ul>"
        +   "<li>Before Jan 2035: $" + formatMoney(D1) + " (" + monthsBeforeReductionAfter67 + " month" + (monthsBeforeReductionAfter67 === 1 ? "" : "s") + " available)</li>"
        +   "<li>On/after Jan 2035: $" + formatMoney(D2) + "</li>"
        + "</ul>";

      var resultDiv = document.getElementById("result");
      if (resultDiv) {
        resultDiv.style.display = "block";
        resultDiv.innerHTML = ""
          + "<h2>Break-Even Analysis Results:</h2>"
          + "<h3>If you start at age 62:</h3>"
          + "<ul>"
          +   "<li>Monthly benefit: $" + formatMoney(earlyBenefit) + note62 + "</li>"
          +   "<li>Total collected by age 67: $" + formatMoney(totalCollectedAt62) + "</li>"
          + "</ul>"
          + "<h3>If you wait until age 67:</h3>"
          + "<ul>"
          +   "<li>Monthly benefit: $" + formatMoney(lateBenefit) + note67 + "</li>"
          +   "<li>Monthly \"catch-up\" difference after 67:" + catchupLine + "</li>"
          + "</ul>"
          + "<h3>Break-Even Calculation:</h3>"
          + "<ul>"
          +   "<li>Head start from claiming at 62 (collected by age 67): $" + formatMoney(totalCollectedAt62) + "</li>"
          +   "<li>Months used before Jan 2035 at $" + formatMoney(D1) + ": " + usedPreReductionMonths + "</li>"
          +   "<li>Months used on/after Jan 2035 at $" + formatMoney(D2) + ": " + usedPostReductionMonths + "</li>"
          + "</ul>"
          + "<h3>Result:</h3>"
          + "<ul>"
          +   "<li>Break-even age: " + breakEvenAgeStr + " years</li>"
          +   "<li>Time to break even after age 67: " + breakEvenMonthsAfter67 + " months (" + (breakEvenMonthsAfter67/12).toFixed(1) + " years)</li>"
          +   "<li>Total amount to make up: $" + formatMoney(totalCollectedAt62) + "</li>"
          + "</ul>"
          + "<p><strong>Summary:</strong> You would need to live to age " + breakEvenAgeStr
          + " for waiting until age 67 to be financially beneficial. It accounts for the 2035 reduction by applying the pre- and post-2035 monthly differences where they actually occur.</p>";
      }
    } catch (e) {
      console.error(e);
      showError("Unexpected error: " + (e && e.message ? e.message : String(e)));
    }
  }

  // Attach handler when DOM is ready (works with defer as well)
  function init() {
    var btn = document.getElementById("calcBtn");
    if (!btn) {
      console.warn("calcBtn not found; check your HTML id.");
      return;
    }
    btn.addEventListener("click", calculateBreakEven);
    // Also allow Enter key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Enter") calculateBreakEven(e);
    });
    console.log("Calculator initialized");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for inline use if needed (optional)
  window.calculateBreakEven = calculateBreakEven;
})();
