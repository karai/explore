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
  txQuerySize: 300,
  graphMaxSize: 250,
  txQueryInterval: 20000,
  fitScreenInterval: 4000
}

const graph = {
  nodes: undefined,
  edges: undefined
}

const allTxs = [];
const txQueue = [];
const graphHistory = [];

let channel;
let transactionsTable;
let network;
let lastFitScreen = 0;

$(document).ready(function() {
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

  graph.nodes = new vis.DataSet([]);
  graph.edges = new vis.DataSet([]);

  const container = document.getElementById("graph-view");
  network = new vis.Network(container, graph, getGraphOptions());
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
      pruneGraph();
      update();
    }, delay)
  }
  update();
}

function initTransactionsTable() {
  transactionsTable = $('#transactions').DataTable({
    columnDefs: [{
      targets: [0, 1, 2],
      searchable: false
    }, {
      targets: 0,
      render: function (data, type, row, meta) {
        if (type === 'display') {
          data = moment(data/1000000).format("D/M/YYYY HH:mm");
        }
        return data;
      }
    }, {
      targets: 1,
      render: function (data, type, row, meta) {
        if (type === 'display') {
          let badge;

          switch (data) {
            case '0':
              badge = 'badge bg-azure'
              break;
            case '1':
              badge = 'badge bg-indigo'
              break;
            case '2':
              badge = 'badge bg-purple'
              break;
          }

          data = `<span class="${badge}">${data}</span>`
        }
        return data;
      }
    }, {
      targets: 2,
      render: function (data, type, row, meta) {
        if (type === 'display') {
          const chl = encodeURIComponent(channel.url);
          data = `<a href="./transaction.html?channel=${chl}&hash=${data}"><span class="transaction-hash">${data}</span></a>`
        }
        return data;
      }
    }],
    searching: false,
    ordering: false,
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
  transactionsTable.clear();

  const rows = txs.map(tx => [tx.time, tx.type, tx.hash]);
  transactionsTable.rows.add(rows);

  transactionsTable.draw(false);

  txs.forEach(tx => {
    if (!allTxs.some(t => t.hash === tx.hash)) {
      allTxs.push(tx);

      if (!txQueue.some(t => t.hash === tx.hash)) {
        txQueue.push(tx);
      }
    }
  });
}

function updateGraph(txs) {
  if (document.visibilityState !== 'visible') {
    return;
  }

  const items = JSON.parse(JSON.stringify(txs));
  const now = Date.now();

  if (now > lastFitScreen + config.fitScreenInterval) {
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

      const myLead = allTxs.find(t => t.lead && t.subg === tx.subg);
      let parentNode = myLead ? graph.nodes.get(myLead.hash) : undefined;

      if (tx.lead) {
        const parentTx = allTxs.find(t => t.hash === tx.prev);
        parentNode = parentTx ? graph.nodes.get(parentTx.hash) : undefined;
      }

      if (parentNode) {
        addNode(tx, parentNode.id);
        return;
      }
    }

    if (items.length > 0) {
      addNode(items[items.length-1]);
      return;
    }
  }
}

function addNode(transaction, parentId = undefined) {
  graph.nodes.add({ id: transaction.hash, color: '#43b380', font: {color: '#ffffff'}});
  graphHistory.push({ id: transaction.hash, lead: transaction.lead });

  if (parentId) {
    graph.edges.add({ from: parentId, to: transaction.hash });
  }

  const index = txQueue.findIndex(t => t.hash === transaction.hash);
  txQueue.splice(index, 1);
}

function pruneGraph() {
  if (graphHistory.length <= config.graphMaxSize) {
    return;
  }

  const candidates = graphHistory.slice(0, 50);
  const selected = candidates.find(c => !c.lead);
  const connectedNodes = network.getConnectedNodes(selected.id);

  graphHistory.splice(graphHistory.indexOf(selected), 1);
  graph.nodes.remove(selected.id);

  connectedNodes.forEach(node => {
    const connections = network.getConnectedNodes(node);

    if (connections.length === 0) {
      const orphan = graphHistory.find(n => n.id === node.id);
      graphHistory.splice(graphHistory.indexOf(orphan), 1);
      graph.nodes.remove(node);
    }
  });
}

function getGraphOptions() {
  return {
    interaction:{
      dragNodes:false,
      dragView: false,
      hideEdgesOnDrag: false,
      hideEdgesOnZoom: false,
      hideNodesOnDrag: false,
      hover: false,
      hoverConnectedEdges: true,
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
      zoomView: false
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
        centralGravity: 0.6,
        springLength: 95,
        springConstant: 0.04,
        damping: 0.09,
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
      wind: { x: -0.35, y: 0.32 }
    }
  }
}