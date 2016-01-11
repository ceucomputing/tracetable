// jshint devel:true
/*global $:false, bootbox:false*/

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
      var diagram = window.flowchart.parse(markup);
      $('#diagram').empty();
      diagram.drawSVG('diagram', {
        'flowstate': { 'current': { 'fill': 'yellow', 'font-color': 'red', 'font-weight': 'bold' } }
      });
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

    var markup = '';
    var i, command;

    for (i = 0; i < commands.length; i++) {
      command = commands[i];

      var nodetype = 'operation';
      switch (command.command) {
        case 'JUMPIF':
          nodetype = 'condition'; break;
        case 'START':
          nodetype = 'start'; break;
        case 'END':
          nodetype = 'end'; break;
        case 'INPUT':
        case 'OUTPUT':
          nodetype = 'inputoutput'; break;
      }

      var flowstate = '';
      if (current != null && i === current) {
        flowstate = '|current';
      }

      // Create nodes
      markup += 'node_' + i + '=>' + nodetype + ': ' + command.title + flowstate + '\n';
    }

    markup += '\n';

    for (i = 0; i < commands.length; i++) {
      command = commands[i];

      // Create connections between nodes
      var chain = (i < commands.length - 1) ? (i + 1) : null;
      if (command.chain) {
        chain = labels[command.chain];
      }
      var chainArrow = '->';
      if (chain) {
        if (command.command === 'JUMPIF') {
          chainArrow = '(no)->';
        }
        markup += 'node_' + i + chainArrow + 'node_' + chain + '\n';
      }
      if (command.command === 'JUMPIF' && command.then) {
        markup += 'node_' + i + '(yes,right)->' + 'node_' + labels[command.then] + '\n';
      }
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
      globalFlowchart = window.parser.parse(data);
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
