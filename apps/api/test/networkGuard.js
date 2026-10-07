// Unit tests can use mock transports and loopback HTTP, never an external AI/network API.
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Object.assign(new Error('External network blocked in offline tests'), { code: 'OFFLINE_TEST_NETWORK_BLOCKED' });
  return nativeFetch(input, options);
};
