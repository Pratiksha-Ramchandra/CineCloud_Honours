const express = require('express');
const { ObjectId, connectMongo } = require('../mongo');
const { verifyToken, verifyRole } = require('./auth');

const router = express.Router();

// Dashboard stats
router.get('/dashboard/stats', verifyToken, verifyRole(['admin']), async (req, res) => {
    try {
        const db = await connectMongo();
        const totalUsers = await db.collection('users').countDocuments({ role: 'user' });
        const totalMovies = await db.collection('movies').countDocuments({ isActive: true });
        // Count bookings that are not cancelled (covers older docs without status)
        const totalBookings = await db.collection('bookings').countDocuments({ status: { $ne: 'cancelled' } });
        const revenueResult = await db.collection('bookings').aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]).toArray();
        const totalRevenue = revenueResult[0]?.total || 0;
        const recentBookings = await db.collection('bookings').aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $lookup: {
                    from: 'showtimes',
                    localField: 'showtimeId',
                    foreignField: '_id',
                    as: 'showtime'
                }
            },
            { $unwind: '$showtime' },
            {
                $lookup: {
                    from: 'movies',
                    localField: 'showtime.movieId',
                    foreignField: '_id',
                    as: 'movie'
                }
            },
            { $unwind: '$movie' },
            {
                $project: {
                    bookingId: 1,
                    totalAmount: 1,
                    status: 1,
                    bookingDate: 1,
                    user_name: '$user.name',
                    movie_title: '$movie.title'
                }
            },
            { $sort: { bookingDate: -1 } },
            { $limit: 10 }
        ]).toArray();

        // Provide counts by status to help debug discrepancies
        const statusAgg = await db.collection('bookings').aggregate([
            { $group: { _id: { $ifNull: ['$status', 'unknown'] }, count: { $sum: 1 } } }
        ]).toArray();
        const statusCounts = statusAgg.reduce((acc, cur) => {
            acc[cur._id] = cur.count;
            return acc;
        }, {});

        // Helpful derived counts
        const confirmedCount = statusCounts.confirmed || 0;
        const cancelledCount = statusCounts.cancelled || 0;
        const unknownStatusCount = statusCounts.unknown || 0;

        res.json({
            totalUsers,
            totalMovies,
            totalBookings,
            totalRevenue,
            recentBookings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get all bookings
router.get('/bookings', verifyToken, verifyRole(['admin']), async (req, res) => {
    try {
        const db = await connectMongo();
        const bookings = await db.collection('bookings').aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $lookup: {
                    from: 'showtimes',
                    localField: 'showtimeId',
                    foreignField: '_id',
                    as: 'showtime'
                }
            },
            { $unwind: '$showtime' },
            {
                $lookup: {
                    from: 'movies',
                    localField: 'showtime.movieId',
                    foreignField: '_id',
                    as: 'movie'
                }
            },
            { $unwind: '$movie' },
            {
                $project: {
                    bookingId: 1,
                    seats: 1,
                    totalAmount: 1,
                    status: 1,
                    bookingDate: 1,
                    user_name: '$user.name',
                    user_email: '$user.email',
                    movie_title: '$movie.title'
                }
            },
            { $sort: { bookingDate: -1 } }
        ]).toArray();

        res.json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Get all showtimes
router.get('/showtimes', verifyToken, verifyRole(['admin']), async (req, res) => {
    try {
        const db = await connectMongo();
        const showtimes = await db.collection('showtimes').aggregate([
            {
                $lookup: {
                    from: 'movies',
                    localField: 'movieId',
                    foreignField: '_id',
                    as: 'movie'
                }
            },
            { $unwind: '$movie' },
            {
                $lookup: {
                    from: 'theaters',
                    localField: 'theaterId',
                    foreignField: '_id',
                    as: 'theater'
                }
            },
            { $unwind: '$theater' },
            {
                $project: {
                    id: { $toString: '$_id' },
                    movie_id: { $toString: '$movie._id' },
                    movie_title: '$movie.title',
                    theater_id: { $toString: '$theater._id' },
                    theater_name: '$theater.name',
                    theater_location: '$theater.location',
                    show_date: '$showDate',
                    show_time: '$showTime',
                    price: 1,
                    available_seats: '$availableSeats',
                    total_seats: '$totalSeats'
                }
            },
            { $sort: { show_date: -1, show_time: 1 } }
        ]).toArray();

        res.json(showtimes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch showtimes' });
    }
});

// Get theaters for admin showtime creation
router.get('/theaters', verifyToken, verifyRole(['admin']), async (req, res) => {
    try {
        const db = await connectMongo();
        const theaters = await db.collection('theaters').find({}).toArray();
        res.json(theaters.map(theater => ({ id: theater._id.toString(), name: theater.name, location: theater.location })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch theaters' });
    }
});

// Add showtime
router.post('/showtimes', verifyToken, verifyRole(['admin']), async (req, res) => {
    try {
        const { movie_id, theater_id, show_date, show_time, price, total_seats } = req.body;
        console.log('[SHOWTIME CREATE] Endpoint hit - Method POST, User:', req.user);
        console.log('[SHOWTIME CREATE] Request body:', { movie_id, theater_id, show_date, show_time, price, total_seats });

        if (!movie_id || !theater_id || !show_date || !show_time || !price || !total_seats) {
            console.log('[SHOWTIME CREATE] Error: Missing required fields');
            return res.status(400).json({ error: 'All showtime fields are required' });
        }

        console.log('[SHOWTIME CREATE] Connecting to MongoDB...');
        const db = await connectMongo();
        console.log('[SHOWTIME CREATE] MongoDB connected');

        console.log('[SHOWTIME CREATE] Checking movie:', movie_id);
        const movie = await db.collection('movies').findOne({ _id: new ObjectId(movie_id), isActive: true });
        if (!movie) {
            console.log('[SHOWTIME CREATE] Error: Movie not found or inactive');
            return res.status(404).json({ error: 'Movie not found or inactive' });
        }
        console.log('[SHOWTIME CREATE] Movie found:', movie.title);

        console.log('[SHOWTIME CREATE] Checking theater:', theater_id);
        const theater = await db.collection('theaters').findOne({ _id: new ObjectId(theater_id) });
        if (!theater) {
            console.log('[SHOWTIME CREATE] Error: Theater not found');
            return res.status(404).json({ error: 'Theater not found' });
        }
        console.log('[SHOWTIME CREATE] Theater found:', theater.name);

        const showtimeDate = new Date(show_date);
        if (isNaN(showtimeDate.getTime())) {
            console.log('[SHOWTIME CREATE] Error: Invalid show date');
            return res.status(400).json({ error: 'Invalid show date' });
        }

        const seats = Number(total_seats);
        if (!Number.isFinite(seats) || seats <= 0) {
            console.log('[SHOWTIME CREATE] Error: Invalid seat count');
            return res.status(400).json({ error: 'Total seats must be a positive number' });
        }

        const showtimeDoc = {
            movieId: new ObjectId(movie_id),
            theaterId: new ObjectId(theater_id),
            showDate: showtimeDate,
            showTime: show_time,
            price: Number(price),
            availableSeats: seats,
            totalSeats: seats,
            createdAt: new Date()
        };

        console.log('[SHOWTIME CREATE] Attempting to insert showtime:', showtimeDoc);
        const result = await db.collection('showtimes').insertOne(showtimeDoc);
        console.log('[SHOWTIME CREATE] SUCCESS - Showtime created with id:', result.insertedId.toString());

        res.status(201).json({ message: 'Showtime added', id: result.insertedId.toString() });
    } catch (error) {
        console.error('[SHOWTIME CREATE] ERROR:', error.message);
        console.error('[SHOWTIME CREATE] Stack:', error.stack);
        res.status(500).json({ error: 'Failed to add showtime: ' + error.message });
    }
});

// Update showtime
router.put('/showtimes/:id', verifyToken, verifyRole(['admin']), async (req, res) => {
    try {
        const { movie_id, theater_id, show_date, show_time, price, total_seats } = req.body;
        const db = await connectMongo();

        const existingShowtime = await db.collection('showtimes').findOne({ _id: new ObjectId(req.params.id) });
        if (!existingShowtime) {
            return res.status(404).json({ error: 'Showtime not found' });
        }

        const newTotalSeats = Number(total_seats);
        const seatDiff = newTotalSeats - (existingShowtime.totalSeats || 0);
        const updatedAvailableSeats = Math.max(0, (existingShowtime.availableSeats || 0) + seatDiff);

        const updateDoc = {
            showDate: new Date(show_date),
            showTime: show_time,
            price: Number(price),
            totalSeats: newTotalSeats,
            availableSeats: updatedAvailableSeats
        };

        if (movie_id) {
            updateDoc.movieId = new ObjectId(movie_id);
        }
        if (theater_id) {
            updateDoc.theaterId = new ObjectId(theater_id);
        }

        const result = await db.collection('showtimes').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateDoc }
        );

        if (!result.matchedCount) {
            return res.status(404).json({ error: 'Showtime not found' });
        }

        res.json({ message: 'Showtime updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update showtime' });
    }
});

// Free all seats for a showtime (admin)
router.put('/showtimes/:id/free', verifyToken, verifyRole(['admin']), async (req, res) => {
    try {
        const db = await connectMongo();
        const showtime = await db.collection('showtimes').findOne({ _id: new ObjectId(req.params.id) });
        if (!showtime) {
            return res.status(404).json({ error: 'Showtime not found' });
        }

        // Cancel all bookings for this showtime that are not already cancelled
        const result = await db.collection('bookings').updateMany(
            { showtimeId: showtime._id, status: { $ne: 'cancelled' } },
            { $set: { status: 'cancelled' } }
        );

        // Reset availableSeats to totalSeats
        await db.collection('showtimes').updateOne(
            { _id: showtime._id },
            { $set: { availableSeats: showtime.totalSeats || 0 } }
        );

        res.json({ message: 'All seats freed', cancelledBookings: result.modifiedCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to free seats' });
    }
});

// Get all users
router.get('/users', verifyToken, verifyRole(['admin']), async (req, res) => {
    try {
        const db = await connectMongo();
        const users = await db.collection('users')
            .find({}, { projection: { name: 1, email: 1, phone: 1, role: 1, createdAt: 1 } })
            .toArray();

        res.json(users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            role: user.role,
            created_at: user.createdAt
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

module.exports = router;
