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

let channel;
let transactionsTable;
let network;
let lastFitScreen = 0;

const graph = {
  nodes: undefined,
  edges: undefined
}

const allTxs = [];
const txQueue = [];

$(document).ready(function() {
  initChannelSelector();
  initTransactionsTable();

  switchChannel(channels.icarus);
  startRefreshDataLoop(20000);
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

  const options = {
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

  network = new vis.Network(container, graph, options);
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

  console.log(`refresh data for channel: ${JSON.stringify(channel)}`);

  $.ajax({
    url: `${channel.url}/api/v1/transactions/200`,
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
  const items = JSON.parse(JSON.stringify(txs));
  const now = Date.now();

  if (now > lastFitScreen + 4000) {
    network.fit({ animation: { duration: 400 } });
    lastFitScreen = now;
  }

  while (items.length > 0) {
    for(let i = items.length - 1; i >= 0; i--) {
      const tx = items[i];

      const existingNode = graph.nodes.get(tx.hash);

      if (existingNode) {
        items.splice(i, 1);
      } else {
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
    }

    if (items.length > 0) {
      addNode(items[items.length-1]);
      return;
    }
  }
}

function addNode(transaction, parentId = undefined) {
  graph.nodes.add({ id: transaction.hash, label: 's' });

  if (parentId) {
    graph.edges.add({ from: parentId, to: transaction.hash });
  }

  const index = txQueue.findIndex(t => t.hash === transaction.hash);
  txQueue.splice(index, 1);
}