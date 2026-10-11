import { DEFAULT_CAREER_CONFIG } from '../data/careerData.js';
import { upgradeConfig, validateConfig } from '../utils/careerEngine.js';

const KEY = 'adn-banquiller:config';
const writeError = (error) => new Error(error?.code === '42501'
  ? 'Solo la administración puede publicar eventos.'
  : ['23505', 'PGRST116'].includes(error?.code)
    ? 'Otra pestaña ha publicado cambios. Recarga antes de editar.'
    : 'No se pudo publicar. Comprueba la conexión y reintenta.');

// This repository stores only the shared editor catalogue, never player data.
export function createCareerRepository(client, configured = true) {
  const loadConfig = async () => {
    if (!configured) return { data: structuredClone(DEFAULT_CAREER_CONFIG), updatedAt: null, remote: false, migrated: false };
    const { data, error } = await client.from('game_data').select('payload,updated_at').eq('key', KEY).maybeSingle();
    if (error) throw new Error('No se pudieron cargar los eventos publicados.');
    const original = data?.payload ?? structuredClone(DEFAULT_CAREER_CONFIG);
    const config = upgradeConfig(original);
    if (validateConfig(config).length) throw new Error('El catálogo publicado contiene errores que debe revisar la administración.');
    return { data: config, updatedAt: data?.updated_at ?? null, remote: Boolean(data), migrated: original.version === 1 };
  };
  const saveConfig = async (config, updatedAt) => {
    const errors = validateConfig(config);
    if (errors.length) throw new Error(errors[0]);
    if (!configured) throw new Error('Conecta Supabase para publicar eventos compartidos.');
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) throw new Error('Vuelve a entrar al panel para publicar.');
    const stamp = new Date(Math.max(Date.now(), Date.parse(updatedAt || '') + 1 || 0)).toISOString();
    const row = { key: KEY, game: 'adn-banquiller', payload: config, updated_at: stamp };
    const query = updatedAt
      ? client.from('game_data').update(row).eq('key', KEY).eq('updated_at', updatedAt)
      : client.from('game_data').insert(row);
    const { data, error } = await query.select('payload,updated_at').single();
    if (error) {
      const recovered = await client.from('game_data').select('payload,updated_at').eq('key', KEY).maybeSingle();
      if (!recovered.error && config.saveToken && recovered.data?.payload?.saveToken === config.saveToken) return { data: recovered.data.payload, updatedAt: recovered.data.updated_at };
      throw writeError(error);
    }
    return { data: data.payload, updatedAt: data.updated_at };
  };
  return { loadConfig, saveConfig };
}
