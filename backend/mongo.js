require('dotenv').config();
const dns = require('dns');
const { MongoClient, ObjectId } = require('mongodb');

const dnsServers = process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8';
if (dnsServers) {
  dns.setServers(dnsServers.split(',').map(s => s.trim()).filter(Boolean));
}

const username = process.env.MONGO_USER || 'CineCloud_Database';
const password = process.env.MONGO_PASSWORD || 'Pratu@9504';
const host = process.env.MONGO_HOST || 'cinecloud.suooy1w.mongodb.net';
const dbName = process.env.MONGO_DB || 'cinecloud';
const options = process.env.MONGO_OPTIONS || 'appName=CineCloud&retryWrites=true&w=majority';

const uri = process.env.MONGO_URI ||
  `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/?${options}`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const defaultUsers = [
  {
    name: 'Admin User',
    email: 'admin@cinecloud.com',
    password: 'admin123',
    phone: null,
    role: 'admin',
    createdAt: new Date(),
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'john123',
    phone: '9876543210',
    role: 'user',
    createdAt: new Date(),
  },
  {
    name: 'Nil User',
    email: 'nil@example.com',
    password: 'nil123',
    phone: '9000000001',
    role: 'user',
    createdAt: new Date(),
  }
];

const posterTemplates = [
  'https://res.cloudinary.com/demo/image/upload/w_500,h_750,c_fill/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/w_500,h_750,c_fill/v1694723740/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/w_500,h_750,c_fill/v1610467184/sample2.jpg'
];

const trailerUrls = [
  'https://res.cloudinary.com/demo/video/upload/v1610467184/elephants.mp4',
  'https://res.cloudinary.com/demo/video/upload/v1610467184/balloons.mp4',
  'https://res.cloudinary.com/demo/video/upload/v1610467184/dance.mp4'
];

const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Animation', 'Thriller'];
const languages = ['English', 'Spanish', 'French', 'Hindi', 'Tamil', 'Korean'];
const adjectives = ['Quantum', 'Crimson', 'Midnight', 'Silver', 'Hidden', 'Lost', 'Star', 'Neon'];
const nouns = ['Journey', 'Empire', 'Secret', 'Galaxy', 'Shadow', 'Legacy', 'Night', 'Promise'];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomFloat(min, max, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

function randomTitle() {
  return `${randomItem(adjectives)} ${randomItem(nouns)}`;
}

function randomDate(startYear = 2020, endYear = 2026) {
  const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month - 1, day);
}

function createSampleMovie(seed = 0) {
  const genre = randomItem(genres);
  const language = randomItem(languages);
  return {
    title: `${randomTitle()} ${seed > 0 ? seed : ''}`.trim(),
    description: `A ${genre.toLowerCase()} adventure in a ${language.toLowerCase()} world.`,
    genre,
    duration: Math.floor(Math.random() * 61) + 90,
    language,
    posterUrl: posterTemplates[seed % posterTemplates.length],
    trailerUrl: trailerUrls[seed % trailerUrls.length],
    releaseDate: randomDate(),
    rating: randomFloat(5.0, 9.5, 1),
    isActive: true,
    createdAt: new Date(),
  };
}

async function ensureInitialUsers(db) {
  const users = db.collection('users');
  await Promise.all(defaultUsers.map(user =>
    users.updateOne(
      { email: user.email },
      { $setOnInsert: user },
      { upsert: true }
    )
  ));
}

async function ensureInitialMovies(db) {
  const moviesCollection = db.collection('movies');
  const moviesCount = await moviesCollection.countDocuments();
  if (moviesCount === 0) {
    // curated seed movies for a richer demo dataset
    const curated = [
      { title: 'Neon Galaxy', genre: 'Sci-Fi', language: 'English', duration: 120, rating: 8.2 },
      { title: 'Crimson Empire', genre: 'Action', language: 'Hindi', duration: 140, rating: 7.9 },
      { title: 'Midnight Promise', genre: 'Drama', language: 'Spanish', duration: 110, rating: 7.4 },
      { title: 'Hidden Legacy', genre: 'Thriller', language: 'English', duration: 105, rating: 7.8 },
      { title: 'Star Journey', genre: 'Animation', language: 'English', duration: 95, rating: 8.6 },
      { title: 'Silver Shadow', genre: 'Horror', language: 'Korean', duration: 100, rating: 6.9 },
      { title: 'Quantum Secret', genre: 'Sci-Fi', language: 'French', duration: 125, rating: 8.0 },
      { title: 'Lost Night', genre: 'Romance', language: 'Tamil', duration: 130, rating: 7.1 }
    ];

    const sampleMovies = curated.map((c, i) => ({
      title: c.title,
      description: `A ${c.genre.toLowerCase()} story — ${c.title}`,
      genre: c.genre,
      duration: c.duration || Math.floor(Math.random() * 61) + 90,
      language: c.language || randomItem(languages),
      posterUrl: posterTemplates[i % posterTemplates.length],
      trailerUrl: trailerUrls[i % trailerUrls.length],
      releaseDate: randomDate(2019, 2026),
      rating: c.rating || randomFloat(5.0, 9.5, 1),
      isActive: true,
      createdAt: new Date()
    }));

    await moviesCollection.insertMany(sampleMovies);
    return;
  }

  await moviesCollection.updateMany(
    { trailerUrl: { $exists: false } },
    { $set: { trailerUrl: trailerUrls[0] } }
  );
  await moviesCollection.updateMany(
    { posterUrl: { $exists: false } },
    { $set: { posterUrl: posterTemplates[0] } }
  );
  await moviesCollection.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );
}

async function ensureInitialTheaters(db) {
  const theaters = db.collection('theaters');
  const count = await theaters.countDocuments();
  if (count === 0) {
    await theaters.insertMany([
      { name: 'CineCloud Mall', location: 'Downtown City Center', totalSeats: 96, isActive: true },
      { name: 'Grand Cinema', location: 'Westside Plaza', totalSeats: 96, isActive: true },
      { name: 'Silver Screen', location: 'East End Mall', totalSeats: 96, isActive: true }
    ]);
  }
}

async function ensureInitialShowtimes(db) {
  const showtimes = db.collection('showtimes');
  const count = await showtimes.countDocuments();
  if (count > 0) {
    return;
  }

  const movies = await db.collection('movies').find({ isActive: true }).limit(4).toArray();
  const theaters = await db.collection('theaters').find({}).toArray();
  if (movies.length === 0 || theaters.length === 0) {
    return;
  }

  const baseDate = new Date();
  const todaysDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const showtimeData = [];

  movies.forEach((movie, index) => {
    const theater = theaters[index % theaters.length];
    for (let offset = 0; offset < 3; offset++) {
      const date = new Date(todaysDate);
      date.setDate(date.getDate() + offset);
      const times = ['10:00', '14:00', '18:00'];
      times.forEach((time, timeIndex) => {
        showtimeData.push({
          movieId: movie._id,
          theaterId: theater._id,
          showDate: date,
          showTime: time,
          price: 200 + timeIndex * 50,
          availableSeats: theater.totalSeats,
          totalSeats: theater.totalSeats,
          createdAt: new Date()
        });
      });
    }
  });

  if (showtimeData.length > 0) {
    await showtimes.insertMany(showtimeData);
  }
}

async function ensureInitialBookings(db) {
  const bookings = db.collection('bookings');
  const count = await bookings.countDocuments();
  if (count > 0) {
    return;
  }

  const users = await db.collection('users').find({}).toArray();
  const showtimes = await db.collection('showtimes').find({}).limit(4).toArray();
  if (users.length === 0 || showtimes.length === 0) {
    return;
  }

  const johnUser = users.find((user) => user.email === 'john@example.com') || users[0];
  const bookingData = [
    {
      bookingId: 'CINECLOUD_SAMPLE_1',
      userId: johnUser._id,
      showtimeId: showtimes[0]._id,
      seats: ['A1', 'A2'],
      totalAmount: showtimes[0].price * 2,
      status: 'confirmed',
      bookingDate: new Date()
    },
    {
      bookingId: 'CINECLOUD_SAMPLE_2',
      userId: johnUser._id,
      showtimeId: showtimes[1]._id,
      seats: ['B1', 'B2', 'B3'],
      totalAmount: showtimes[1].price * 3,
      status: 'confirmed',
      bookingDate: new Date(new Date().getTime() - 86400000)
    }
  ];

  await bookings.insertMany(bookingData);
  await db.collection('showtimes').updateOne(
    { _id: showtimes[0]._id },
    { $inc: { availableSeats: -2 } }
  );
  await db.collection('showtimes').updateOne(
    { _id: showtimes[1]._id },
    { $inc: { availableSeats: -3 } }
  );
}

async function seedDatabase() {
  // Expose a simple programmatic seeding operation for external scripts
  if (client.closed) {
    await client.connect();
  }
  const db = client.db(dbName);
  await ensureInitialUsers(db);
  await ensureInitialMovies(db);
  await ensureInitialTheaters(db);
  await ensureInitialShowtimes(db);
  await ensureInitialBookings(db);
  return db;
}

async function connectMongo() {
  if (client.closed) {
    await client.connect();
  }
  const db = client.db(dbName);
  await ensureInitialUsers(db);
  await ensureInitialMovies(db);
  await ensureInitialTheaters(db);
  await ensureInitialShowtimes(db);
  return db;
}

async function insertRandomMovies(count = 5) {
  try {
    const db = await connectMongo();
    const collection = db.collection('movies');

    const docs = Array.from({ length: count }, (_, index) => createSampleMovie(index));
    const result = await collection.insertMany(docs);

    console.log(`Inserted ${result.insertedCount} random movie entries into ${dbName}.movies`);
    console.log('Inserted IDs:', Object.values(result.insertedIds));
  } catch (error) {
    console.error('MongoDB insert error:', error);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  const count = parseInt(process.argv[2], 10) || 10;
  insertRandomMovies(count).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  connectMongo,
  client,
  ObjectId,
  insertRandomMovies,
  seedDatabase
};
