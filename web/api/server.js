const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting store (simple in-memory store - use Redis for production)
const rateLimitStore = new Map();

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Simple rate limiting middleware
const rateLimit = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const limit = parseInt(process.env.RATE_LIMIT) || 60;

    if (!rateLimitStore.has(clientIP)) {
        rateLimitStore.set(clientIP, []);
    }

    const requests = rateLimitStore.get(clientIP);
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= limit) {
        return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Max ${limit} requests per minute.`
        });
    }

    recentRequests.push(now);
    rateLimitStore.set(clientIP, recentRequests);
    next();
};

// Input validation
const validateEthereumAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const validateChainId = (chainId) => {
    const validChains = [1, 11155111]; // Mainnet, Sepolia
    return validChains.includes(parseInt(chainId));
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'CryptoHeir API',
        timestamp: new Date().toISOString()
    });
});

// Get token balances endpoint
app.post('/api/token-balances', rateLimit, async (req, res) => {
    try {
        const { address, chainId } = req.body;

        // Input validation
        if (!address || !chainId) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'Both address and chainId are required'
            });
        }

        if (!validateEthereumAddress(address)) {
            return res.status(400).json({
                error: 'Invalid address',
                message: 'Address must be a valid Ethereum address'
            });
        }

        if (!validateChainId(chainId)) {
            return res.status(400).json({
                error: 'Unsupported chain',
                message: 'Only Mainnet (1) and Sepolia (11155111) are supported'
            });
        }

        // Build Alchemy URL
        const alchemyKey = process.env.ALCHEMY_API_KEY;
        if (!alchemyKey) {
            return res.status(500).json({
                error: 'Service configuration error',
                message: 'Token discovery service not available'
            });
        }

        const networkName = chainId == 1 ? 'eth-mainnet' : 'eth-sepolia';
        const alchemyUrl = `https://${networkName}.g.alchemy.com/v2/${alchemyKey}`;

        // Call Alchemy API
        const response = await axios.post(alchemyUrl, {
            id: 1,
            jsonrpc: '2.0',
            method: 'alchemy_getTokenBalances',
            params: [address]
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        if (response.data.error) {
            return res.status(500).json({
                error: 'External API error',
                message: 'Failed to fetch token balances'
            });
        }

        // Filter out zero balances and format response
        const tokenBalances = response.data.result?.tokenBalances || [];
        const nonZeroBalances = tokenBalances.filter(token => {
            const balance = token.tokenBalance;
            return balance && balance !== '0x0' && balance !== '0x' && balance !== '0';
        });

        res.json({
            success: true,
            address: address,
            chainId: parseInt(chainId),
            tokenCount: nonZeroBalances.length,
            tokens: nonZeroBalances.map(token => ({
                contractAddress: token.contractAddress,
                tokenBalance: token.tokenBalance
            }))
        });

    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({
                error: 'Request timeout',
                message: 'Token discovery service timed out'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch token balances'
        });
    }
});

// Fallback for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'API endpoint not found'
    });
});

// Error handler
app.use((error, req, res, next) => {
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 CryptoHeir API running on port ${PORT}`);
    console.log(`🔐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:8000'}`);
    console.log(`⚡ Rate limit: ${process.env.RATE_LIMIT || 60} requests/minute`);
    
    if (!process.env.ALCHEMY_API_KEY) {
        console.warn('⚠️  ALCHEMY_API_KEY not set - token discovery will not work');
    }
});