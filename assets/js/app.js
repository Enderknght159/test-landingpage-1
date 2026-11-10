/* ============================================================
   MOZ Agency — interactions
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var doc = document.documentElement;
  if (reduce) doc.classList.add("no-anim");

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Progress + header state ---------- */
  var progressBar = $("#progressBar");
  var header = $("#siteHeader");
  var ticking = false;

  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.scrollY / max : 0;
    if (progressBar) progressBar.style.transform = "scaleX(" + Math.min(1, Math.max(0, p)) + ")";
    if (header) header.classList.toggle("is-stuck", window.scrollY > 40);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  $$("[data-stagger]").forEach(function (group) {
    $$(":scope > *", group).forEach(function (el, i) {
      if (!el.style.getPropertyValue("--d")) {
        el.style.setProperty("--d", Math.min(i, 10) * 65 + "ms");
      }
    });
  });

  var revealEls = $$("[data-reveal]");

  function show(el) { el.classList.add("is-in"); }

  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });

    var barObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); barObs.unobserve(entry.target); }
      });
    }, { threshold: 0.3 });
    $$(".tl-bar").forEach(function (el) { barObs.observe(el); });
  } else {
    revealEls.forEach(show);
    $$(".tl-bar").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Counters ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target)) return;
    el.textContent = target;
    if (reduce) return;
    var start = null, dur = 1500;
    el.textContent = "0";
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) window.requestAnimationFrame(step);
      else el.textContent = target;
    }
    window.requestAnimationFrame(step);
    /* safety net: never leave a counter stuck at zero */
    window.setTimeout(function () { el.textContent = target; }, dur + 400);
  }

  var counters = $$("[data-count]");
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        co.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------- Contents overlay ---------- */
  var toc = $("#tocOverlay");
  var tocOpen = $("#tocOpen");
  var tocClose = $("#tocClose");
  var lastFocus = null;

  function openToc() {
    if (!toc) return;
    lastFocus = document.activeElement;
    toc.classList.add("is-open");
    document.body.classList.add("is-locked");
    if (tocOpen) tocOpen.setAttribute("aria-expanded", "true");
    if (tocClose) tocClose.focus();
  }
  function closeToc() {
    if (!toc) return;
    toc.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    if (tocOpen) tocOpen.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (tocOpen) tocOpen.addEventListener("click", openToc);
  if (tocClose) tocClose.addEventListener("click", closeToc);
  $$(".toc__row", toc).forEach(function (a) { a.addEventListener("click", closeToc); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && toc && toc.classList.contains("is-open")) closeToc();
  });

  /* ---------- Chapter chip + scroll spy ---------- */
  var chip = $("#chapterChip");
  var chipNum = $("#chipNum");
  var chipLabel = $("#chipLabel");
  var chapNum = $("#chapNum");
  var chapName = $("#chapName");
  var sections = $$("[data-chapter]");

  if (chip) chip.addEventListener("click", openToc);

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var num = el.getAttribute("data-chapter");
        var title = el.getAttribute("data-title");
        if (chipNum) chipNum.textContent = num;
        if (chipLabel) chipLabel.textContent = title;
        if (chapNum) chapNum.textContent = num;
        if (chapName) chapName.textContent = title;
        if (chip) chip.classList.toggle("is-on", el.id !== "cover");
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Spotlight hover ---------- */
  $$("[data-spot]").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ---------- Contract calendar ---------- */
  var CAL_MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  var DOW = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

  var PERIODS = [
    { key: "p1", from: "2026-11-08", to: "2026-11-22", color: "#2fb16f", label: "التأسيس" },
    { key: "p2", from: "2026-11-23", to: "2027-03-31", color: "#d9c51f", label: "ما قبل الإعلان" },
    { key: "p3", from: "2027-04-01", to: "2027-04-30", color: "#f08a2c", label: "الإعلان" },
    { key: "p4", from: "2027-05-01", to: "2027-06-14", color: "#f0453a", label: "ما قبل الإطلاق" },
    { key: "p5", from: "2027-06-15", to: "2027-08-01", color: "#8a4dff", label: "ما بعد الإطلاق" },
    { key: "p6", from: "2027-08-02", to: "2027-11-07", color: "#2d9cdb", label: "الاستمرارية" }
  ];
  var MILESTONES = ["2026-11-08", "2027-04-01", "2027-06-15", "2027-11-07"];

  function iso(y, m, d) {
    return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  function periodFor(key) {
    for (var i = 0; i < PERIODS.length; i++) {
      if (key >= PERIODS[i].from && key <= PERIODS[i].to) return PERIODS[i];
    }
    return null;
  }

  var contractCal = $("#contractCal");
  if (contractCal) {
    var startY = 2026, startM = 10; /* Nov 2026 */
    for (var mi = 0; mi < 13; mi++) {
      var y = startY + Math.floor((startM + mi) / 12);
      var m = (startM + mi) % 12;

      var wrapEl = document.createElement("div");
      wrapEl.className = "cal-month";

      var head = document.createElement("p");
      head.className = "cal-month__title";
      head.innerHTML = CAL_MONTHS_AR[m] + " <span>" + y + "</span>";
      wrapEl.appendChild(head);

      var week = document.createElement("div");
      week.className = "cal-week";
      week.setAttribute("aria-hidden", "true");
      DOW.forEach(function (d) {
        var s = document.createElement("span");
        s.textContent = d;
        week.appendChild(s);
      });
      wrapEl.appendChild(week);

      var grid = document.createElement("div");
      grid.className = "cal-days";

      var firstDow = new Date(Date.UTC(y, m, 1)).getUTCDay();
      var daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      var prevDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
      var cells = [];

      for (var l = firstDow - 1; l >= 0; l--) {
        cells.push({ day: prevDays - l, mut: true });
      }
      for (var d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, mut: false, key: iso(y, m, d) });
      }
      var next = 1;
      while (cells.length % 7 !== 0) {
        cells.push({ day: next++, mut: true });
      }

      cells.forEach(function (c) {
        var cell = document.createElement("span");
        cell.className = "cal-day";
        cell.textContent = c.day;
        if (c.mut) {
          cell.classList.add("mut");
          return void grid.appendChild(cell);
        }
        var p = periodFor(c.key);
        if (p) {
          cell.classList.add("has");
          cell.style.setProperty("--pc", p.color);
          cell.setAttribute("data-period", p.key);
          var tip = c.day + " " + CAL_MONTHS_AR[m] + " — " + p.label;
          if (MILESTONES.indexOf(c.key) !== -1) {
            cell.classList.add("ms");
            tip = c.day + " " + CAL_MONTHS_AR[m] + " — محطة رئيسية";
          }
          cell.title = tip;
        }
        grid.appendChild(cell);
      });

      wrapEl.appendChild(grid);
      contractCal.appendChild(wrapEl);
    }

    /* legend filter */
    var legend = $("#calLegend");
    if (legend) {
      var items = $$(".cal-legend__item", legend);
      var locked = null;
      var days = $$(".cal-day.has", contractCal);

      function applyFilter(key) {
        if (!key) {
          contractCal.classList.remove("is-filtered");
          days.forEach(function (d) { d.classList.remove("on"); });
          items.forEach(function (i) { i.classList.remove("is-muted"); });
          return;
        }
        contractCal.classList.add("is-filtered");
        days.forEach(function (d) { d.classList.toggle("on", d.getAttribute("data-period") === key); });
        items.forEach(function (i) { i.classList.toggle("is-muted", i.getAttribute("data-period") !== key); });
      }

      items.forEach(function (btn) {
        var key = btn.getAttribute("data-period");
        btn.addEventListener("mouseenter", function () { if (!locked) applyFilter(key); });
        btn.addEventListener("focus", function () { if (!locked) applyFilter(key); });
        btn.addEventListener("mouseleave", function () { if (!locked) applyFilter(null); });
        btn.addEventListener("blur", function () { if (!locked) applyFilter(null); });
        btn.addEventListener("click", function () {
          locked = locked === key ? null : key;
          applyFilter(locked);
        });
      });
    }
  }

  /* ---------- Content calendar ---------- */
  var contentCal = $("#contentCal");
  if (contentCal) {
    var DOW_FULL = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    DOW_FULL.forEach(function (d) {
      var h = document.createElement("div");
      h.className = "cc-dow";
      h.textContent = d;
      contentCal.appendChild(h);
    });

    var TYPES = {
      reel: { label: "ريل", color: "#e5342a" },
      post: { label: "بوست", color: "#8a4dff" },
      carousel: { label: "كاروسيل", color: "#17b46a" }
    };
    var SCHEDULE = {
      1: null, 2: null,
      3: "carousel", 4: "reel", 5: "post", 6: "reel", 7: "carousel", 8: "reel", 9: "post",
      10: "carousel", 11: "reel", 12: "post", 13: "reel", 14: "carousel", 15: "reel", 16: "post",
      17: "carousel", 18: "reel", 19: "post", 20: "reel", 21: "carousel", 22: "reel", 23: "post",
      24: "carousel", 25: "reel", 26: "post", 27: "reel", 28: "carousel", 29: "reel", 30: "post", 31: "carousel"
    };
    var SHOOT_DAYS = [9, 23];

    /* December 2026 starts on Tuesday → 2 leading days (29, 30 Nov) */
    for (var lead = 29; lead <= 30; lead++) {
      var lc = document.createElement("div");
      lc.className = "cc-cell cc-cell--mut";
      lc.innerHTML = '<span class="cc-cell__no">' + lead + "</span>" +
        '<span class="cc-cell__none">نوفمبر</span>';
      contentCal.appendChild(lc);
    }

    for (var day = 1; day <= 31; day++) {
      var cell = document.createElement("article");
      cell.className = "cc-cell";
      var type = SCHEDULE[day];

      if (SHOOT_DAYS.indexOf(day) !== -1) cell.classList.add("cc-cell--dark");

      var no = document.createElement("span");
      no.className = "cc-cell__no";
      no.textContent = day;
      cell.appendChild(no);

      if (!type) {
        var none = document.createElement("span");
        none.className = "cc-cell__none";
        none.textContent = "تأسيس";
        cell.appendChild(none);
      } else {
        var t = TYPES[type];
        var tag = document.createElement("span");
        tag.className = "cc-cell__tag";
        tag.style.setProperty("--c", t.color);
        tag.textContent = t.label;
        cell.appendChild(tag);
      }

      var title = day + " ديسمبر — " + (!type ? "تأسيس" : TYPES[type].label);
      if (SHOOT_DAYS.indexOf(day) !== -1) title += " (يوم زيارة تصوير)";
      cell.title = title;
      cell.setAttribute("data-type", type || "setup");

      contentCal.appendChild(cell);
    }
  }
})();
