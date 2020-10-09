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

function getHashSegments(hash) {
	let result = ` `;
	let offset = 2;

	while (offset < hash.length - 10) {
		result += getHashPixel(hash, offset);
		offset += 6;
	}

	result += ` `;

	return result;
}

function getHashPixel(hash, offset) {
  const color = `#${hash.substring(offset, offset + 6)}`;
  return `<span style="color: transparent; background-color: ${color}">X</span>`;
}
