const express = require('express');
const { ObjectId, connectMongo } = require('../mongo');
const { verifyToken } = require('./auth');

const router = express.Router();

// Generate unique booking ID
function generateBookingId() {
    return 'CINECLOUD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

// Create booking
router.post('/create', verifyToken, async (req, res) => {
    try {
        const { showtimeId, seats } = req.body;
        const userId = new ObjectId(req.user.id);
        const db = await connectMongo();

        const showtime = await db.collection('showtimes').findOne({ _id: new ObjectId(showtimeId) });
        if (!showtime) {
            return res.status(404).json({ error: 'Showtime not found' });
        }

        const existingBookings = await db.collection('bookings').find({ showtimeId: showtime._id, status: 'confirmed' }).toArray();
        const bookedSeats = [];
        existingBookings.forEach(booking => {
            if (Array.isArray(booking.seats)) {
                bookedSeats.push(...booking.seats);
            }
        });

        const conflictingSeats = seats.filter(seat => bookedSeats.includes(seat));
        if (conflictingSeats.length > 0) {
            return res.status(400).json({ error: `Seats ${conflictingSeats.join(', ')} are already booked` });
        }

        if (showtime.availableSeats < seats.length) {
            return res.status(400).json({ error: 'Not enough seats available' });
        }

        const totalAmount = seats.length * showtime.price;
        const bookingId = generateBookingId();

        await db.collection('bookings').insertOne({
            bookingId,
            userId,
            showtimeId: showtime._id,
            seats,
            totalAmount,
            status: 'confirmed',
            bookingDate: new Date()
        });

        await db.collection('showtimes').updateOne(
            { _id: showtime._id },
            { $inc: { availableSeats: -seats.length } }
        );

        res.status(201).json({
            message: 'Booking created successfully',
            bookingId,
            totalAmount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Failed to create booking' });
    }
});

// Get user bookings
router.get('/my-bookings', verifyToken, async (req, res) => {
    try {
        const db = await connectMongo();
        const userId = new ObjectId(req.user.id);

        const bookings = await db.collection('bookings').aggregate([
            { $match: { userId } },
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
                $lookup: {
                    from: 'theaters',
                    localField: 'showtime.theaterId',
                    foreignField: '_id',
                    as: 'theater'
                }
            },
            { $unwind: { path: '$theater', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    bookingId: 1,
                    seats: 1,
                    totalAmount: 1,
                    status: 1,
                    bookingDate: 1,
                    movie_title: '$movie.title',
                    poster_url: '$movie.posterUrl',
                    show_date: '$showtime.showDate',
                    show_time: '$showtime.showTime',
                    theater_name: '$theater.name'
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

// Cancel booking
router.put('/:bookingId/cancel', verifyToken, async (req, res) => {
    try {
        const db = await connectMongo();
        const userId = new ObjectId(req.user.id);

        const booking = await db.collection('bookings').findOne({ bookingId: req.params.bookingId, userId });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ error: 'Booking already cancelled' });
        }

        await db.collection('bookings').updateOne(
            { _id: booking._id },
            { $set: { status: 'cancelled' } }
        );

        await db.collection('showtimes').updateOne(
            { _id: booking.showtimeId },
            { $inc: { availableSeats: booking.seats.length } }
        );

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Failed to cancel booking' });
    }
});

module.exports = router;