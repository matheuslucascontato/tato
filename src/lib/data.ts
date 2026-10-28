import 'server-only';
import { cache } from 'react';
import { requireUser } from './supabase/server';
import { snapshot } from './services/repository';
import { friendlyError } from './services/errors';
export const getData = cache(async () => {
  const { db, user } = await requireUser();
  try {
    return { ...(await snapshot(db, user.id)), user };
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});
