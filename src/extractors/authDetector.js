function detectAuth(code) {
  const authPatterns = [
    /authorization\s*:/i,
    /bearer\s+/i,
    /x-auth/i,
    /credentials\s*:\s*['"]include['"]/i
  ];

  return authPatterns.some(r => r.test(code));
}

module.exports = { detectAuth };
