const express = require('express');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const bodyParser = require('body-parser');
require('dotenv').config();
const bs58 = require('bs58');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const BN = require('bn.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js'); // For metadata

const app = express();
app.use(bodyParser.json());

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Configure Multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Solana connection
const connection = new Connection(
  'https://late-old-dust.solana-mainnet.quiknode.pro/575144cda7c67473a06629b75c286d18669c3c6c',
  'confirmed'
);

// Keypair
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SECRET_KEY));

// Metaplex setup
const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));

app.post('/create-coin', upload.single('image'), async (req, res) => {
  try {
    // Input validation
    const requiredFields = ['tokenName', 'tokenSymbol', 'decimals', 'supply', 'walletAddress'];
    for (const field of requiredFields) {
      if (!req.body[field]) throw new Error(`${field} is required`);
    }

    const { 
      tokenName,
      tokenSymbol,
      decimals,
      supply,
      description,
      walletAddress,
      website,
      x,
      telegram,
      youtube,
      revokeMintAuthority,
      revokeFreezeAuthority
    } = req.body;

    // Validate wallet address
    try {
      new PublicKey(walletAddress);
    } catch {
      throw new Error('Invalid wallet address');
    }

    // Validate decimals
    const decimalsNum = parseInt(decimals, 10);
    if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 9) {
      throw new Error('Decimals must be between 0 and 9');
    }

    // Validate supply
    if (!/^\d+$/.test(supply)) throw new Error('Supply must be a positive integer');
    const supplyBN = new BN(supply);
    const amountToMint = supplyBN.mul(new BN(10).pow(new BN(decimalsNum)));

    // Create token mint
    const mint = await Token.createMint(
      connection,
      payer,
      payer.publicKey, // Initial mint authority
      payer.publicKey, // Initial freeze authority
      decimalsNum,
      TOKEN_PROGRAM_ID
    );

    // Create associated token account
    const userPublicKey = new PublicKey(walletAddress);
    const userTokenAccount = await mint.getOrCreateAssociatedAccountInfo(userPublicKey);

    // Mint tokens
    await mint.mintTo(
      userTokenAccount.address,
      payer,
      [],
      amountToMint
    );

    // Revoke authorities if requested
    if (revokeMintAuthority === 'true') {
      await mint.setAuthority(
        mint.publicKey,
        null,
        'MintTokens',
        payer,
        []
      );
    }

    if (revokeFreezeAuthority === 'true') {
      await mint.setAuthority(
        mint.publicKey,
        null,
        'FreezeAccount',
        payer,
        []
      );
    }

    // Create metadata using Metaplex
    const metadataUri = await metaplex
      .nfts()
      .uploadMetadata({
        name: tokenName,
        symbol: tokenSymbol,
        description,
        image: req.file ? `http://localhost:3001/uploads/${req.file.filename}` : null,
        properties: {
          website,
          x,
          telegram,
          youtube
        }
      });

    await metaplex
      .nfts()
      .create({
        uri: metadataUri,
        name: tokenName,
        symbol: tokenSymbol,
        sellerFeeBasisPoints: 0, // No royalties
        creators: [{ address: payer.publicKey, share: 100 }],
        isMutable: false
      }, { mint });

    res.json({
      success: true,
      tokenId: mint.publicKey.toString(),
      details: {
        tokenName,
        tokenSymbol,
        decimals: decimalsNum,
        totalSupply: supply,
        description,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        socials: { website, x, telegram, youtube }
      }
    });

  } catch (err) {
    console.error('Error creating token:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

app.use('/uploads', express.static('uploads'));

app.listen(3001, () => console.log('Server running on port 3001'));