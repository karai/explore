let channel = "http://167.71.104.172:4200";
let transactionsTable;

$(document).ready(function() {
  fetchChannelStats();
  fetchTransactions();

  transactionsTable = $('#transactions').DataTable({
    columnDefs: [{
      targets: [0, 1, 2],
      searchable: false
    }, {
      targets: 1,
      render: function (data, type, row, meta) {
        if (type === 'display') {
          let badge;

          switch (data) {
            case '0':
              badge = 'badge bg-azure'
              break;
            default:
              badge = 'badge bg-purple'
              break;
          }

          data = `<span class="${badge}">${data}</span>`
        }
        return data;
      }
    },
    {
      targets: 2,
      render: function (data, type, row, meta) {
        if (type === 'display') {
          const chl = encodeURIComponent(channel);
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

  startRefreshTimer(10000);

  // $('#searchButton').click(function () {
  //   channel = $('#searchValue').val();
  // });

  $('#searchValue').keydown(function (e) {
    // setSearchValueErrorState(false);

    // check if 'Enter' key was pressed
    if (e.which === 13) {
      const term = $('#searchValue').val();

      if (isHash(term)) {
        const chl = encodeURIComponent(channel);
        return document.location.href=`./transaction.html?channel=${chl}&hash=${term}`;
      }
    }
  });
});

function fetchChannelStats() {
  $.ajax({
    url: `${channel}/api/v1/stats`,
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (stats) {
      console.log(stats);

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
      // channel = undefined;
    }
  });
}

function fetchTransactions() {
  if (!channel || channel === '') {
    transactionsTable.clear();
    transactionsTable.draw(false);
    return;
  }

  console.log(`refresh data for channel: ${channel}`);

  $.ajax({
    url: `${channel}/api/v1/transactions/20`,
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (txs) {
      updateTransactionsTable(txs);
    },
    error: function() {
      console.log('error fetching txs!');
      // channel = undefined;
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

function updateTransactionsTable(txs) {
  transactionsTable.clear();

  for (var i = 0; i < txs.length; i++) {
    var tx = txs[i];
    transactionsTable.row.add([
      i+1,
      tx.type,
      tx.hash
    ]);
  }
  transactionsTable.draw(false);
}