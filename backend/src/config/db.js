import mongoose from 'mongoose';
import { User } from '../models/User.js';

async function repairGoogleIdIndex() {
  const collection = User.collection;
  const indexes = await collection.indexes();
  const googleIndex = indexes.find((index) => index.name === 'googleId_1');

  if (
    googleIndex &&
    !googleIndex.partialFilterExpression
  ) {
    await collection.dropIndex('googleId_1');
  }

  await collection.createIndex(
    { googleId: 1 },
    {
      name: 'googleId_1',
      unique: true,
      partialFilterExpression: {
        googleId: {
          $type: 'string',
        },
      },
    },
  );
}

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing. Add it to backend/.env.');
  }

  await mongoose.connect(mongoUri);
  await repairGoogleIdIndex();
  console.log('MongoDB connected');
}
