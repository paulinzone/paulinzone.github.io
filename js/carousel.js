(function () {
  "use strict";

  var PHOTO_MS = 4000;
  var MANIFEST_URL = "assets/nina/manifest.json";

  var imgA = document.getElementById("slide-a");
  var imgB = document.getElementById("slide-b");
  var prevBtn = document.getElementById("prev");
  var nextBtn = document.getElementById("next");
  var counter = document.getElementById("counter");
  var caption = document.getElementById("caption");
  var audio = document.getElementById("music");
  var musicBtn = document.getElementById("music-toggle");
  var stage = document.getElementById("stage");

  var slides = [];
  var index = 0;
  var frontIsA = true;
  var timer = null;
  var loadToken = 0;
  var musicStarted = false;

  function byDate(a, b) {
    var da = a.date || "9999-12-31";
    var db = b.date || "9999-12-31";
    return da < db ? -1 : da > db ? 1 : 0;
  }

  function preload(i) {
    if (!slides.length) return;
    var slide = slides[(i + slides.length) % slides.length];
    if (!slide || !slide.src) return;
    var img = new Image();
    img.src = slide.src;
  }


  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function formatDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    var day = parseInt(parts[2], 10);
    var month = MONTHS[parseInt(parts[1], 10) - 1];
    if (!month || !day) return iso;
    return day + " " + month + " " + parts[0];
  }
  function updateCaption() {
    if (!caption || !slides.length) return;
    var d = formatDate(slides[index].date);
    caption.textContent = d ? "\uD83D\uDCC5 " + d : "";
  }

  function updateCounter() {
    if (!slides.length) {
      counter.textContent = "";
      return;
    }
    counter.textContent = index + 1 + " / " + slides.length;
  }

  function show(i, instant) {
    if (!slides.length) return;
    index = (i + slides.length) % slides.length;
    var slide = slides[index];
    var front = frontIsA ? imgA : imgB;
    var back = frontIsA ? imgB : imgA;
    var token = ++loadToken;
    var revealed = false;

    if (instant) {
      back.style.transition = "none";
      front.style.transition = "none";
    }

    function reveal() {
      if (token !== loadToken || revealed) return;
      revealed = true;
      back.classList.add("is-active");
      front.classList.remove("is-active");
      frontIsA = !frontIsA;
      updateCounter();
      updateCaption();
      preload(index + 1);
      if (instant) {
        // Restore fade after the instant swap has painted.
        requestAnimationFrame(function () {
          back.style.transition = "";
          front.style.transition = "";
        });
      }
    }

    back.alt = slide.alt || "";
    if (back.getAttribute("src") === slide.src && back.complete) {
      reveal();
      return;
    }
    back.onload = reveal;
    back.onerror = reveal;
    back.src = slide.src;
    if (back.complete) reveal();
  }

  function stopTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();
    if (slides.length < 2) return;
    timer = setTimeout(function () {
      show(index + 1, false);
      startTimer();
    }, PHOTO_MS);
  }

  function go(delta) {
    show(index + delta, false);
    startTimer();
  }

  function setMusicUi() {
    if (!musicStarted) {
      musicBtn.classList.add("is-prompt");
      musicBtn.setAttribute("aria-pressed", "false");
      musicBtn.textContent = "Tap to play music";
      return;
    }
    musicBtn.classList.remove("is-prompt");
    if (audio.muted || audio.paused) {
      musicBtn.setAttribute("aria-pressed", "false");
      musicBtn.textContent = "Sound off";
    } else {
      musicBtn.setAttribute("aria-pressed", "true");
      musicBtn.textContent = "Sound on";
    }
  }

  async function toggleMusic() {
    try {
      if (!musicStarted || audio.paused) {
        audio.muted = false;
        await audio.play();
        musicStarted = true;
      } else {
        audio.muted = !audio.muted;
      }
    } catch (err) {
      musicStarted = false;
    }
    setMusicUi();
  }

  function onKey(event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  }

  function addSwipe(el) {
    var startX = null;
    var startY = null;
    el.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      startX = event.clientX;
      startY = event.clientY;
    });
    el.addEventListener("pointerup", function (event) {
      if (startX === null) return;
      var dx = event.clientX - startX;
      var dy = event.clientY - startY;
      startX = null;
      startY = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      go(dx < 0 ? 1 : -1);
    });
    el.addEventListener("pointercancel", function () {
      startX = null;
      startY = null;
    });
  }

  async function init() {
    var response = await fetch(MANIFEST_URL);
    if (!response.ok) {
      counter.textContent = "Could not load photos";
      return;
    }
    var data = await response.json();
    slides = (data.slides || []).slice().sort(byDate);
    if (!slides.length) {
      counter.textContent = "No photos yet";
      return;
    }
    show(0, true);
    startTimer();
    prevBtn.addEventListener("click", function () { go(-1); });
    nextBtn.addEventListener("click", function () { go(1); });
    document.addEventListener("keydown", onKey);
    addSwipe(stage);
    musicBtn.addEventListener("click", toggleMusic);
    audio.addEventListener("play", setMusicUi);
    audio.addEventListener("pause", setMusicUi);
    setMusicUi();
  }

  init().catch(function () {
    counter.textContent = "Could not load photos";
  });
})();
