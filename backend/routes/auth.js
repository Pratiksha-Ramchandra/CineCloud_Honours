const express = require('express');
const jwt = require('jsonwebtoken');
const { connectMongo, ObjectId } = require('../mongo');

const router = express.Router();

const normalizeRole = (role) => {
    if (!role) return 'user';
    const r = role.toString().toLowerCase();
    if (r === 'admin') return 'admin';
    if (r === 'user') return 'user';
    return null;
};

const verifyRole = (allowedRoles = []) => async (req, res, next) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Access denied' });
        }

        const verified = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = verified;

        const db = await connectMongo();
        const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
        if (!user || !allowedRoles.includes(user.role)) {
            return res.status(403).json({ error: 'Insufficient role access' });
        }

        req.user.role = user.role;
        next();
    } catch (error) {
        console.error(error);
        res.status(403).json({ error: 'Invalid token or access denied' });
    }
};

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const userRole = 'user';

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const db = await connectMongo();
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const userDoc = {
            name,
            email,
            password,
            phone: phone || null,
            role: userRole,
            createdAt: new Date()
        };

        const result = await db.collection('users').insertOne(userDoc);
        const userId = result.insertedId.toString();

        const token = jwt.sign(
            { id: userId, email, role: userRole },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: userId, name, email, role: userRole, phone: phone || null } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const db = await connectMongo();
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userId = user._id.toString();

        const token = jwt.sign(
            { id: userId, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: userId,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone || null
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Role-based login
router.post('/login-role', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const requestedRole = normalizeRole(role);

        if (!email || !password || !requestedRole) {
            return res.status(400).json({ error: 'Email, password, and role are required' });
        }

        if (!requestedRole) {
            return res.status(400).json({ error: 'Invalid role. Only admin and user are allowed.' });
        }

        const db = await connectMongo();
        const user = await db.collection('users').findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.role !== requestedRole) {
            return res.status(403).json({ error: `User role must be ${requestedRole}` });
        }

        const userId = user._id.toString();
        const token = jwt.sign(
            { id: userId, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: userId,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone || null
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Role login failed' });
    }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid token' });
    }
};

// Get current user
router.get('/me', verifyToken, async (req, res) => {
    try {
        const db = await connectMongo();
        const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch user profile' });
    }
});

// Change password
router.put('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const db = await connectMongo();
        const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });

        if (!user) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        if (user.password !== currentPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { password: newPassword } }
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});


module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.verifyRole = verifyRole;