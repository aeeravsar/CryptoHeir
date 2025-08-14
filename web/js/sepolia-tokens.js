// Sepolia testnet helper for development
// Optional test token for quick testing on Sepolia

const SEPOLIA_TEST_TOKEN = '0xa6feDa8640C8486B3faC94b7a50a5Ecc09585999'; // ITT token deployed on Sepolia

// Add a helper button to quickly fill in the test token for testing
document.addEventListener('DOMContentLoaded', function() {
    // Only add helper on Sepolia testnet
    setTimeout(() => {
        if (window.walletManager && walletManager.chainId === 11155111) {
            const tokensContainer = document.getElementById('tokensContainer');
            if (tokensContainer) {
                const helperDiv = document.createElement('div');
                helperDiv.style.marginTop = '0.5rem';
                helperDiv.innerHTML = `
                    <small style="color: var(--text-secondary);">
                        Testing on Sepolia? 
                        <button type="button" class="btn btn-sm btn-secondary" onclick="fillTestToken()">
                            Use Test Token (ITT)
                        </button>
                    </small>
                `;
                
                tokensContainer.parentNode.insertBefore(helperDiv, tokensContainer.nextSibling);
            }
        }
    }, 1000); // Wait for wallet to connect
});

// Function to fill test token
window.fillTestToken = function() {
    const firstTokenInput = document.querySelector('.token-address');
    if (firstTokenInput) {
        firstTokenInput.value = SEPOLIA_TEST_TOKEN;
        UI.showToast('Test token address added!', 'success', 2000);
    }
};