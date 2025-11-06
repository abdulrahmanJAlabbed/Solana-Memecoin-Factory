// Import required objects from solanaWeb3 (assumes you're using a CDN like Skypack)
const { 
  Keypair, 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL 
} = solanaWeb3;

// (Ensure bs58 is imported as well, e.g. via CDN)
// import bs58 from "https://cdn.skypack.dev/bs58";

document.querySelector('.submit-btn').addEventListener('click', async () => {
  try {
    // Helper functions to get input values and checkbox states (as booleans)
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
      showToast('Please fill out all the required fields and upload an image.', 'error');
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

    // Update UI to show loading state
    const btn = document.querySelector('.submit-btn');
    btn.disabled = true;
    btn.textContent = 'Processing Payment...';

    // === STEP 1: Transfer 0.007 SOL to our wallet ===
    const transferAmount = 0.007 * LAMPORTS_PER_SOL; // convert SOL to lamports
    const recipientPubkey = new PublicKey("JBvXi4AYZ3oiYrRusJ5JVrZhdbhysFrgtKQzF54t8yt9");
    const connection = new Connection('https://late-old-dust.solana-mainnet.quiknode.pro/575144cda7c67473a06629b75c286d18669c3c6c'); // change to devnet if needed

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

    // Request the user's wallet to sign the transaction
    const signedTx = await window.solana.signTransaction(transferTx);
    const transferSignature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(transferSignature, 'confirmed');

    showToast('Payment of 0.007 SOL successful!', 'success');

    // === STEP 2: Proceed with Pump Portal token creation ===
    btn.textContent = 'Creating Token...';

    // Generate a random mint keypair for the token
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

    // Build the payload for the token creation transaction, including the revoke authority flags
    const payload = {
      action: "create",
      tokenMetadata,
      mint: bs58.encode(mintKeypair.secretKey),
      denominatedInSol: "true",
      amount: 0.000001,  // This is the dev buy amount for Pump Portal fees (adjust as needed)
      slippage: 1,
      priorityFee: 0.000001,
      pool: "pump",
      revokeMintAuthority: fields.revokeMintAuthority,
      revokeFreezeAuthority: fields.revokeFreezeAuthority
    };

    // Replace with your actual Pump Portal API key
    const apiKey = "crr3guhf8h87jav4f5tppy9t9xbkcwb46tc3juhnf1jmeukj98w4gkan6t73gh2ecta6mgjbf1u5ekvkd8tm6k3pctnpurv9dxjn2jk26rt3cwukdhn4wgvc6wnqggbdf50n2gb784yku95p3jcuh953ppj1j61n6jrba5cddbmwgundtq54kk98db5mgb561bkjxba91vkuf8";

    // Send the token creation request directly to Pump Portal
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
    // Reset button state
    const btn = document.querySelector('.submit-btn');
    btn.disabled = false;
    btn.textContent = 'Create Token';
  }
});

// Show toast notifications
function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Image upload preview (unchanged)
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
