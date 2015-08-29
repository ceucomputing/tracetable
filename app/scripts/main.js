// jshint devel:true

$(function() {

  var tracetable_scope = {};
  var tracetable_items = [];

  // Renders the given flowchart with the command at index current highlighted.
  // If current is null, flowchart is not being simulated and no command will be highlighted.
  function render(flowchart, current) {

    function refreshFlowchart(markup) {
      var holder = $("#mermaid-holder");
      holder.empty();
      $("<div>").addClass("mermaid").text(markup).appendTo(holder);
      mermaid.init();
    }

    function renderTracetable() {
      var html = "";
      if (tracetable_items.length == 0) {
        html += "<tr><td colspan=\"" + (flowchart["vars_list"].length+1) + "\">No items to display</td></tr>"
      } else {
        for (var i = 0; i < tracetable_items.length; i++) {
          html += "<tr>";
            for (var j = 0; j < tracetable_items[i].length; j++) {
              html += "<td>" + tracetable_items[i][j] + "</td>";
            }
          html += "</tr>";
        }
      }
      $('#tracetable > tbody').html(html);
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

    if (current != null) {
      markup += "style node_" + current + " fill:#f9f,stroke:#333,stroke-width:4px\n";
    }

    refreshFlowchart(markup);

    renderTracetable();

  }

  // Executes the command at index current and updates the trace table if needed.
  // Returns the index of the next command or null if the flowchart simulation should end.
  // The value of current must not be null.
  function execute(flowchart, current) {

    var labels = flowchart["labels"];
    var vars = flowchart["vars"];
    var vars_list = flowchart["vars_list"];
    var commands = flowchart["commands"];
    var command = commands[current];

    function tracetable_input(name) {
      var input = NaN;
      while (isNaN(input)) {
        input = parseInt(prompt("Enter an integer value for " + name + ":"));
      }
      return input;
    }

    function tracetable_output(value) {
      var newItem = [];
      for (var i = 0; i < vars_list.length; i++) {
        newItem[i] = "";
      }
      newItem[vars_list.length] = value;
      tracetable_items.push(newItem);
    }

    function updateTracetable(varname) {
      var newItem = [];
      var varIndex = vars[varname];
      for (var i = 0; i < vars_list.length+1; i++) {
        newItem[i] = (varIndex == i) ? tracetable_scope[varname] : "";
      }
      tracetable_items.push(newItem);
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
        eval(command["code"]);
        updateTracetable(command["var"]);
        break;
      case "OUTPUT":
        eval(command["code"]);
        break;
    }

    return chain;

  }

  $.get("../images/gcd.flowchart", function(data) {
    var flowchart = window.flowchart.parse(data);

    function resetTracetable() {
      var vars_list = flowchart["vars_list"];
      var html = "<tr>";
      for (var i = 0; i < vars_list.length; i++) {
        html += "<th>" + vars_list[i] + "</th>";
      }
      html += "<th>Output</th></tr>";
      $('#tracetable > thead').html(html);
      tracetable_items = [];
    }

    var current = 0;
    var next = null;

    function reset() {
      resetTracetable();
      current = 0;
      next = execute(flowchart, current);
      render(flowchart, current);
      $("#next").prop("disabled", next == null);
    }

    reset();

    $("#next").on("click", function() {
      if (next != null) {
        current = next;
        next = execute(flowchart, current);
        render(flowchart, current);
        $("#next").prop("disabled", next == null);
      }
    });

    $("#reset").on("click", function() {
      reset();
    });
  });

});
