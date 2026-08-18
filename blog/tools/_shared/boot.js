/* Boot a single renovation tool on an AiTeemo standalone page. */
(function () {
  const HOME = window.AITEEMO_TOOLS_HOME || "../index.html";
  const tool = window.AITEEMO_TOOL || "style-quiz";

  if (typeof StyleQuizManager === "undefined") {
    console.error("StyleQuizManager missing");
    return;
  }

  StyleQuizManager.prototype.renderToolsHome = function () {
    window.location.href = HOME;
  };

  if (typeof WasteGuideManager !== "undefined") {
    const orig = WasteGuideManager.prototype.render;
    WasteGuideManager.prototype.render = function (container) {
      if (window.AITEEMO_WASTE_GUIDE_URL) this.sourceUrl = window.AITEEMO_WASTE_GUIDE_URL;
      return orig.call(this, container);
    };
  }

  const quiz = new StyleQuizManager();
  const quizStates = ["intro", "quiz", "result"];
  const map = {
    "style-quiz": "intro",
    colorcard: "colorcard",
    wirecalc: "wirecalc",
    heating: "heating",
    md2img: "md2img",
    wasteguide: "wasteguide",
    questionnaire: "questionnaire",
  };

  if (tool === "style-quiz") {
    if (!quizStates.includes(quiz.state)) quiz.state = "intro";
  } else {
    quiz.state = map[tool] || "intro";
  }
  quiz.renderAll();
})();
