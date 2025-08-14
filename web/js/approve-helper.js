// Quick helper to approve existing tokens
window.approveExistingToken = async function(tokenAddress) {
    if (!contractManager.contract) {
        UI.showToast('Contract not initialized', 'error');
        return;
    }
    
    try {
        UI.showLoading(true);
        UI.showToast('Approving token for inheritance...', 'info');
        
        const approved = await contractManager.approveToken(
            tokenAddress, 
            contractManager.contractAddress, 
            ethers.constants.MaxUint256
        );
        
        if (approved) {
            UI.showToast('Token approved successfully! You can now claim.', 'success');
        } else {
            UI.showToast('Token approval failed', 'error');
        }
    } catch (error) {
        UI.showToast('Approval failed: ' + error.message, 'error');
    } finally {
        UI.showLoading(false);
    }
};

// Add approve button to existing token claims
document.addEventListener('DOMContentLoaded', function() {
    // Add this after a delay to ensure everything is loaded
    setTimeout(() => {
        const style = document.createElement('style');
        style.textContent = `
            .approve-helper {
                margin-top: 1rem;
                padding: 1rem;
                background-color: rgba(37, 99, 235, 0.1);
                border: 1px solid var(--primary-color);
                border-radius: var(--border-radius);
                text-align: center;
            }
            .approve-helper h4 {
                margin: 0 0 0.5rem 0;
                color: var(--primary-color);
            }
            .approve-helper p {
                margin: 0 0 1rem 0;
                font-size: 0.875rem;
                color: var(--text-secondary);
            }
        `;
        document.head.appendChild(style);
    }, 1000);
});