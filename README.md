# CryptoHeir

A decentralized inheritance platform for Ethereum that enables secure, automated distribution of cryptocurrency assets to designated heirs after periods of inactivity.

## What is CryptoHeir?

CryptoHeir is a smart contract system that allows you to create cryptocurrency inheritance plans. If you become inactive for a specified period, your designated heirs can claim their share of your selected tokens automatically.

**Key Features:**
- Set custom inactivity periods
- Multiple heirs with custom percentage splits
- Support for any ERC-20 tokens
- Full management capatibilities
- Web interface for easy management

## Quick Run
You will be able to use CryptoHeir through [cryptoheir.org](https://cryptoheir.org) soon, without deploying it yourself. Smart contract ensures your control.

## Run Your Own
If you wanna run CryptoHeir yourself, you can deploy your own copy of CryptoHeir smart contract and build your own dApp.

### 1. Clone and Setup
```bash
git clone https://github.com/aeeravsar/CryptoHeir.git
cd CryptoHeir
```
### 2. Deploy the Smart Contract
```bash
cd contract
npm install

cp .env.example .env
# Edit .env with your credentials

npx hardhat compile
npx hardhat run scripts/deploy-mainnet.js --network mainnet
```

### 3. Run the Web Interface
```bash
cd web
npm install

cp .env.example .env
# Edit .env with your credentials

./start.sh
```

## How It Works

### For Asset Owners
1. **Setup**: Connect wallet, set inactivity period (e.g., 6 months), add heirs with percentages
2. **Select Tokens**: Choose which ERC-20 tokens to include in inheritance
3. **Stay Active**: Send heartbeats regularly to avoid timeout
4. **Manage**: Update heirs, tokens, or settings anytime

### For Heirs
1. **Wait**: Inheritance becomes available after the inactivity period
2. **Claim**: Visit the web interface and claim your designated share

## Security

- **Immutable Contract**: Once deployed, cannot be upgraded
- **Non-custodial**: Contract only has permission for tokens you explicitly approve
- **Open Source**: All code is publicly auditable

## FAQ


**Q: Can I change my heirs?**
A: Yes, you can update heirs and percentages anytime while active.

**Q: What tokens are supported?**
A: Any standard ERC-20 token on Ethereum.

**Q: Is there a fee?**
A: No platform fees. Only standard Ethereum gas costs.

## License

GPL-2.0 - See [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/aeeravsar/CryptoHeir/issues)
- **Documentation**: Coming soon...

---

⚠️ **Important**: This handles real cryptocurrency. Test thoroughly on Sepolia before mainnet use.
