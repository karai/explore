function isHash (str) {
  // TODO: add better karai tx hash validation here
  const regex = new RegExp('^[0-9a-fA-F]+$');
  return regex.test(str);
}

function getQueryStringParam (key) {
  const queryString = window.location.search.substring(1);
  const params = queryString.split('&');

  for (var i = 0; i < params.length; i++) {
    var param = params[i].split('=');

    if (param[0] === key) {
      return param[1];
    }
  }
}

function getColorizedHex(hex, includeRemainder = false) {
	let result = '';
  let offset = 0;

	while (offset <= hex.length - 6) {
		result += getHexPixel(hex.substring(offset, offset + 6));
		offset += 6;
	}

  const remainder = hex.length - offset;

  if (remainder > 0 && includeRemainder) {
    result += getHexPixel(`${hex.substring(hex.length - remainder) + '0'.repeat(6 - remainder)}`) ;
  }

	return result;
}

function getHexPixel(hex) {
  return `<span style="color: transparent; background-color: #${hex}">X</span>`;
}
