// jshint devel:true
/*global $:false, mermaid:false, bootbox:false*/

$(function() {
  'use strict';

  var globalFlowchart = null;
  var globalCurrent = 0;
  var globalNext = null;

  var tracetableScope = {};
  var tracetableItems = [];

  // Renders the given flowchart with the command at index current highlighted.
  // If current is null, flowchart is not being simulated and no command will be highlighted.
  function render(flowchart, current) {
    var labels = flowchart.labels;
    var commands = flowchart.commands;

    function renderFlowchart(markup) {
      var holder = $('#mermaid-holder');
      holder.empty();
      $('<div>').addClass('mermaid').text(markup).appendTo(holder);
      mermaid.init();
    }

    function renderTracetable() {
      var html = '';
      if (tracetableItems.length === 0) {
        html += '<tr><td colspan="' + (flowchart.varsList.length + 1) + '">No items to display</td></tr>';
      } else {
        for (var i = 0; i < tracetableItems.length; i++) {
          html += '<tr>';
            for (var j = 0; j < tracetableItems[i].length; j++) {
              html += '<td>' + tracetableItems[i][j] + '</td>';
            }
          html += '</tr>';
        }
      }
      $('#tracetable > tbody').html(html);
    }

    var markup = 'graph TD;\n';

    for (var i = 0; i < commands.length; i++) {
      var left = '[';
      var right = ']';
      var command = commands[i];

      switch (command.command) {
        case 'JUMPIF':
          left = '{'; right = '}'; break;
        case 'START':
        case 'END':
          left = '('; right = ')'; break;
        case 'INPUT':
        case 'OUTPUT':
          left = '>'; right = ']'; break;
      }

      // Create nodes
      markup += 'node_' + i + left + command.title + right + ';\n';

      // Create connections between nodes
      var chain = (i < commands.length - 1) ? (i + 1) : null;
      if (command.chain) {
        chain = labels[command.chain];
      }
      var chainArrow = '-->';
      if (chain) {
        if (command.command === 'JUMPIF') {
          chainArrow = '-->|N|';
        }
        markup += 'node_' + i + chainArrow + 'node_' + chain + '\n';
      }
      if (command.command === 'JUMPIF' && command.then) {
        markup += 'node_' + i + '-->|Y|' + 'node_' + labels[command.then] + '\n';
      }
    }

    if (current != null) {
      markup += 'style node_' + current + ' fill:#f9f,stroke:#333,stroke-width:4px\n';
    }

    renderFlowchart(markup);
    renderTracetable();
  }

  // Executes the command at index current and updates the trace table if needed.
  // Returns by calling callback with index of the new current command and next command.
  // The value of current must not be null.
  function execute(flowchart, current, callback) {
    var labels = flowchart.labels;
    var vars = flowchart.vars;
    var varsList = flowchart.varsList;
    var commands = flowchart.commands;
    var command = commands[current];

    var chain = (current < commands.length - 1) ? (current + 1) : null;
    if (command.chain) {
      chain = labels[command.chain];
    }

    function updateTracetable(name) {
      var newItem = [];
      var varIndex = vars[name];
      for (var i = 0; i < varsList.length + 1; i++) {
        newItem[i] = (varIndex === i) ? tracetableScope[name] : '';
      }
      tracetableItems.push(newItem);
    }

    function tracetableInput(name) {
      function promptCallback(result) {
        if (result == null) {
          callback(current, current);
        } else {
          var resultValue = parseInt(result);
          if (isNaN(resultValue)) {
            bootbox.prompt('Enter an integer value for ' + name + ':', promptCallback);
          } else {
            tracetableScope[name] = resultValue;
            updateTracetable(name);
            callback(current, chain);
          }
        }
      }
      promptCallback(NaN);
    }

    function tracetableOutput(value) { // eslint-disable-line no-unused-vars
      var newItem = [];
      for (var i = 0; i < varsList.length; i++) {
        newItem[i] = '';
      }
      newItem[varsList.length] = value;
      tracetableItems.push(newItem);
    }

    switch (command.command) {
      case 'JUMPIF':
        var condition = eval(command.condition); // eslint-disable-line no-eval
        if (condition) {
          chain = labels[command.then];
        }
        callback(current, chain);
        break;
      case 'INPUT':
        // Treat specially due to async events
        // tracetableInput is responsible for calling callback
        tracetableInput(command.var);
        break;
      case 'ASSIGN':
        eval(command.code); // eslint-disable-line no-eval
        updateTracetable(command.var);
        callback(current, chain);
        break;
      case 'OUTPUT':
        eval(command.code); // eslint-disable-line no-eval
        callback(current, chain);
        break;
      default:
        callback(current, chain);
    }
  }

  function resetTracetable() {
    var varsList = [];
    if (globalFlowchart) {
      varsList = globalFlowchart.varsList;
    }
    var html = '<tr>';
    for (var i = 0; i < varsList.length; i++) {
      html += '<th>' + varsList[i] + '</th>';
    }
    html += '<th>Output</th></tr>';
    $('#tracetable > thead').html(html);
    tracetableItems = [];
  }

  function reset() {
    resetTracetable();
    globalCurrent = 0;
    execute(globalFlowchart, globalCurrent, function(newCurrent, newNext) {
      globalCurrent = newCurrent;
      globalNext = newNext;
      render(globalFlowchart, globalCurrent);
      $('#next').prop('disabled', globalNext == null);
    });
  }

  $('.nav-tabs a').on('click', function(e) {
    $.get($(e.target).data('src'), function(data) {
      globalFlowchart = window.flowchart.parse(data);
      reset();
    });
  });

  $('.nav-tabs a:first').click();

  $('#next').on('click', function() {
    if (globalNext != null) {
      $('#next').prop('disabled', true);
      $('#reset').prop('disabled', true);
      // Render both before and after execution.
      render(globalFlowchart, globalNext);
      execute(globalFlowchart, globalNext, function(newCurrent, newNext) {
        globalCurrent = newCurrent;
        globalNext = newNext;
        // Render both before and after execution.
        render(globalFlowchart, globalCurrent);
        $('#next').prop('disabled', globalNext == null);
        $('#reset').prop('disabled', false);
        if (globalNext == null) {
          bootbox.alert('Flowchart has ended. Select another flowchart or Reset to run again.');
        }
      });
    }
  });

  $('#reset').on('click', function() {
    reset();
  });

});
