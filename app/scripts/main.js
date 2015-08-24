// jshint devel:true

$(function() {

  var tracetable_scope = {};

  // Renders the given flowchart with the command at index current highlighted.
  // If current is null, flowchart is not being simulated and no command will be highlighted.
  function render(flowchart, current) {

    function refreshFlowchart(markup) {
      var holder = $("#mermaid-holder");
      holder.empty();
      $("<div>").addClass("mermaid").text(markup).appendTo(holder);
      mermaid.init();
    }

    var labels = flowchart["labels"];
    var vars = flowchart["vars"];
    var commands = flowchart["commands"];

    var markup = "graph TD;\n";

    for (var i = 0; i < commands.length; i++) {
      var left = "[";
      var right = "]"
      var command = commands[i];

      switch (command["command"]) {
        case "JUMPIF":
          left = "{"; right = "}"; break;
        case "START":
        case "END":
          left = "("; right = ")"; break;
        case "INPUT":
        case "OUTPUT":
          left = ">"; right = "]"; break;
      }

      // Create nodes
      markup += "node_" + i + left + command.title + right + ";\n";

      // Create connections between nodes
      var chain = (i < commands.length-1) ? (i+1) : null;
      if (command["chain"]) {
        chain = labels[command["chain"]];
      }
      var chainArrow = "-->";
      if (chain) {
        if (command["command"] == "JUMPIF") chainArrow = "-->|N|";
        markup += "node_" + i + chainArrow + "node_" + chain + "\n";
      }
      if (command["command"] == "JUMPIF" && command["then"]) {
        markup += "node_" + i + "-->|Y|" + "node_" + labels[command["then"]] + "\n";
      }
    }

    refreshFlowchart(markup);

  }

  // Executes the command at index current and updates the trace table if needed.
  // Returns the index of the next command or null if the flowchart simulation should end.
  // The value of current must not be null.
  function execute(flowchart, current) {

    var labels = flowchart["labels"];
    var vars = flowchart["vars"];
    var commands = flowchart["commands"];
    var command = commands[current];

    function tracetable_input(name) {
      return 5;
    }

    function tracetable_output(value) {
      console.log(value);
    }

    function updateTraceTable(varname, value) {

    }

    var chain = (current < commands.length-1) ? (current+1) : null;
    if (command["chain"]) {
      chain = labels[command["chain"]];
    }

    switch (command["command"]) {
      case "JUMPIF":
        var condition = eval(command["condition"]);
        if (condition) chain = labels[command["then"]];
        break;
      case "INPUT":
      case "ASSIGN":
      case "OUTPUT":
        eval(command["code"]);
        break;
    }

    return chain;

  }

  $.get("../images/factorial.flowchart", function(data) {
    var flowchart = window.flowchart.parse(data);
    var current = 0;
    while (current != null) {
      render(flowchart, current);
      current = execute(flowchart, current);
    }
  });

});
