import crypto from 'crypto';
import path from 'path';
import {
  getSupabaseAdminClient,
  getSupabaseBucket,
  getSupabaseProfileBucket,
} from '../config/supabase.js';

const allowedRoles = new Set(['seller', 'laborer']);

function sanitizeFileName(fileName = 'upload') {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, extension);
  const normalizedBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const safeBase = normalizedBase || 'file';
  const safeExtension = extension.replace(/[^.a-z0-9]/g, '').slice(0, 10) || '.bin';

  return `${safeBase}${safeExtension}`;
}

function buildSignedUploadTarget({ bucket, objectPath }) {
  const supabase = getSupabaseAdminClient();

  return supabase.storage
    .from(bucket)
    .createSignedUploadUrl(objectPath);
}

export async function createVerificationUploadTarget({
  userId,
  role,
  documentType,
  fileName,
}) {
  if (!allowedRoles.has(role)) {
    throw new Error('Unsupported verification role.');
  }

  const bucket = getSupabaseBucket();
  const safeFileName = sanitizeFileName(fileName);
  const objectPath = `${userId}/${role}/${documentType}-${crypto.randomUUID()}-${safeFileName}`;

  const { data, error } = await buildSignedUploadTarget({ bucket, objectPath });

  if (error) {
    throw error;
  }

  return {
    bucket,
    path: objectPath,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

export async function createProfileAvatarUploadTarget({
  userId,
  fileName,
}) {
  const bucket = getSupabaseProfileBucket();
  const safeFileName = sanitizeFileName(fileName);
  const objectPath = `${userId}/avatar-${crypto.randomUUID()}-${safeFileName}`;
  const { data, error } = await buildSignedUploadTarget({ bucket, objectPath });

  if (error) {
    throw error;
  }

  return {
    bucket,
    path: objectPath,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

export function getProfileAvatarPublicUrl(path) {
  const bucket = getSupabaseProfileBucket();
  const supabase = getSupabaseAdminClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    bucket,
    url: data.publicUrl,
  };
}

export async function createProfileAvatarSignedUrl(path) {
  const bucket = getSupabaseProfileBucket();
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);

  if (error) {
    throw error;
  }

  return {
    bucket,
    url: data.signedUrl,
  };
}

export async function createVerificationDocumentSignedUrl(path, bucket = getSupabaseBucket()) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);

  if (error) {
    throw error;
  }

  return {
    bucket,
    url: data.signedUrl,
  };
}

export async function deleteVerificationDocuments(documents = []) {
  const groupedDocuments = documents.reduce((groups, document) => {
    if (!document?.bucket || !document?.path) {
      return groups;
    }

    if (!groups[document.bucket]) {
      groups[document.bucket] = [];
    }

    groups[document.bucket].push(document.path);
    return groups;
  }, {});

  const supabase = getSupabaseAdminClient();

  await Promise.all(
    Object.entries(groupedDocuments).map(async ([bucket, paths]) => {
      if (!Array.isArray(paths) || paths.length === 0) {
        return;
      }

      const { error } = await supabase.storage.from(bucket).remove(paths);

      if (error) {
        throw error;
      }
    }),
  );
}

export function extractProfileAvatarPath(sourceUrl = '') {
  const bucket = getSupabaseProfileBucket();
  const marker = `/storage/v1/object/public/${bucket}/`;

  if (!sourceUrl.includes(marker)) {
    return '';
  }

  const [, pathWithQuery = ''] = sourceUrl.split(marker);
  return pathWithQuery.split('?')[0] || '';
}
