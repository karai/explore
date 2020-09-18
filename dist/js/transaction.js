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
      console.log(txn);
      $('#Ktransaction').text(txn.hash);
    },
    error: function() {
      return document.location.href="./index.html";
    }
  });
});