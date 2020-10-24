const channels = {
  icarus: {
    name: 'Icarus (Unstable)',
    url: 'https://icarus.turtamai.com'
  },
  daedalus: {
    name: 'Daedalus (Stable)',
    url: 'https://daedalus.turtamai.com'
  }
}

const config = {
  txQuerySize: 200,
  graphMaxSize: 350,
  txQueryInterval: 20000,
  fitScreenInterval: 4000,
  fitScreenRestart: 10000
}

const graph = {
  nodes: undefined,
  edges: undefined
}

let allTxs = [];
let txQueue = [];
let graphHistory = [];

let channel;
let transactionsTable;
let network;
let lastFitScreen = 0;
let lastInteraction = 0;

$(document).ready(function() {
  $("body").tooltip({ selector: '[data-toggle=tooltip]' });

  graph.nodes = new vis.DataSet([]);
  graph.edges = new vis.DataSet([]);

  const graphView = document.getElementById("graph-view");
  network = new vis.Network(graphView, graph, getGraphOptions());
  addNode();

  network.on("click", function (params) {
    lastInteraction = Date.now();

    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const tx = allTxs.find(t => t.hash === nodeId);

      if (tx) {
        window.location.href = `./transaction.html?channel=${channel.url}&hash=${nodeId}`;
      }
    }
  });

  network.on("zoom", function (_) {
    lastInteraction = Date.now();
  });

  network.on("dragStart", function (_) {
    lastInteraction = Date.now();
  });

  initChannelSelector();
  initTransactionsTable();

  switchChannel(channels.icarus);
  startRefreshDataLoop(config.txQueryInterval);
  startUpdateGraphLoop();

  $('#searchValue').keydown(function (e) {
    // setSearchValueErrorState(false);

    // check if 'Enter' key was pressed
    if (e.which === 13) {
      const term = $('#searchValue').val();

      if (isHash(term)) {
        const chl = encodeURIComponent(channel.url);
        return document.location.href=`./transaction.html?channel=${chl}&hash=${term}`;
      }
    }
  });
});

function fetchChannelStats(clear = false) {
  if (clear) {
    clearChannelStats();
  }

  $.ajax({
    url: `${channel.url}/api/v1/stats`,
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (stats) {
      $('#channelName').text(stats.channel_name);
      $('#channelDescription').text(stats.channel_description);
      $('#channelVersion').text(stats.version);
      $('#channelContact').text(stats.channel_contact);
      $('#channelPubKey').text(stats.pub_key_string);
      $('#channelTxCount').text(stats.tx_objects_on_disk);
      $('#channelUsersCount').text(stats.tx_graph_users);
    },
    error: function() {
      console.log('error fetching stats!');
      clearChannelStats();
    }
  });
}

function clearChannelStats() {
  $('#channelName').text('');
  $('#channelDescription').text('');
  $('#channelVersion').text('');
  $('#channelContact').text('');
  $('#channelPubKey').text('');
  $('#channelTxCount').text('');
  $('#channelUsersCount').text('');
}

function initChannelSelector() {
  $('#select-daedalus').click(function() {
    if (channel.url !== channels.daedalus.url)
      switchChannel(channels.daedalus);
  });
  $('#select-icarus').click(function() {
    if (channel.url !== channels.icarus.url)
      switchChannel(channels.icarus);
  });
}

function switchChannel(newChan) {
  channel = newChan;
  $('#chan-select-title').text(channel.name);
  fetchChannelStats(true);
  fetchTransactions(true);
}

function fetchTransactions(clear = false) {
  if (clear) {
    transactionsTable.clear();
    transactionsTable.draw(false);
  }

  $.ajax({
    url: `${channel.url}/api/v1/transactions/${config.txQuerySize}`,
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (txs) {
      updateTransactionsData(txs);
    },
    error: function() {
      console.log('error fetching txs!');
      transactionsTable.clear();
      transactionsTable.draw(false);
    }
  });
}

function startRefreshDataLoop(interval) {
  function refreshData() {
    setTimeout(function () {
      fetchTransactions();
      refreshData();
    }, interval)
  }
  refreshData();
}

function startUpdateGraphLoop() {
  function update() {
    const delay = 50 + Math.random() * 500;

    setTimeout(function () {
      updateGraph(txQueue);

      if (graphHistory.length > config.graphMaxSize) {
        resetGraph();
      }

      update();
    }, delay)
  }
  update();
}

function initTransactionsTable() {
  transactionsTable = $('#transactions').DataTable({
    columnDefs: [{
      targets: [0, 1, 2, 3],
      searchable: false
    }, {
      targets: 0,
      width: '15%',
      render: function (data, type, row, meta) {
        if (type === 'display') {
          data = moment(data/1000000).format("D/M/YYYY HH:mm");
        }
        return data;
      }
    }, {
      targets: 1,
      width: '7%',
      render: function (data, type, row, meta) {
        if (type === 'display') {
          let badge;

          switch (data) {
            case '0':
              badge = 'badge bg-azure';
              break;
            case '1':
              badge = 'badge bg-indigo';
              break;
            case '2':
              badge = 'badge bg-purple';
              break;
          }

          data = `<span class="${badge}">${data}</span>`;
        }
        return data;
      }
    }, {
      targets: 2,
      render: function (data, type, row, meta) {
        if (type === 'display') {
          const chl = encodeURIComponent(channel.url);
          data = `
            <a href="./transaction.html?channel=${chl}&hash=${data}">
              <span class="transaction-hash" data-toggle="tooltip" data-placement="top" title="${data}">
                ${getColorizedHex(data)}
              </span>
            </a>
          `;
        }
        return data;
      }
    }, {
      targets: 3,
      width: '100px',
      render: function (data, type, row, meta) {
        if (type === 'display') {
          data = `<span>${getTxDataText(data, row[2])}</span>`;
        }
        return data;
      }
    }],
    searching: false,
    ordering: true,
    order: [[0, 'desc']],
    info: false,
    paging: false,
    lengthMenu: -1,
    language: {
      emptyTable: "No transactions"
    },
    autoWidth: false
  }).columns.adjust().responsive.recalc();
}

function updateTransactionsData(txs) {
  let redrawTable = false;

  txs.forEach(tx => {
    if (!allTxs.some(t => t.hash === tx.hash)) {
      allTxs.push(tx);

      transactionsTable.rows.add([[tx.time, tx.type, tx.hash, tx.data]]);
      redrawTable = true;

      if (!txQueue.some(t => t.hash === tx.hash)) {
        txQueue.push(tx);
      }
    }
  });

  if (redrawTable) {
    transactionsTable.draw(false);
  }
}

function updateGraph(txs) {
  if (document.visibilityState !== 'visible') {
    return;
  }

  const items = JSON.parse(JSON.stringify(txs));
  const now = Date.now();

  if (
    now > lastInteraction + config.fitScreenRestart &&
    now > lastFitScreen + config.fitScreenInterval
  ) {
    network.fit({ animation: { duration: 800 } });
    lastFitScreen = now;
  }

  while (items.length > 0) {
    for(let i = items.length - 1; i >= 0; i--) {
      const tx = items[i];
      const existingNode = graph.nodes.get(tx.hash);

      if (existingNode) {
        items.splice(i, 1);
        continue;
      }

      if (!graphHistory.some(n => n.id === tx.subg)) {
        graphHistory.push({ id: tx.subg, lead: true });

        graph.nodes.add({ id: tx.subg, color: '#43b380', shape: 'hexagon', size: 25 });
        graph.edges.add({ from: 'root', to: tx.subg });
      }

      const parent = graphHistory.find(n => n.id === tx.prnt);
      const parentNodeId = parent ? parent.id : tx.subg;

      addNode(tx, parentNodeId);
      return;
    }
  }
}

function addNode(tx, parentId = 'root') {
  if (!tx) {
    // if no transaction is provided, we treat it as the root node of the graph
    graph.nodes.add({ id: 'root', color: '#43b380', shape: 'hexagon', size: 40 });
    graphHistory.push({ id: 'root', lead: true });

    return;
  }

  graph.nodes.add({
    id: tx.hash,
    color: '#43b380',
    title: `<div>${getColorizedHex(tx.hash)}</div>`,
  });

  graphHistory.push({ id: tx.hash, lead: tx.lead });

  const parentNode = graph.nodes.get(parentId);

  if (parentNode) {
    graph.edges.add({ from: parentId, to: tx.hash });
  }

  const index = txQueue.findIndex(t => t.hash === tx.hash);
  txQueue.splice(index, 1);
}

function resetGraph() {
  const allEdges = graph.edges.get();
  const allNodes = graph.nodes.get();

  for (let i = allEdges.length - 1; i >= 0; i--) {
    graph.edges.remove(allEdges[i]);
  }

  for (let i = allNodes.length - 1; i >= 0; i--) {
    graph.nodes.remove(allNodes[i].id);
  }

  allTxs = [];
  graphHistory = [];
  txQueue = [];

  addNode();
}

function getTxDataText(data, hash) {
  let json;
  let text = 'TEXT';

  try {
    json = JSON.parse(data);
  } catch (err) {
    // console.log(err);
    // console.log(data);
  }

  if (json && json instanceof Object) {
    text = `JSON`;
  }

  const chl = encodeURIComponent(channel.url);
  return `<a href="./transaction.html?channel=${chl}&hash=${hash}"><span class="transaction-hash">${text}</span></a>`;
}

function getGraphOptions() {
  return {
    interaction:{
      dragNodes:false,
      dragView: true,
      hideEdgesOnDrag: false,
      hideEdgesOnZoom: false,
      hideNodesOnDrag: false,
      hover: true,
      hoverConnectedEdges: false,
      keyboard: {
        enabled: false,
        speed: {x: 10, y: 10, zoom: 0.02},
        bindToWindow: true
      },
      multiselect: false,
      navigationButtons: false,
      selectable: true,
      selectConnectedEdges: true,
      tooltipDelay: 300,
      zoomSpeed: 1,
      zoomView: true
    },
    layout: {
      randomSeed: undefined,
      improvedLayout:true,
      clusterThreshold: 150,
      hierarchical: {
        enabled:false,
        levelSeparation: 150,
        nodeSpacing: 100,
        treeSpacing: 200,
        blockShifting: true,
        edgeMinimization: true,
        parentCentralization: true,
        direction: 'UD',        // UD, DU, LR, RL
        sortMethod: 'hubsize',  // hubsize, directed
        shakeTowards: 'leaves'  // roots, leaves
      }
    },
    physics:{
      enabled: true,
      barnesHut: {
        theta: 0.5,
        gravitationalConstant: -8000,
        centralGravity: 0.1,
        springLength: 95,
        springConstant: 0.44,
        damping: 0.19,
        avoidOverlap: 0
      },
      forceAtlas2Based: {
        theta: 0.5,
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springConstant: 0.08,
        springLength: 100,
        damping: 0.4,
        avoidOverlap: 0
      },
      repulsion: {
        centralGravity: 0.2,
        springLength: 200,
        springConstant: 0.05,
        nodeDistance: 100,
        damping: 0.09
      },
      hierarchicalRepulsion: {
        centralGravity: 0.0,
        springLength: 100,
        springConstant: 0.01,
        nodeDistance: 120,
        damping: 0.09,
        avoidOverlap: 0
      },
      maxVelocity: 50,
      minVelocity: 0.1,
      solver: 'barnesHut',
      stabilization: {
        enabled: true,
        iterations: 1000,
        updateInterval: 100,
        onlyDynamicEdges: false,
        fit: true
      },
      timestep: 0.5,
      adaptiveTimestep: true,
      wind: { x: -0.05, y: 0.02 }
    }
  }
}
