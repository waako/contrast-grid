var EightShapes = EightShapes || {};
EightShapes.ColorForm = (function () {
  "use strict";

  var $colorForm,
    $foregroundColorsInput,
    $backgroundColorsInput,
    foregroundColors,
    backgroundColors;

  /**
   * Regular expression to match valid color formats:
   * - Hexadecimal (#RGB, #RRGGBB, #RRGGBBAA)
   * - RGB(A) (`rgb(r, g, b)`, `rgb(r g b)`, `rgba(r, g, b, a)`, `rgba(r g b a)`)
   * - HSL(A) (`hsl(h, s%, l%)`, `hsl(h s% l%)`, `hsla(h, s%, l%, a)`)
   * - HWB (`hwb(h, w%, b%)`, `hwb(h w% b%)`)
   * - Named colors (`red`, `blue`, `gold`, etc.)
   * - Supports an optional comma-separated label: `color, label`
   */
  var colorRegex = /(#?[A-Fa-f0-9]{3,8}|rgb(a?)\(\s*([\d.%]+\s*[, ]\s*[\d.%]+\s*[, ]\s*[\d.%]+(?:\s*[, ]\s*[\d.%]+)?)\s*\)|hsl(a?)\(\s*([\d.%]+\s*[, ]\s*[\d.%]+\s*[, ]\s*[\d.%]+(?:\s*[, ]\s*[\d.%]+)?)\s*\)|hwb\(\s*([\d.%]+\s*[, ]\s*[\d.%]+\s*[, ]\s*[\d.%]+)\s*\)|\b[a-zA-Z]+\b(?!\())/gim;

  /**
   * Parses a color string and returns it in the appropriate format.
   * Retains the original format where possible (HEX, RGB(A), HSL(A)).
   *
   * @param {string} color - The color input string.
   * @returns {string|null} - The parsed color string in the correct format, or null if invalid.
   */
  function parseColor(color) {
    try {
      let parsedColor = chroma(color); // Parse using Chroma.js
      let alpha = parsedColor.alpha(); // Extract alpha transparency

      // Preserve the original format where possible
      if (color.startsWith("rgb")) {
        let rgba = parsedColor.rgba();
        return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${alpha.toFixed(2)})`;
      } else if (color.startsWith("hsl") || color.includes("turn")) {
        let hsl = parsedColor.hsl();
        return `hsla(${Math.round(hsl[0])}, ${Math.round(hsl[1] * 100)}%, ${Math.round(hsl[2] * 100)}%, ${alpha.toFixed(2)})`;
      } else {
        return parsedColor.hex().toUpperCase(); // Default to HEX for other cases
      }
    } catch (e) {
      return null; // Return null for invalid colors
    }
  }

  /**
   * Processes a multiline color input from a textarea.
   * Extracts colors and optional labels, ensuring correct formatting.
   *
   * @param {string} textareaValue - The raw input text from the textarea.
   * @returns {Array<Object>} - An array of color objects with optional labels.
   */
  function processColorInput(textareaValue) {
    var colorValues = [],
    colors = [];

    // Split input into individual lines
    var lines = textareaValue.split(/\r?\n/);

    lines.forEach(function (line) {
      var trimmedLine = line.trim();
      if (!trimmedLine) return; // Skip empty lines

      var m = trimmedLine.match(colorRegex);
      if (!m) return; // Skip invalid lines

      var colorEntry = m[0].trim();
      var label = "";

      // Extract optional label (comma-separated)
      var lastCommaIndex = line.lastIndexOf(",");
      if (lastCommaIndex !== -1) {
        let potentialColor = line.substring(0, lastCommaIndex).trim();
        let potentialLabel = line.substring(lastCommaIndex + 1).trim();

        if (parseColor(potentialColor)) {
          colorEntry = potentialColor;
          label = potentialLabel;
        }
      }

      var colorOutput = parseColor(colorEntry);
      if (colorOutput) {
        var colorData = { color: colorOutput };
        if (label.length > 0) {
          colorData.label = label;
        }

        if (!colorValues.includes(colorOutput)) {
          colorValues.push(colorOutput);
          colors.push(colorData);
        }
      }
    });

    console.log("Processed Colors:", colors); // 🔥 DEBUG: Print parsed colors & labels
    return colors;
  }

  function updateInputText(inputName, text) {
    $("#es-color-form__" + inputName + "-colors").val(text);
  }

  function convertGridDataToText(colors) {
    var text = "";

    colors.forEach(function (colorData) {
      text += colorData.hex;
      if (typeof colorData.label !== "undefined") {
        text += ", " + colorData.label;
      }
      text += "\n";
    });
    return text;
  }

  function removeColorFromData(hex, colors) {
    colors = colors.filter(function (color) {
      return color.hex !== hex ? true : false;
    });
    return colors;
  }

  var removeColor = function removeColor(e, hex, colorset) {
    colorset =
    colorset === "background" && backgroundColors.length === 0
    ? "foreground"
    : colorset;
    var colors =
    colorset === "background" ? backgroundColors : foregroundColors,
    gridDataText = "";
    colors = removeColorFromData(hex, colors);
    gridDataText = convertGridDataToText(colors);
    updateInputText(colorset, gridDataText);
    broadcastFormValueChange();
  };

  function getCurrentGridData() {
    $colorForm.find(".es-color-form__textarea").each(function () {
      processColorInput($(this));
    });

    var gridData = {
      foregroundColors: foregroundColors,
      backgroundColors: backgroundColors,
    };

    return gridData;
  }

  function broadcastFormValueChange() {
    var gridData = getCurrentGridData();
    $(document).trigger("escg.colorFormValuesChanged", [gridData]);
    updateUrl();
  }

  function sortForegroundColors(e, sortedColorsKey) {
    var sortedForegroundColors = [],
    gridDataText = "";
    sortedColorsKey.forEach(function (hexKey) {
      foregroundColors.forEach(function (colorData) {
        if (colorData.hex === hexKey) {
          sortedForegroundColors.push(colorData);
        }
      });
    });
    gridDataText = convertGridDataToText(sortedForegroundColors);
    updateInputText("foreground", gridDataText);
    broadcastFormValueChange();
  }

  function sortBackgroundColors(e, sortedColorsKey) {
    var sortedBackgroundColors = [],
    gridDataText = "",
    inputField = "",
    startingColorData;

    if (backgroundColors.length > 0) {
      inputField = "background";
      startingColorData = backgroundColors;
    } else {
      inputField = "foreground";
      startingColorData = foregroundColors;
    }

    sortedColorsKey.forEach(function (hexKey) {
      startingColorData.forEach(function (colorData) {
        if (colorData.hex === hexKey) {
          sortedBackgroundColors.push(colorData);
        }
      });
    });
    gridDataText = convertGridDataToText(sortedBackgroundColors);
    updateInputText(inputField, gridDataText);
    broadcastFormValueChange();
  }

  function toggleBackgroundColorsInput(e) {
    if (typeof e !== "undefined") {
      e.preventDefault();
    }
    var $backgroundColors = $("#es-color-form__background-colors"),
    $foregroundColors = $("#es-color-form__foreground-colors");
    if (
      $(".es-color-form").hasClass(
        "es-color-form--show-background-colors-input"
      )
    ) {
      // hide the background Colors Input
      $(".es-color-form").removeClass(
        "es-color-form--show-background-colors-input"
      );
      $("label[for='es-color-form__foreground-colors']").text("Rows & Columns");
      $foregroundColors.attr("data-persisted-text", $foregroundColors.val());
      $foregroundColors.val($backgroundColors.val());
      $backgroundColors.val("");
      broadcastFormValueChange();
    } else {
      // show the background Colors Input
      $(".es-color-form").addClass(
        "es-color-form--show-background-colors-input"
      );
      $("label[for='es-color-form__foreground-colors']").text("Columns");

      if ($backgroundColors.val().length == 0) {
        // $backgroundColors will already have a value when loading from the url
        $backgroundColors.val($foregroundColors.val());
      }

      if (
        typeof $foregroundColors.attr("data-persisted-text") !== "undefined"
      ) {
        $foregroundColors.val($foregroundColors.attr("data-persisted-text"));
      }
      broadcastFormValueChange();
    }
  }

  function broadcastTileSizeChange(e) {
    var tileSize = $colorForm
    .find("input[name='es-color-form__tile-size']:checked")
    .val();
    $(document).trigger("escg.tileSizeChanged", [tileSize]);
    updateUrl();
  }

  function broadcastCodeSnippetViewToggle(e) {
    e.preventDefault();
    $(document).trigger("escg.showCodeSnippet");
  }

  function updateUrl() {
    const url = window.location.origin + window.location.pathname + "?" + $colorForm.serialize();
    window.history.pushState(false, false, url);
  }

  // function disableFormFields() {
  //     $colorForm.find("textarea, input").prop("disabled", true);
  // }

  // function enableFormFields() {
  //     $colorForm.find("textarea, input").prop("disabled", false);
  // }

  function initializeEventHandlers() {
    $foregroundColorsInput.typeWatch({
      wait: 500,
      callback: broadcastFormValueChange,
    });
    $backgroundColorsInput.typeWatch({
      wait: 500,
      callback: broadcastFormValueChange,
    });
    $(document).on("escg.removeColor", removeColor);
    $(document).on("escg.columnsSorted", sortForegroundColors);
    $(document).on("escg.rowsSorted", sortBackgroundColors);
    // $(document).on('escg.show-tab-es-tabs__global-panel--copy-code', disableFormFields);
    // $(document).on('escg.show-tab-es-tabs__global-panel--analyze', enableFormFields);
    $(
      ".es-color-form__show-background-colors, .es-color-form__hide-background-colors"
    ).on("click", toggleBackgroundColorsInput);
    $("input[name='es-color-form__tile-size']").on(
      "change",
      broadcastTileSizeChange
    );
    $("input[name='es-color-form__show-contrast']").on("change", function () {
      EightShapes.ContrastGrid.addAccessibilityToSwatches();
      updateUrl();
    });
    $(".es-color-form__view-code-toggle").on(
      "click",
      broadcastCodeSnippetViewToggle
    );
  }

  function loadFormDataFromUrl() {
    if (location.search.substr(1).length > 0) {
      $colorForm.deserialize(location.search.substr(1));
    } else {
      // loading for the first time, no query string
      enableAllContrastSwatches();
    }

    // Toggling contrast swatches was added in version 1.1.0, if the URL was saved prior to that version, enable all contrast swatch tiles by default
    if (!location.search.substr(1).includes("version=1.1.0")) {
      enableAllContrastSwatches();
    }

    if ($backgroundColorsInput.val().length > 0) {
      toggleBackgroundColorsInput();
    }
  }

  function enableAllContrastSwatches() {
    // toggle all accessibility swatches on
    $("input[name='es-color-form__show-contrast']").attr("checked", true);
  }

  var initialize = function initialize() {
    $colorForm = $(".es-color-form");
    $foregroundColorsInput = $("#es-color-form__foreground-colors");
    $backgroundColorsInput = $("#es-color-form__background-colors");
    loadFormDataFromUrl();
    initializeEventHandlers();
    broadcastFormValueChange();
    broadcastTileSizeChange();
  };

  var public_vars = {
    initialize: initialize,
    removeColor: removeColor,
    updateUrl: updateUrl,
  };

  return public_vars;
})();
