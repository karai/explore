$(document).ready(function () {
	let channel = getQueryStringParam("channel");
	const hash = getQueryStringParam("hash");

	if (!channel || !isHash(hash)) {
		return (document.location.href = "./index.html");
	}

	channel = decodeURIComponent(channel);
	$.ajax({
		url: `${channel}/api/v1/transaction/${hash}`,
		dataType: "json",
		type: "GET",
		cache: "false",
		success: function (tx) {
			$("#Ktransaction").text(tx.hash);
			$("#type").append(getTxTypeBadge(tx.type));
			$("#previous").append(
				`<a href="./transaction.html?channel=${channel}&hash=${
					tx.prev
				}" data-toggle="tooltip" title="${
					tx.prev
				}"><span class="transaction-hash">${getHashSegments(
					tx.prev
				)}</span></a>`
			);
			$("#size").text(getTxSize(tx));
			$("#milestone").text(tx.mile);
			$("#timestamp").text(
				moment(tx.time / 1000000).format("D/M/YYYY HH:mm")
			);
			$("#epoch").text(tx.epoc);
      $("#data").text(JSON.stringify(JSON.parse(tx.data), null, 4));

      $("#theme-toggle").click(() => {
        refreshCodeHighlightStyle();
      });

      refreshCodeHighlightStyle();

      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
      });
		},
		error: function () {
			return (document.location.href = "./index.html");
		},
	});

	$("body").tooltip({
		selector: "[data-toggle=tooltip]",
		boundary: "window",
	});
});

function getTxTypeBadge(type) {
	let badge;

	switch (type) {
		case "0":
			badge = "badge bg-azure";
			break;
		case "1":
			badge = "badge bg-indigo";
			break;
		case "2":
			badge = "badge bg-purple";
			break;
	}

	return `<span class="${badge}">${type}</span>`;
}

function getTxSize(tx) {
  const size = new Blob([JSON.stringify(tx)], {type : 'application/json'}).size;

  if (size < 1000)
    return `${size} bytes`;
  else if (size < 1000000)
    return `${size/1000} kB`;
  else {
    return `${size/1000000} MB`;
  }
}

function refreshCodeHighlightStyle() {
  const darkMode = $('body').hasClass('theme-dark');

  $('#light-code').prop('disabled', darkMode);
  $('#dark-code').prop('disabled', !darkMode);
}