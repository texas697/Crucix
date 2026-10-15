export async function readTextOrEmpty(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

export async function readJsonOrText(res: Response): Promise<unknown> {
  const text = await readTextOrEmpty(res);
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
