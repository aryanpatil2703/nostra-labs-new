import React, { useState, useEffect } from 'react';
import { ethers, formatEther, parseUnits, getBigInt } from 'ethers';
import { Button } from '@/components/ui/button';
import { 
  StakingContractAddress, 
  StakingContractABI, 
  NostraTokenAddress, 
  NostraTokenABI 
} from './address-abi';

export default function StakeUnstake() {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<ethers.BigNumberish>(BigInt(0));
  const [availableStakes, setAvailableStakes] = useState<ethers.BigNumberish>(BigInt(0));
  const [allowance, setAllowance] = useState<ethers.BigNumberish>(BigInt(0));
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [stakeAmount, setStakeAmount] = useState(''); // User input for stake amount

  // Initialize the ethers provider (assumes a wallet extension is installed)
  const provider = new ethers.BrowserProvider(window.ethereum);

  // Check for wallet connection and set userAddress.
  useEffect(() => {
    async function checkConnection() {
      if (window.ethereum) {
        const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setUserAddress(accounts[0]);
        } else {
          setUserAddress(null);
        }
      }
    }
    checkConnection();
  }, []);

  // Fetch token balance, staking info, and allowance from the contracts.
  async function fetchBalances() {
    if (!userAddress) return;
    try {
      const signer = await provider.getSigner();
      
      // Token contract: get balance and allowance
      const tokenContract = new ethers.Contract(NostraTokenAddress, NostraTokenABI, signer);
      const balance = await tokenContract.balanceOf(userAddress);
      setTokenBalance(balance);
      
      // Fetch allowance for the staking contract.
      const approved = await tokenContract.allowance(userAddress, StakingContractAddress);
      setAllowance(approved);

      // Staking contract: get player's available stakes.
      const stakingContract = new ethers.Contract(StakingContractAddress, StakingContractABI, signer);
      const playerData = await stakingContract.players(userAddress);
      setAvailableStakes(playerData.availableStakes);
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }

  useEffect(() => {
    if (userAddress) {
      fetchBalances();
    }
  }, [userAddress, isStaking, isUnstaking]);

  // handleApprove: Approve the staking contract to spend a user-specified amount of tokens.
  async function handleApprove() {
    if (!userAddress) return;
    if (!stakeAmount || Number(stakeAmount) <= 0) {
      alert("Please enter a valid amount to approve.");
      return;
    }
    // Convert the stake amount (assumed in token units) to wei (18 decimals).
    const amountToApprove = parseUnits(stakeAmount, 18);
    try {
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(NostraTokenAddress, NostraTokenABI, signer);
      const tx = await tokenContract.approve(StakingContractAddress, amountToApprove);
      await tx.wait();
      alert("Approval successful! You can now stake tokens.");
      fetchBalances();
    } catch (error) {
      console.error("Approval failed:", error);
      alert("Approval failed. Check the console for details.");
    }
  }

  // handleStake: Stakes the user-specified amount of tokens.
  async function handleStake() {
    if (!userAddress) return;
    if (!stakeAmount || Number(stakeAmount) <= 0) {
      alert("Please enter a valid amount to stake.");
      return;
    }
    const amountToStake = parseUnits(stakeAmount, 18);
    if (getBigInt(tokenBalance) < getBigInt(amountToStake)) {
      alert("Insufficient token balance to stake that amount.");
      return;
    }
    // Check if allowance is sufficient.
    if (getBigInt(allowance) < getBigInt(amountToStake)) {
      alert("Please approve the staking contract to spend your tokens first.");
      return;
    }
    setIsStaking(true);
    try {
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(StakingContractAddress, StakingContractABI, signer);
      const tx = await stakingContract.stake(amountToStake);
      await tx.wait();
      alert("Staking successful!");
      setStakeAmount(''); // Clear input after staking
    } catch (error) {
      console.error("Staking failed:", error);
      alert("Staking failed. Check the console for details.");
    } finally {
      setIsStaking(false);
      fetchBalances();
    }
  }

  // handleUnstake: Unstakes tokens by calling the unstake() function.
  async function handleUnstake() {
    if (!userAddress) return;
    if (getBigInt(availableStakes) === BigInt(0)) {
      alert("No tokens available to unstake.");
      return;
    }
    setIsUnstaking(true);
    try {
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(StakingContractAddress, StakingContractABI, signer);
      const tx = await stakingContract.unstake(availableStakes);
      await tx.wait();
      alert("Unstaking successful!");
    } catch (error) {
      console.error("Unstaking failed:", error);
      alert("Unstaking failed. Check the console for details.");
    } finally {
      setIsUnstaking(false);
      fetchBalances();
    }
  }

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center rounded-lg border border-gray bg-pink-300 text-black gap-5 p-4">
      <h2 className="text-2xl font-bold">Stake / Unstake Tokens</h2>
      {userAddress ? (
        <>
            <div className='text-lg p-2 rounded-lg bg-violet-300'>
               
                <p className="">
                    Token Balance: {formatEther(tokenBalance)} NST
                </p>
                <p className="">
                    Available to Unstake: {formatEther(availableStakes)} NST
                </p>
            </div>

          {/* Input field for user to enter stake amount */}
          <div className="mt-2 text-white">
            <input
              type="number"
              placeholder="Enter amount to stake"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="border p-2 rounded-lg text-xl"
            />
          </div>

          {/* Approve, Stake, and Unstake Buttons */}
          <div className="flex gap-4 mt-4">
            <Button
              onClick={handleApprove}
              disabled={isStaking}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2"
            >
              Approve
            </Button>
            <Button
              onClick={handleStake}
              disabled={isStaking || getBigInt(tokenBalance) === BigInt(0)}
              className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2"
            >
              {isStaking ? "Staking..." : "Stake"}
            </Button>
            <Button
              onClick={handleUnstake}
              disabled={isUnstaking || getBigInt(availableStakes) === BigInt(0)}
              className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2"
            >
              {isUnstaking ? "Unstaking..." : "Unstake"}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-lg">Please connect your wallet.</p>
      )}
    </div>
  );
}
