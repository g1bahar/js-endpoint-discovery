function detectContext(code) {
  const postLoginHints = [
    /isLoggedIn/i,
    /userToken/i,
    /session/i,
    /\/login/i
  ];

  return postLoginHints.some(r => r.test(code))
    ? "post-login"
    : "pre-login";
}

module.exports = { detectContext };
