
function pif(promise, test, consequent, alternate) {
  return promise.then(function(value) {
    return test(value)? consequent(value) : alternate(value);
  });
}

function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce((a, b) => (...args) => {
    return a(b(...args))
  });
}

function identity(a) {
  return a;
}

function when(promise, test, f) {
  return pif(promise, test, f, identity);
}

function unless(promise, test, f) {
  return pif(promise, test, identity, f);
}

const mention = (id, message) => `<@${id}> ${message || ""}`;

const codeBlock = (code, as) => `\`\`\`${as || ""}\n ${code}\n\`\`\``;

module.exports = {
    pif,
    when,
    unless,
    mention,
    codeBlock,
    compose
};
