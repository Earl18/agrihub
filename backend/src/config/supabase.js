import { createClient } from '@supabase/supabase-js';

let adminClient;

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is missing. Add it to .env.`);
  }

  return value;
}

export function getSupabaseBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'verification-documents';
}

export function getSupabaseProfileBucket() {
  return process.env.SUPABASE_PROFILE_BUCKET?.trim() || 'profile-pictures';
}

export function getSupabaseAdminClient() {
  if (!adminClient) {
    adminClient = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return adminClient;
}
