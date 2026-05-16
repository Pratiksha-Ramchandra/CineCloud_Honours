const express = require('express');
const { ObjectId, connectMongo } = require('../mongo');

const router = express.Router();
const { verifyToken, verifyRole } = require('./auth');

// Create a new movie (admin only)
router.post('/', verifyToken, verifyRole(['admin']), async (req, res) => {
    try {
        const { title, description, release_date, duration, genre, poster_url, trailer_url } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const db = await connectMongo();
        const movieDoc = {
            title,
            description: description || '',
            releaseDate: release_date ? new Date(release_date) : new Date(),
            duration: duration || null,
            genre: genre || null,
            posterUrl: poster_url || null,
            trailerUrl: trailer_url || null,
            isActive: true,
            createdAt: new Date()
        };

        const result = await db.collection('movies').insertOne(movieDoc);
        console.log('Movie created with id', result.insertedId.toString());
        // Return the created movie document for easier client-side handling
        const created = await db.collection('movies').findOne({ _id: result.insertedId });
        res.status(201).json({ message: 'Movie created', id: result.insertedId.toString(), movie: created });
    } catch (error) {
        console.error('Failed to create movie', error);
        res.status(500).json({ error: 'Failed to create movie' });
    }
});

// Get all movies
router.get('/', async (req, res) => {
    try {
        const db = await connectMongo();
        const movies = await db.collection('movies')
            .find({ isActive: true })
            .sort({ releaseDate: -1 })
            .toArray();

        const response = movies.map(movie => ({
            ...movie,
            id: movie._id.toString(),
            poster_url: movie.posterUrl || movie.poster_url,
            release_date: movie.releaseDate || movie.release_date,
            trailer_url: movie.trailerUrl || movie.trailer_url
        }));

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

// Get movie details with showtimes
router.get('/:id', async (req, res) => {
    try {
        const db = await connectMongo();
        const movie = await db.collection('movies').findOne({ _id: new ObjectId(req.params.id), isActive: true });
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        const showtimes = await db.collection('showtimes').aggregate([
            { $match: { movieId: movie._id, showDate: { $gte: new Date(new Date().toISOString().split('T')[0]) } } },
            {
                $lookup: {
                    from: 'theaters',
                    localField: 'theaterId',
                    foreignField: '_id',
                    as: 'theater'
                }
            },
            { $unwind: { path: '$theater', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    id: { $toString: '$_id' },
                    show_date: '$showDate',
                    show_time: '$showTime',
                    price: '$price',
                    available_seats: '$availableSeats',
                    total_seats: '$totalSeats',
                    theater_name: '$theater.name',
                    location: '$theater.location'
                }
            },
            { $sort: { show_date: 1, show_time: 1 } }
        ]).toArray();

        res.json({
            ...movie,
            id: movie._id.toString(),
            poster_url: movie.posterUrl || movie.poster_url,
            release_date: movie.releaseDate || movie.release_date,
            trailer_url: movie.trailerUrl || movie.trailer_url,
            showtimes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
});

// Get showtime seats
router.get('/showtime/:showtimeId/seats', async (req, res) => {
    try {
        const db = await connectMongo();
        const showtime = await db.collection('showtimes').findOne({ _id: new ObjectId(req.params.showtimeId) });
        if (!showtime) {
            return res.status(404).json({ error: 'Showtime not found' });
        }

        const bookings = await db.collection('bookings').find({ showtimeId: showtime._id, status: 'confirmed' }).toArray();
        const bookedSeats = [];
        bookings.forEach(booking => {
            if (Array.isArray(booking.seats)) {
                bookedSeats.push(...booking.seats);
            }
        });

        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const seats = [];
        for (let row of rows) {
            for (let i = 1; i <= 12; i++) {
                const seatId = `${row}${i}`;
                seats.push({
                    id: seatId,
                    row,
                    number: i,
                    is_booked: bookedSeats.includes(seatId)
                });
            }
        }

        res.json({
            showtime: {
                ...showtime,
                id: showtime._id.toString(),
                show_date: showtime.showDate,
                show_time: showtime.showTime,
                available_seats: showtime.availableSeats,
                total_seats: showtime.totalSeats
            },
            seats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch seats' });
    }
});

// Upload file to Cloudinary (admin only)
router.post('/upload', verifyToken, verifyRole(['admin']), async (req, res) => {
    try {
        const cloudinaryUrl = process.env.CLOUDINARY_URL;
        if (!cloudinaryUrl) {
            return res.status(500).json({ error: 'Cloudinary URL not configured' });
        }

        // Parse cloudinary://API_KEY:API_SECRET@CLOUD_NAME format
        const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
        if (!match) {
            return res.status(500).json({ error: 'Invalid Cloudinary URL format' });
        }
        const [, apiKey, apiSecret, cloudName] = match;

        const { file, resourceType = 'image' } = req.body;
        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Decode base64 data
        const base64Data = file.includes(',') ? file.split(',')[1] : file;
        const buffer = Buffer.from(base64Data, 'base64');

        // Use node-fetch to upload to Cloudinary
        const FormData = require('form-data');
        const uploadForm = new FormData();
        uploadForm.append('file', buffer, { filename: 'upload' });
        uploadForm.append('upload_preset', 'ml_default');
        uploadForm.append('api_key', apiKey);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        const fetchResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: uploadForm,
            headers: uploadForm.getHeaders()
        });

        const result = await fetchResponse.json();

        if (result.error) {
            return res.status(400).json({ error: result.error.message || 'Upload failed' });
        }

        res.json({ url: result.secure_url || result.url });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

module.exports = router;
