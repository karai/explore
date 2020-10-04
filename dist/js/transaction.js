$(document).ready(function() {
  let channel = getQueryStringParam('channel');
  const hash = getQueryStringParam('hash')

  if (!channel || !isHash(hash)) {
    return document.location.href="./index.html";
  }

  channel = decodeURIComponent(channel);

  $.ajax({
    url: `${channel}/api/v1/transaction/${hash}`,
    dataType: 'json',
    type: 'GET',
    cache: 'false',
    success: function (txn) {
      $('#Ktransaction').text(txn.hash);
      $('#type').append(getTxTypeBadge(txn.type));
      $('#previous').append(`<a href="./transaction.html?channel=${channel}&hash=${txn.prev}" data-toggle="tooltip" title="${txn.prev}"><span class="transaction-hash">${getHashSegments(txn.prev)}</span></a>`);
      $('#lead').text(txn.lead);
      $('#milestone').text(txn.mile);
      $('#timestamp').text(moment(txn.time/1000000).format("D/M/YYYY HH:mm"));
      $('#epoch').text(txn.epoc);
      $('#data').text(txn.data);
    },
    error: function() {
      return document.location.href="./index.html";
    }
  });

  $("body").tooltip({ selector: '[data-toggle=tooltip]', boundary: 'window' });
});

function getTxTypeBadge(type) {
  let badge;

  switch (type) {
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

  return `<span class="${badge}">${type}</span>`;
}