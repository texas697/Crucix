export function getCredentials() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || '', 10);
  const apiHash = (process.env.TELEGRAM_API_HASH || '').trim();
  const session = (process.env.TELEGRAM_SESSION || '').trim();
  return {
    apiId: Number.isNaN(apiId) ? null : apiId,
    apiHash: apiHash || null,
    session: session || null,
  };
}

export function hasTelegramCredentials() {
  const { apiId, apiHash, session } = getCredentials();
  return Boolean(apiId && apiHash && session);
}
