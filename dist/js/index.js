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

$(document).ready(function() {
  initChannelSelector();
  initTransactionsTable();

  switchChannel(channels.icarus);
  startRefreshTimer(20000);

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

  console.log(`refresh data for channel: ${JSON.stringify(channel)}`);

  $.ajax({
    url: `${channel.url}/api/v1/transactions/20`,
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (txs) {
      updateTransactionsTable(txs);
    },
    error: function() {
      console.log('error fetching txs!');
      transactionsTable.clear();
      transactionsTable.draw(false);
    }
  });
}

function startRefreshTimer(interval) {
  function refreshData() {
    setTimeout(function () {
      fetchTransactions();
      refreshData();
    }, interval)
  }
  refreshData();
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
          data = `<a href="./transaction.html?channel=${chl}&hash=${data}">${data}</a>`
        }
        return data;
      }
    }],
    order: [
      [0, 'asc']
    ],
    searching: false,
    info: false,
    paging: false,
    lengthMenu: -1,
    language: {
      emptyTable: "No transactions"
    },
    autoWidth: false
  }).columns.adjust().responsive.recalc();
}

function updateTransactionsTable(txs) {
  transactionsTable.clear();

  for (var i = 0; i < txs.length; i++) {
    transactionsTable.row.add([
      tx.time,
      tx.type,
      tx.hash
    ]);
  }
  transactionsTable.draw(false);
}
