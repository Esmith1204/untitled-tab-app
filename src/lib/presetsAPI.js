import { supabase } from './supabase';

export async function loadPresetsForUsername(username) {
  if (!username) return [];
  const { data, error } = await supabase
    .from('presets')
    .select('id, name, data, updated_at')
    .eq('username', username)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('loadPresetsForUsername error', error);
    throw error;
  }
  return data || [];
}

export async function upsertPresetForUsername(username, name, dataObj) {
  if (!username) throw new Error('Missing username');
  if (!name) throw new Error('Missing preset name');

  const payload = {
    username,
    name,
    data: dataObj,
    updated_at: new Date().toISOString()
  };

  // Request the DB to return the upserted row(s)
  const { data, error } = await supabase
    .from('presets')
    .upsert(payload, { onConflict: ['username', 'name'] })
    .select('id, username, name, data, updated_at');

  if (error) {
    console.error('upsertPresetForUsername error', error, { payload });
    throw error;
  }

  // return the created/updated row so caller can optimistically add it
  return data && data[0];
}

export async function deletePresetForUsername(username, name) {
  if (!username) throw new Error('Missing username');
  const { data, error } = await supabase
    .from('presets')
    .delete()
    .eq('username', username)
    .eq('name', name)
    .select(); // return deleted row(s) for logging

  if (error) {
    console.error('deletePresetForUsername error', error);
    throw error;
  }
  return data;
}

