const express = require('express');
const { ethers } = require('ethers');
const app = express();
app.use(express.json());

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
    const provider = new ethers.providers.JsonRpcProvider("paste your infura key  ");
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
app.post('/transfer-native', async (req, res) => {
  const { privateKey,toAddress, amount } = req.body;
  const provider = new ethers.providers.JsonRpcProvider("paste your infura key ");
  if (!privateKey || !toAddress || !amount) {
    return res.status(400).json({ error: 'Missing "privatekey" "toAddress" or "amount" in request body' });
  }
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const tx = {
      to: toAddress,
      value: ethers.utils.parseEther(amount.toString())
    };
    const txResponse = await wallet.sendTransaction(tx);
    const receipt = await txResponse.wait();
    res.status(200).json({
      success: true,
      transactionHash: txResponse.hash,
      receipt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transfer tokens endpoint
app.post('/transfer-token', async (req, res) => {
    const { privateKey, toAddress, amount, tokenAddress } = req.body;
    const provider = new ethers.providers.JsonRpcProvider("paste your infura key ");
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

// Get token balance endpoint
app.get('/get-token-balance/:address/:tokenAddress', async (req, res) => {
    const { address, tokenAddress } = req.params;
    const provider = new ethers.providers.JsonRpcProvider("paste your infura key ");
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

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
