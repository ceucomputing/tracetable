// jshint devel:true

$(function() {

  function refreshFlowchart(markup) {
    var holder = $("#mermaid-holder");
    holder.empty();
    $("<div>").addClass("mermaid").text(markup).appendTo(holder);
    mermaid.init();
  }

  $.get("../images/flowchart-factorial.txt", function(data) {
    var result = parser.parse(data);
    console.log(result);
  });

});
