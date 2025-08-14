const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting store (simple in-memory store)
const rateLimitStore = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Input validation helpers
const validateEthereumAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const validateChainId = (chainId) => {
    const validChains = [1, 11155111]; // Mainnet, Sepolia
    return validChains.includes(parseInt(chainId));
};

// API Routes
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'CryptoHeir Web Server',
        timestamp: new Date().toISOString()
    });
});

// Contract configuration endpoint
app.get('/api/config', (req, res) => {
    res.json({
        contractAddresses: {
            SEPOLIA: process.env.CONTRACT_ADDRESS_SEPOLIA,
            MAINNET: process.env.CONTRACT_ADDRESS_MAINNET
        }
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

// Get token metadata endpoint
app.post('/api/token-metadata', rateLimit, async (req, res) => {
    try {
        const { address, chainId } = req.body;
        
        if (!address || !ethers.isAddress(address)) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Valid token address is required'
            });
        }

        // Build Alchemy URL
        const alchemyKey = process.env.ALCHEMY_API_KEY;
        if (!alchemyKey) {
            return res.status(500).json({
                error: 'Configuration error',
                message: 'External API not configured'
            });
        }

        const networkName = chainId == 1 ? 'eth-mainnet' : 'eth-sepolia';
        const alchemyUrl = `https://${networkName}.g.alchemy.com/v2/${alchemyKey}`;


        // Call Alchemy API
        const response = await axios.post(alchemyUrl, {
            id: 1,
            jsonrpc: '2.0',
            method: 'alchemy_getTokenMetadata',
            params: [address]
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.data || response.data.error) {
            return res.status(502).json({
                error: 'External API error',
                message: 'Failed to fetch token metadata'
            });
        }

        const metadata = response.data.result;
        
        res.json({
            success: true,
            symbol: metadata?.symbol || 'TOKEN',
            name: metadata?.name || 'Unknown Token',
            decimals: metadata?.decimals || 18,
            logo: metadata?.logo || null
        });

    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({
                error: 'Request timeout',
                message: 'Token metadata service timed out'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch token metadata'
        });
    }
});

// Static file serving with security
// Block access to sensitive files and directories
app.use((req, res, next) => {
    const blockedPaths = [
        '/api/',           // Don't serve API directory files
        '/.env',           // Don't serve .env files
        '/package.json',   // Don't serve package.json
        '/server.js',      // Don't serve server.js
        '/node_modules/',  // Don't serve node_modules
        '/.git',           // Don't serve git files
        '/start.sh'        // Don't serve shell scripts
    ];
    
    const isBlocked = blockedPaths.some(path => req.path.startsWith(path));
    
    if (isBlocked) {
        return res.status(404).json({
            error: 'Not found',
            message: 'File not found'
        });
    }
    
    next();
});

// Serve static files (HTML, CSS, JS, etc.)
app.use(express.static('.', {
    index: 'index.html',
    dotfiles: 'deny', // Don't serve files starting with .
    extensions: ['html', 'htm', 'js', 'css', 'png', 'jpg', 'gif', 'svg', 'ico'],
}));

// Catch-all for frontend routes (SPA support)
app.get('*', (req, res) => {
    // If it's not an API route, serve index.html
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).json({
            error: 'API endpoint not found',
            message: 'The requested API endpoint does not exist'
        });
    }
});

// Error handler
app.use((error, req, res, next) => {
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CryptoHeir Web Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${__dirname}`);
    console.log(`🔒 API endpoints protected with rate limiting`);
    console.log(`⚡ Rate limit: ${process.env.RATE_LIMIT || 60} requests/minute`);
    
    if (!process.env.ALCHEMY_API_KEY) {
        console.warn('⚠️  ALCHEMY_API_KEY not set - token discovery will not work');
    }
    
    console.log(`\n📋 Available endpoints:`);
    console.log(`   🌐 Frontend: http://localhost:${PORT}`);
    console.log(`   ❤️  Health:   http://localhost:${PORT}/api/health`);
    console.log(`   ⚙️  Config:   http://localhost:${PORT}/api/config`);
    console.log(`   🪙 Tokens:    POST http://localhost:${PORT}/api/token-balances`);
    console.log(`   📝 Metadata: POST http://localhost:${PORT}/api/token-metadata`);
});