/**
 * lueckentext.js — Per-character fill-in-the-blank
 *
 * HTML: <span class="luecke"><input data-answer="los servicios" /></span>
 * JS replaces each <input> with individual character boxes.
 * Typing flows naturally — auto-advances on correct, backspace goes back.
 */
(function () {
  "use strict";

  // Inject CSS once
  var style = document.createElement("style");
  style.textContent = [
    "span.luecke { display:inline-flex; align-items:baseline; gap:0; vertical-align:baseline; flex-wrap:nowrap; background:#f8f6ff; border:2px dashed #a29bfe; border-radius:8px; padding:2px 4px; }",
    "span.luecke input.lt-orig { display:none; }",
    "span.luecke .lt-ch {",
    "  width:1.1em; height:1.5em; font-family:inherit; font-size:inherit; font-weight:700;",
    "  text-align:center; border:none; border-bottom:2px solid #a29bfe;",
    "  background:transparent; color:#2d3436; outline:none; padding:0; margin:0;",
    "  transition: border-color 0.15s, color 0.15s;",
    "  -webkit-text-fill-color: inherit;",
    "}",
    "span.luecke .lt-ch:focus { border-color:#6c5ce7; background:rgba(108,92,231,0.06); }",
    "span.luecke .lt-ch.ok { color:#00b894; border-color:#00b894; }",
    "span.luecke .lt-ch.err { color:#e17055; border-color:#e17055; }",
    "span.luecke .lt-ch::placeholder { color:#b2bec3; }",
    "span.luecke .lt-gap { width:0.5em; flex-shrink:0; border-bottom:2px solid transparent; }",
    "span.luecke.lt-done { background:#e6f9f3; border-color:#00b894; }",
    "span.luecke.lt-done .lt-ch { color:#00b894; border-color:transparent; }",
    "#lt-progress { font-weight:700; font-size:16px; color:#6c5ce7; text-align:center; padding:12px 16px; }",
    "#lt-congrats { display:none; text-align:center; font-weight:800; font-size:20px; color:#00b894; padding:16px; }",
    "#lt-congrats.show { display:block; }",
  ].join("\n");
  document.head.appendChild(style);

  document.addEventListener("DOMContentLoaded", function () {
    var originals = document.querySelectorAll("span.luecke input[data-answer]");
    if (!originals.length) return;

    var total = originals.length;
    var solved = 0;
    var allBlanks = []; // [{span, chars[], answer, done}]

    var progressEl = document.getElementById("lt-progress");
    var congratsEl = document.getElementById("lt-congrats");

    function updateProgress() {
      if (progressEl) progressEl.textContent = solved + " von " + total + " richtig";
      if (congratsEl && solved === total) {
        congratsEl.textContent = "Super, alles richtig! Gut gemacht!";
        congratsEl.classList.add("show");
      }
    }
    updateProgress();

    originals.forEach(function (orig, blankIdx) {
      var answer = (orig.getAttribute("data-answer") || "").trim();
      var span = orig.parentNode;
      orig.classList.add("lt-orig");

      var chars = [];
      var blank = { span: span, chars: chars, answer: answer, done: false };
      allBlanks.push(blank);

      for (var i = 0; i < answer.length; i++) {
        if (answer[i] === " ") {
          var gap = document.createElement("span");
          gap.className = "lt-gap";
          span.appendChild(gap);
          chars.push(null); // null = space position
        } else {
          var ci = document.createElement("input");
          ci.type = "text";
          ci.className = "lt-ch";
          ci.maxLength = 1;
          ci.placeholder = "_";
          ci.setAttribute("autocomplete", "off");
          ci.setAttribute("autocorrect", "off");
          ci.setAttribute("autocapitalize", "off");
          ci.setAttribute("spellcheck", "false");
          ci.dataset.pos = String(i);
          ci.dataset.expect = answer[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          span.appendChild(ci);
          chars.push(ci);

          (function (charInput, pos) {
            charInput.addEventListener("input", function () {
              if (charInput.readOnly) return;
              var val = charInput.value;
              if (!val) return;

              // Take only first char
              val = val.charAt(val.length - 1);
              charInput.value = val;

              if (val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === charInput.dataset.expect) {
                charInput.classList.remove("err");
                charInput.classList.add("ok");
                charInput.readOnly = true;
                // Show proper case
                charInput.value = answer[pos];
                // Check if blank is complete
                if (isBlankDone(blank)) {
                  markBlankDone(blank, blankIdx);
                } else {
                  focusNextChar(blank, pos);
                }
              } else {
                charInput.classList.add("err");
                setTimeout(function () {
                  charInput.classList.remove("err");
                  charInput.value = "";
                }, 400);
              }
            });

            charInput.addEventListener("keydown", function (e) {
              if (e.key === "Backspace") {
                e.preventDefault();
                if (charInput.value) {
                  // Clear current field and make editable again
                  undoChar(charInput, blank);
                } else {
                  // Move to previous char and clear it
                  var prev = findPrevChar(blank, pos);
                  if (prev) {
                    undoChar(prev, blank);
                    prev.focus();
                  }
                }
              }
            });
          })(ci, i);
        }
      }
    });

    function undoChar(charInput, blank) {
      charInput.value = "";
      charInput.readOnly = false;
      charInput.classList.remove("ok", "err");
      if (blank.done) {
        blank.done = false;
        blank.span.classList.remove("lt-done");
        solved--;
        updateProgress();
      }
    }

    function findPrevChar(blank, fromPos) {
      for (var i = fromPos - 1; i >= 0; i--) {
        if (blank.chars[i] !== null) return blank.chars[i];
      }
      return null;
    }

    function isBlankDone(blank) {
      for (var i = 0; i < blank.chars.length; i++) {
        var c = blank.chars[i];
        if (c !== null && !c.readOnly) return false;
      }
      return true;
    }

    function markBlankDone(blank, blankIdx) {
      blank.done = true;
      blank.span.classList.add("lt-done");
      solved++;
      updateProgress();
      // Focus first char of next unsolved blank
      for (var i = blankIdx + 1; i < allBlanks.length; i++) {
        if (!allBlanks[i].done) {
          focusFirstChar(allBlanks[i]);
          return;
        }
      }
      // Wrap around
      for (var j = 0; j < allBlanks.length; j++) {
        if (!allBlanks[j].done) {
          focusFirstChar(allBlanks[j]);
          return;
        }
      }
    }

    function focusNextChar(blank, fromPos) {
      for (var i = fromPos + 1; i < blank.chars.length; i++) {
        var c = blank.chars[i];
        if (c !== null && !c.readOnly) { c.focus(); return; }
      }
    }

    function focusPrevChar(blank, fromPos) {
      for (var i = fromPos - 1; i >= 0; i--) {
        var c = blank.chars[i];
        if (c !== null && !c.readOnly) { c.focus(); return; }
      }
    }

    function focusFirstChar(blank) {
      for (var i = 0; i < blank.chars.length; i++) {
        var c = blank.chars[i];
        if (c !== null && !c.readOnly) { c.focus(); return; }
      }
    }
  });
})();
