const express = require('express');
const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();
app.use(express.json());

// Create a new wallet endpoint
app.get('/create-wallet', async (req, res) => {
  const wallet = ethers.Wallet.createRandom();
  const publicKey = wallet.address;
  const privateKey = wallet.privateKey;
  // Store in the database
  await prisma.user.create({
    data: {
      publicAddress: publicKey,
      privateAddress: privateKey
    }
  });
  res.json({
    publicKey: publicKey,
    privateKey: privateKey
  });
});

// Get ETH balance endpoint
app.get('/get-balance/:address', async (req, res) => {
  const { address } = req.params;
  const provider = new ethers.providers.JsonRpcProvider("paste your infura key ");
  if (!address) {
    return res.status(400).json({ error: 'Missing address parameter' });
  }
  try {
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.utils.formatEther(balance);
    // Update the database
    const user = await prisma.user.findUnique({ where: { publicAddress: address } });
    if (user) {
      const existingBalance = await prisma.balance.findUnique({ where: { publicAddress: address } });
      if (existingBalance && existingBalance.balance !== balanceInEth) {
        await prisma.balance.update({ where: { publicAddress: address }, data: { balance: balanceInEth } });
      } else if (!existingBalance) {
        await prisma.balance.create({
          data: {
            publicAddress: address,
            balance: balanceInEth,
            userId: user.id
          }
        });
      }
    }
    res.json({ address: address, balance: balanceInEth });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve balance', details: error.message });
  }
});

// Transfer Native currency (ETH,BNB) Endpoint
app.post('/transfer-native', async (req, res) => {
    const { privateKey, toAddress, amount } = req.body;
    const provider = new ethers.providers.JsonRpcProvider("paste your infura key ");
    if (!privateKey || !toAddress || !amount) {
      return res.status(400).json({ error: 'Missing "privateKey", "toAddress", or "amount" in request body' });
    }
    try {
      const wallet = new ethers.Wallet(privateKey, provider);
      const tx = {
        to: toAddress,
        value: ethers.utils.parseEther(amount.toString())
      };
      const txResponse = await wallet.sendTransaction(tx);
      const receipt = await txResponse.wait();
  
      // Ensure sender exists in database
      let senderUser = await prisma.user.findUnique({ where: { publicAddress: wallet.address } });
      if (!senderUser) {
        senderUser = await prisma.user.create({
          data: {
            publicAddress: wallet.address,
            privateAddress: privateKey
          }
        });
      }
  
      // Ensure receiver exists in database
      let receiverUser = await prisma.user.findUnique({ where: { publicAddress: toAddress } });
      if (!receiverUser) {
        receiverUser = await prisma.user.create({
          data: {
            publicAddress: toAddress,
            privateAddress: ''
          }
        });
      }
  
      // Update the balance in the database for sender
      const senderBalance = await provider.getBalance(wallet.address);
      await prisma.balance.upsert({
        where: { publicAddress: wallet.address },
        update: { balance: ethers.utils.formatEther(senderBalance) },
        create: {
          publicAddress: wallet.address,
          balance: ethers.utils.formatEther(senderBalance),
          userId: senderUser.id
        }
      });
  
      // Update the balance in the database for receiver
      const receiverBalance = await provider.getBalance(toAddress);
      await prisma.balance.upsert({
        where: { publicAddress: toAddress },
        update: { balance: ethers.utils.formatEther(receiverBalance) },
        create: {
          publicAddress: toAddress,
          balance: ethers.utils.formatEther(receiverBalance),
          userId: receiverUser.id
        }
      });
  
      // Store transaction for sender
      await prisma.transaction.create({
        data: {
          publicAddress: wallet.address,
          txHash: txResponse.hash,
          userId: senderUser.id
        }
      });
  
      // Store transaction for receiver
      await prisma.transaction.create({
        data: {
          publicAddress: toAddress,
          txHash: txResponse.hash,
          userId: receiverUser.id
        }
      });
  
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
        "function transfer(address to, uint amount) public returns (bool)",
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ];
      const tokenContract = new ethers.Contract(tokenAddress, abi, wallet);
      const tx = await tokenContract.transfer(toAddress, ethers.utils.parseUnits(amount, 18));
      await tx.wait();
      const decimals = await tokenContract.decimals();
      const balance = await tokenContract.balanceOf(wallet.address);
      const formattedBalance = ethers.utils.formatUnits(balance, decimals);
      const user = await prisma.user.findUnique({ where: { publicAddress: wallet.address } });
      if (user) {
        await prisma.tokenBalance.upsert({
          where: { publicAddress_tokenAddress: { publicAddress: wallet.address, tokenAddress: tokenAddress } },
          update: { balance: formattedBalance },
          create: {
            publicAddress: wallet.address,
            tokenAddress: tokenAddress,
            balance: formattedBalance,
            userId: user.id
          }
        });
      }
  
      // Store transaction for sender
      await prisma.transaction.create({
        data: {
          publicAddress: wallet.address,
          txHash: tx.hash,
          userId: user ? user.id : null 
        }
      });
  
      // Store transaction for receiver
      const receiverUser = await prisma.user.findUnique({ where: { publicAddress: toAddress } });
      await prisma.transaction.create({
        data: {
          publicAddress: toAddress,
          txHash: tx.hash,
          userId: receiverUser ? receiverUser.id : null
        }
      });
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
    const balanceInEth = ethers.utils.formatUnits(balance, decimals);

    // Update the database
    const user = await prisma.user.findUnique({ where: { publicAddress: address } });
    if (user) {
      const existingBalance = await prisma.tokenBalance.findUnique({ where: { publicAddress_tokenAddress: { publicAddress: address, tokenAddress: tokenAddress } } });
      if (existingBalance && existingBalance.balance !== balanceInEth) {
        await prisma.tokenBalance.update({
          where: { publicAddress_tokenAddress: { publicAddress: address, tokenAddress: tokenAddress } },
          data: { balance: balanceInEth }
        });
      } else if (!existingBalance) {
        await prisma.tokenBalance.create({
          data: {
            publicAddress: address,
            tokenAddress: tokenAddress,
            balance: balanceInEth,
            userId: user.id
          }
        });
      }
    }
    res.json({ address: address, tokenAddress: tokenAddress, balance: balanceInEth });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve balance', details: error.message });
  }
});

//  get transactions by publicAddress Endpoint
app.get('/transactions/:publicAddress', async (req, res) => {
    const { publicAddress } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { publicAddress },
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
      // Fetch transactions based on user ID
      const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        select: {
          txHash: true,
          publicAddress: true,
        },
      });
      if (transactions.length === 0) {
        return res.status(404).json({ message: 'No transactions found for this public address.' });
      }
      res.json(transactions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
