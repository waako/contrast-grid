var EightShapes = EightShapes || {};
EightShapes.ColorForm = (function () {
  "use strict";

  var $colorForm,
    $foregroundColorsInput,
    $backgroundColorsInput,
    foregroundColors,
    backgroundColors;

  /**
   * Regular expression to capture various color formats:
   * - Hexadecimal (#RGB, #RRGGBB, #RRGGBBAA)
   * - RGB and RGBA (`rgb(r g b)`, `rgb(r, g, b)`, `rgba(r g b a)`, `rgba(r, g, b, a)`)
   * - HSL (`hsl(h s% l%)`, `hsl(h, s%, l%)`)
   * - HWB (`hwb(h w% b%)`, `hwb(h, w%, b%)`)
   * - Named colors (`red`, `blue`, `darkgoldenrod`, etc.)
   * - Supports an optional custom label in the format: `color, label`
   */
  var colorRegex = /(#?[A-Fa-f0-9]{3,8}                  # Hex color (#RGB, #RRGGBB, #RRGGBBAA)
                    |rgb(a?)\(\s*([\d\s,%.]+)\s*\)       # RGB/RGBA (supports space & comma separators)
                    |hsl\(\s*([\d\s,%.]+)\s*\)           # HSL (supports space & comma separators)
                    |hwb\(\s*([\d\s,%.]+)\s*\)           # HWB (supports space & comma separators)
                    |\b[a-zA-Z]+\b(?!\()                 # Named colors (e.g., "red", "blue", "gold")
                   )/gimx;                               // Flags: g (global), i (case-insensitive), m (multiline), x (extended for readability)


  /**
   * Converts various color formats into a standardized HEX representation.
   * Uses Chroma.js for reliable color parsing.
   *
   * @param {string} color - The color string in any supported format.
   * @returns {string|null} - The corresponding HEX color code or null if invalid.
   */
  function parseColorToHex(color) {
    try {
      return chroma(color).hex().toUpperCase();
    } catch (e) {
      return null;
    }
  }

  /**
   * Processes user input from the color form, extracting valid color values,
   * converting them to HEX, and storing optional labels.
   *
   * @param {jQuery} $input - The jQuery object for the input field being processed.
   */
  function processColorInput($input) {
    var value = $input.val(),
      m,
      hexValues = [],
      colors = [];

    while ((m = colorRegex.exec(value)) !== null) {
      if (m.index === colorRegex.lastIndex) {
        colorRegex.lastIndex++;
      }

      var colorEntry = m[0].trim();
      var label = "";

      // Check if color entry contains a label (format: "color, label")
      if (colorEntry.includes(",")) {
        let parts = colorEntry.split(",").map(s => s.trim());
        colorEntry = parts[0]; // Extract the actual color value
        label = parts.slice(1).join(", "); // Handle multiple commas in label
      }

      var hex = parseColorToHex(colorEntry);
      if (hex) {
        var colorData = { hex: hex };
        if (label.length > 0) {
          colorData.label = label; // Preserve user-defined labels
        }

        if (!hexValues.includes(hex)) {
          hexValues.push(hex);
          colors.push(colorData);
        }
      }
    }

    if ($input.attr("id") === "es-color-form__foreground-colors") {
      foregroundColors = colors;
    } else if ($input.attr("id") === "es-color-form__background-colors") {
      backgroundColors = colors;
    }
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
