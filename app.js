const express = require('express');
const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const app = express();
app.use(express.json());
const prisma = new PrismaClient();

// create a new wallet endpoint
app.get('/create-wallet', (req, res) => {
    const wallet = ethers.Wallet.createRandom();
    const publicKey = wallet.address;
    const privateKey = wallet.privateKey;
    res.json({
        publicKey: publicKey,
        privateKey: privateKey
    });
});

// Get ETH balance endpoint
app.get('/get-balance/:address', async (req, res) => {
    const { address } = req.params;
    const provider = new ethers.providers.JsonRpcProvider("paste your infura key from infura as shown in video ");
    if (!address) {
        return res.status(400).json({ error: 'Missing address parameter' });
    }
    try {
        const balance = await provider.getBalance(address);
        const balanceInEth = ethers.utils.formatEther(balance);
        res.json({ address: address, balance: balanceInEth });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve balance', details: error.message });
    }
});

// transfer Native currency Endpoint
app.post('/transfer', async (req, res) => {
  const { privateKey,to, amount } = req.body;
  const provider = new ethers.providers.JsonRpcProvider("paste your infura key from infura as shown in video ");
  if (!privateKey || !to || !amount) {
    return res.status(400).json({ error: 'Missing "privatekey" "to" or "amount" in request body' });
  }
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const tx = {
      to: to,
      value: ethers.parseEther(amount.toString())
    };
    const txResponse = await wallet.sendTransaction(tx);
    const receipt = await txResponse.wait();
    res.status(200).json({
      transactionHash: txResponse.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transfer tokens endpoint
app.post('/transfer-token', async (req, res) => {
    const { privateKey, toAddress, amount, tokenAddress } = req.body;
    const provider = new ethers.providers.JsonRpcProvider("paste your infura key from infura as shown in video ");
    if (!privateKey || !toAddress || !amount || !tokenAddress) {
        return res.status(400).json({ error: 'Missing parameters' });
    }
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const abi = [
            "function transfer(address to, uint amount) public returns (bool)"
        ];
        const tokenContract = new ethers.Contract(tokenAddress, abi, wallet);
        const tx = await tokenContract.transfer(toAddress, ethers.utils.parseUnits(amount, 18));
        await tx.wait();
        res.json({ success: true, transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Transaction failed', details: error.message });
    }
});

// to get all tokens addresses which user hold endpoint 
app.get('/get-all-tokens/:address', async (req, res) => {
    const { address } = req.params;
    const ETHERSCAN_API_KEY = 'paste your etherscan api key as shown in video';
    try {
        const response = await axios.get(`https://api.etherscan.io/api`, {
            params: {
                module: 'account',
                action: 'tokentx',
                address: address,
                sort: 'asc',
                apiKey: ETHERSCAN_API_KEY
            }
        });
        const tokenTransfers = response.data.result;
        const tokenAddresses = [...new Set(tokenTransfers.map(tx => tx.contractAddress))];
        res.json({ tokens: tokenAddresses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// Get token balance endpoint
app.get('/get-token-balance/:address/:tokenAddress', async (req, res) => {
    const { address, tokenAddress } = req.params;
    const provider = new ethers.providers.JsonRpcProvider("paste your infura key from infura as shown in video ");
    if (!address || !tokenAddress) {
        return res.status(400).json({ error: 'Missing parameters' });
    }
    try {
        const abi = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];
        const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
        const decimals = await tokenContract.decimals();
        const balance = await tokenContract.balanceOf(address);
        res.json({ address: address, balance: ethers.utils.formatUnits(balance, decimals) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve balance', details: error.message });
    }
});

// store a transaction endpoint 
app.get('/transactions', async (req, res) => {
    const address = req.query.address;
    const startblock = req.query.startblock || 0;
    const endblock = req.query.endblock || 99999999;
    const page = req.query.page || 1;
    const offset = req.query.offset || 10;
    const sort = req.query.sort || 'asc';
    const ETHERSCAN_API_KEY = 'paste your etherscan api key as shown in video';
    const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';
    if (!address) {
        return res.status(400).json({ error: 'Address is required' });
    }
    try {
        const response = await axios.get(ETHERSCAN_BASE_URL, {
            params: {
                module: 'account',
                action: 'txlist',
                address,
                startblock,
                endblock,
                page,
                offset,
                sort,
                apikey: ETHERSCAN_API_KEY,
            },
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching transactions' });
    }
});


// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
