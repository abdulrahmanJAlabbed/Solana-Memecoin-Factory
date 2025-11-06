// Minimal Buffer polyfill for browser environments
if (typeof window.Buffer === 'undefined') {
  window.Buffer = {
    from: function (value, encoding) {
      if (typeof value === 'string') {
        if (encoding === 'hex') {
          const hex = value;
          if (hex.length % 2 !== 0) {
            throw new Error('Invalid hex string');
          }
          const length = hex.length / 2;
          const result = new Uint8Array(length);
          for (let i = 0; i < length; i++) {
            result[i] = parseInt(hex.substr(i * 2, 2), 16);
          }
          return result;
        } else {
          const encoder = new TextEncoder();
          return encoder.encode(value);
        }
      }
      if (Array.isArray(value)) {
        return new Uint8Array(value);
      }
      if (value instanceof ArrayBuffer) {
        return new Uint8Array(value);
      }
      if (value instanceof Uint8Array) {
        return value;
      }
      throw new Error('Buffer.from: Unsupported input type');
    }
  };
}

// --------------------------------------------------
// Make sure to load these libraries via a CDN in your HTML:
// <script src="https://cdn.skypack.dev/@solana/web3.js"></script>
// <script src="https://cdn.skypack.dev/bs58"></script>
// --------------------------------------------------

// -------------------
// Wallet Connection
// -------------------
class WalletConnection {
  constructor() {
    // Cache DOM elements
    this.walletModal = document.getElementById('walletModal');
    this.connectButton = document.querySelector('.connect-btn');
    this.phantomButton = document.getElementById('phantom');
    this.closeModalButton = document.querySelector('.close-modal');

    // Consent modal text content
    this.consentText = `To create your Solana token, we need to:
1. Connect to your wallet address to send your new tokens.
2. Request approval for the 0.007 SOL creation fee.
3. Automatically return your created tokens to your wallet.

Your wallet remains secure through Phantom's trusted interface.
You'll confirm every transaction directly in your wallet.`;
    this.init();
  }

  init() {
    // Bind event listeners
    this.phantomButton.addEventListener('click', () => this.handleWalletConnection());
    this.connectButton.addEventListener('click', () => this.showWalletModal());
    this.closeModalButton.addEventListener('click', () => this.closeWalletModal());
    window.addEventListener('click', (event) => this.handleOutsideClick(event));
  }

  showWalletModal() {
    this.walletModal.style.display = 'block';
  }

  closeWalletModal() {
    this.walletModal.style.display = 'none';
  }

  handleOutsideClick(event) {
    if (event.target === this.walletModal) {
      this.closeWalletModal();
    }
  }

  async handleWalletConnection() {
    try {
      const accepted = await this.showConsentModal(
        'Connect Your Wallet to Create Tokens 🪄',
        this.consentText,
        'Connect Securely'
      );
      if (!accepted) {
        this.showToast('Wallet connection is required to create your token', 'info');
        return;
      }
      if (!window.solana?.isPhantom) {
        this.showFriendlyInstallPrompt();
        return;
      }
      const response = await window.solana.connect();
      const publicKey = response.publicKey.toString();
      console.log('Connected to Phantom Wallet:', publicKey);
      document.getElementById("ConnectWallet").setAttribute("data-id", publicKey);
      this.connectButton.textContent = `Connected (${publicKey.slice(0, 4)}...${publicKey.slice(-4)})`;
      this.closeWalletModal();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  handleConnectionError(error) {
    const errorMessages = {
      4001: 'No problem! We need your approval to create your token.',
      'not installed': "Let's get you set up! Install Phantom Wallet to continue.",
      default: 'Hmm, something went sideways. Want to try again?'
    };
    const message =
      errorMessages[error.code] ||
      errorMessages[error.message?.toLowerCase()] ||
      errorMessages.default;
    this.showFriendlyError(message);
  }

  showConsentModal(title, message, confirmText) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'friendly-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="emoji">🔐</div>
          <h3>${title}</h3>
          <div class="permission-details">
            <p>${message.replace(/\n/g, '<br>')}</p>
            <div class="security-note">
              <small>Phantom Wallet keeps your keys safe - we never see them!</small>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-confirm">${confirmText}</button>
            <button class="btn-cancel">Not Now</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('.btn-confirm').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(true);
      });
      modal.querySelector('.btn-cancel').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });
    });
  }

  showFriendlyInstallPrompt() {
    const modal = document.createElement('div');
    modal.className = 'modal grey-out';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3>Welcome to Token Creation! 🎉</h3>
        <p>To get started, you'll need Phantom Wallet — the secure crypto wallet for Solana. It only takes 2 minutes!</p>
        <button class="btn" id="install-btn">Install Phantom</button>
      </div>
    `;
    modal.querySelector('.close-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    modal.querySelector('#install-btn').addEventListener('click', () => {
      window.open('https://phantom.app/', '_blank');
      document.body.removeChild(modal);
    });
    document.body.appendChild(modal);
  }

  showModal(title, message, buttonText, buttonAction, extraClass = '') {
    const modal = document.createElement('div');
    modal.className = `modal ${extraClass}`;
    modal.innerHTML = `
      <div class="modal-content">
        <h3>${title}</h3>
        <p>${message}</p>
        <button class="btn">${buttonText}</button>
      </div>
    `;
    modal.querySelector('.btn').addEventListener('click', () => {
      document.body.removeChild(modal);
      buttonAction();
    });
    document.body.appendChild(modal);
  }

  showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  showFriendlyError(message) {
    this.showModal('Error', message, 'Try Again', () => location.reload(), 'error');
  }
}

// Initialize WalletConnection when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new WalletConnection();
});

// --------------------------------------------------
// Token Creation Flow (Triggered by .submit-btn)
// --------------------------------------------------
document.querySelector('.submit-btn').addEventListener('click', async () => {
  try {
    // Helper functions to get input values and checkbox states
    const getValue = id => document.getElementById(id).value;
    const getChecked = id => document.getElementById(id).checked;

    // Collect form fields including revoke authority options
    const fields = {
      tokenName: getValue('tokenName'),
      tokenSymbol: getValue('tokenSymbol'),
      decimals: getValue('decimals'),
      supply: getValue('supply'),
      description: getValue('description'),
      walletAddress: window.solana?.publicKey?.toString(),
      revokeMintAuthority: getChecked('extraFeature1'),
      revokeFreezeAuthority: getChecked('extraFeature2'),
      website: getValue('website'),
      telegram: getValue('telegram'),
      youtube: getValue('youtube'),
      image: document.getElementById('tokenImage').files[0]
    };

    // Validate required fields
    if (!fields.walletAddress) {
      showToast('Please connect your wallet to create a token.', 'error');
      return;
    }
    if (!fields.tokenName || !fields.tokenSymbol || !fields.decimals || !fields.supply || !fields.image) {
      showToast('Please fill out all required fields and upload an image.', 'error');
      return;
    }
    const decimalsNum = parseInt(fields.decimals, 10);
    if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 9) {
      showToast('Decimals must be a number between 0 and 9.', 'error');
      return;
    }
    if (!/^\d+$/.test(fields.supply)) {
      showToast('Supply must be a positive integer.', 'error');
      return;
    }

    // Update UI to show processing state
    const btn = document.querySelector('.submit-btn');
    btn.disabled = true;
    btn.textContent = 'Processing Payment...';

    // --------------------------------------------------
    // STEP 1: Payment Transfer (0.007 SOL)
    // --------------------------------------------------
    const { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = solanaWeb3;
    const transferAmount = 0.007 * LAMPORTS_PER_SOL; // Convert SOL to lamports
    const recipientPubkey = new PublicKey("JBvXi4AYZ3oiYrRusJ5JVrZhdbhysFrgtKQzF54t8yt9");
    // (Change the endpoint to devnet if testing; here we use mainnet-beta)
    const connection = new Connection('https://late-old-dust.solana-mainnet.quiknode.pro/575144cda7c67473a06629b75c286d18669c3c6c'); 

    // Build the transfer transaction
    const transferTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: window.solana.publicKey,
        toPubkey: recipientPubkey,
        lamports: transferAmount,
      })
    );
    transferTx.feePayer = window.solana.publicKey;
    transferTx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

    // Request the user's wallet to sign the transfer transaction
    const signedTx = await window.solana.signTransaction(transferTx);
    const transferSignature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(transferSignature, 'confirmed');

    showToast('Payment of 0.007 SOL successful!', 'success');

    // --------------------------------------------------
    // STEP 2: Token Creation via Pump Portal
    // --------------------------------------------------
    btn.textContent = 'Creating Token...';

    // Generate a random mint keypair
    const mintKeypair = Keypair.generate();

    // Prepare metadata upload via Pump Portal’s IPFS endpoint
    const metadataFormData = new FormData();
    metadataFormData.append("file", fields.image);
    metadataFormData.append("name", fields.tokenName);
    metadataFormData.append("symbol", fields.tokenSymbol);
    metadataFormData.append("description", fields.description);
    metadataFormData.append("decimals", fields.decimals);
    metadataFormData.append("supply", fields.supply);
    if (fields.website) metadataFormData.append("website", fields.website);
    if (fields.telegram) metadataFormData.append("telegram", fields.telegram);
    if (fields.youtube) metadataFormData.append("youtube", fields.youtube);
    metadataFormData.append("showName", "true");

    // Upload metadata (and image) to Pump Portal's IPFS endpoint
    const ipfsResponse = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: metadataFormData,
    });
    const ipfsData = await ipfsResponse.json();

    // Build token metadata using the IPFS response
    const tokenMetadata = {
      name: ipfsData.metadata.name,
      symbol: ipfsData.metadata.symbol,
      uri: ipfsData.metadataUri
    };

    // Build the payload for the token creation transaction
    const payload = {
      action: "create",
      tokenMetadata,
      mint: bs58.encode(mintKeypair.secretKey),
      denominatedInSol: "true",
      amount: 0.000001,       // Dev buy amount (adjust if necessary)
      slippage: 1,
      priorityFee: 0.000001,
      pool: "pump",
      revokeMintAuthority: fields.revokeMintAuthority,
      revokeFreezeAuthority: fields.revokeFreezeAuthority
    };

    // Replace with your actual Pump Portal API key
    const apiKey = "crr3guhf8h87jav4f5tppy9t9xbkcwb46tc3juhnf1jmeukj98w4gkan6t73gh2ecta6mgjbf1u5ekvkd8tm6k3pctnpurv9dxjn2jk26rt3cwukdhn4wgvc6wnqggbdf50n2gb784yku95p3jcuh953ppj1j61n6jrba5cddbmwgundtq54kk98db5mgb561bkjxba91vkuf8";

    const tradeResponse = await fetch(`https://pumpportal.fun/api/trade?api-key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (tradeResponse.status === 200) {
      const tradeData = await tradeResponse.json();
      showToast(`Token created successfully! Transaction: https://solscan.io/tx/${tradeData.signature}`, 'success');
      console.log("Token creation details:", tradeData);
    } else {
      const errorText = await tradeResponse.text();
      throw new Error(errorText || 'Failed to create token. Please try again.');
    }
  } catch (err) {
    showToast(err.message, 'error');
    console.error('Error:', err);
  } finally {
    const btn = document.querySelector('.submit-btn');
    btn.disabled = false;
    btn.textContent = 'Create Token';
  }
});

// --------------------------------------------------
// Global Toast Function (if not defined already)
// --------------------------------------------------
function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// --------------------------------------------------
// Image Upload Preview (Unchanged)
// --------------------------------------------------
document.getElementById('tokenImage').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const uploadContainer = document.getElementById('uploadContainer');
  const loadingSpinner = document.querySelector('.loading-spinner');
  const errorMessage = document.getElementById('errorMessage');
  const imagePreview = document.getElementById('imagePreview');

  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    errorMessage.textContent = 'File size exceeds 2MB limit';
    this.value = '';
    return;
  }

  uploadContainer.style.display = 'none';
  loadingSpinner.style.display = 'block';
  errorMessage.textContent = '';

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      if (img.width > 500 || img.height > 500) {
        errorMessage.textContent = 'Image must be maximum 500x500 pixels';
        loadingSpinner.style.display = 'none';
        uploadContainer.style.display = 'block';
        document.getElementById('tokenImage').value = '';
        return;
      }
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="Token Preview">`;
      loadingSpinner.style.display = 'none';
    };
    img.onerror = function() {
      errorMessage.textContent = 'Error loading image';
      loadingSpinner.style.display = 'none';
      uploadContainer.style.display = 'block';
      document.getElementById('tokenImage').value = '';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});
