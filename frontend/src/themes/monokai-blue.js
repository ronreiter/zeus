ace.define("ace/theme/monokai-blue", ["require", "exports", "module", "ace/lib/dom"], function(acequire, exports, module) {

exports.isDark = true;
exports.cssClass = "ace-monokai-blue";
exports.cssText = `.ace-monokai-blue .ace_gutter {
  background: #1a1f2e;
  color: #4f5b66
}

.ace-monokai-blue .ace_print-margin {
  width: 1px;
  background: #233
}

.ace-monokai-blue {
  background-color: #1e2430;
  color: #bfc7d5
}

.ace-monokai-blue .ace_cursor {
  color: #f8f8f0
}

.ace-monokai-blue .ace_marker-layer .ace_selection {
  background: #3e4451
}

.ace-monokai-blue.ace_multiselect .ace_selection.ace_start {
  box-shadow: 0 0 3px 0px #1e2430;
}

.ace-monokai-blue .ace_marker-layer .ace_step {
  background: rgb(102, 82, 0)
}

.ace-monokai-blue .ace_marker-layer .ace_bracket {
  margin: -1px 0 0 -1px;
  border: 1px solid #49483e
}

.ace-monokai-blue .ace_marker-layer .ace_active-line {
  background: #2c3e50
}

.ace-monokai-blue .ace_gutter-active-line {
  background-color: #2c3e50
}

.ace-monokai-blue .ace_marker-layer .ace_selected-word {
  border: 1px solid #49483e
}

.ace-monokai-blue .ace_invisible {
  color: #52524d
}

.ace-monokai-blue .ace_entity.ace_name.ace_tag,
.ace-monokai-blue .ace_keyword,
.ace-monokai-blue .ace_meta.ace_tag,
.ace-monokai-blue .ace_storage {
  color: #3498db
}

.ace-monokai-blue .ace_punctuation,
.ace-monokai-blue .ace_punctuation.ace_tag {
  color: #bfc7d5
}

.ace-monokai-blue .ace_constant.ace_character,
.ace-monokai-blue .ace_constant.ace_language,
.ace-monokai-blue .ace_constant.ace_numeric,
.ace-monokai-blue .ace_keyword.ace_other.ace_unit,
.ace-monokai-blue .ace_support.ace_constant,
.ace-monokai-blue .ace_variable.ace_parameter {
  color: #e74c3c
}

.ace-monokai-blue .ace_constant.ace_other {
  color: white
}

.ace-monokai-blue .ace_invalid {
  color: #f8f8f0;
  background-color: #e74c3c
}

.ace-monokai-blue .ace_invalid.ace_deprecated {
  color: #f8f8f0;
  background-color: #ae81ff
}

.ace-monokai-blue .ace_support.ace_constant {
  color: #9b59b6
}

.ace-monokai-blue .ace_fold {
  background-color: #3498db;
  border-color: #bfc7d5
}

.ace-monokai-blue .ace_entity.ace_name.ace_function,
.ace-monokai-blue .ace_support.ace_function,
.ace-monokai-blue .ace_variable {
  color: #2ecc71
}

.ace-monokai-blue .ace_support.ace_class,
.ace-monokai-blue .ace_support.ace_type {
  color: #52c5f7
}

.ace-monokai-blue .ace_heading,
.ace-monokai-blue .ace_markup.ace_heading,
.ace-monokai-blue .ace_string {
  color: #f39c12
}

.ace-monokai-blue .ace_entity.ace_name.ace_tag,
.ace-monokai-blue .ace_entity.ace_other.ace_attribute-name,
.ace-monokai-blue .ace_meta.ace_tag,
.ace-monokai-blue .ace_string.ace_regexp,
.ace-monokai-blue .ace_variable {
  color: #3498db
}

.ace-monokai-blue .ace_comment {
  color: #5a6374
}

.ace-monokai-blue .ace_indent-guide {
  background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQIHWPQ1NbW+P///4cOHwAAOQMCAPRNDcAAAAAASUVORK5CYII=") right repeat-y
}

.ace-monokai-blue .ace_entity.ace_other.ace_attribute-name {
  color: #52c5f7
}`;

var dom = acequire("../lib/dom");
dom.importCssString(exports.cssText, exports.cssClass, false);

});