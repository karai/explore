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

function getColorizedHash(hash) {
	let result = '';
  let offset = 0;

	while (offset <= hash.length - 6) {
		result += getHashPixel(hash, offset);
		offset += 6;
	}

  const remainder = hash.length - offset;

  if (remainder > 0) {
    const zero = '0';
    result += getHashPixel(`${hash.substring(hash.length - remainder) + zero.repeat(6-remainder)}`) ;
  }

	return result;
}

function getHashPixel(hash, offset = 0) {
  const color = `#${hash.substring(offset, offset + 6)}`;
  return `<span style="color: transparent; background-color: ${color}">X</span>`;
}
