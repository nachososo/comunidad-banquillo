import { isSupabaseConfigured, supabase } from './supabaseClient.js';
import { createCareerRepository } from './careerPersistence.js';

export const careerRepository = createCareerRepository(supabase, isSupabaseConfigured);
