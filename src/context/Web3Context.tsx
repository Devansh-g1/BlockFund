import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import type { MetaMaskInpageProvider } from '@metamask/providers';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import BlockFundABI from '../contracts/BlockFundABI.json';

// Define the type for the Ethereum object on window
declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

// Contract details - would be deployed to Holesky testnet
const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with actual contract address after deployment

// Types for our context
interface Web3ContextType {
  address: string | null;
  contract: ethers.Contract | null;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  connectWallet: () => Promise<void>;
  isConnected: boolean;
  isVerifiedCreator: boolean;
  loading: boolean;
  balance: string;
  chainId: number | null;
  checkIfWalletIsConnected: () => Promise<void>;
  checkIfUserIsVerified: () => Promise<void>;
}

// Create context
const Web3Context = createContext<Web3ContextType>({
  address: null,
  contract: null,
  provider: null,
  signer: null,
  connectWallet: async () => {},
  isConnected: false,
  isVerifiedCreator: false,
  loading: true,
  balance: '0',
  chainId: null,
  checkIfWalletIsConnected: async () => {},
  checkIfUserIsVerified: async () => {},
});

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isVerifiedCreator, setIsVerifiedCreator] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<string>('0');
  const [chainId, setChainId] = useState<number | null>(null);
  
  const { toast } = useToast();
  
  const connectWallet = async () => {
    try {
      // Check if user is authenticated with Supabase first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Login Required',
          description: 'Please log in before connecting your wallet',
          variant: 'destructive'
        });
        return;
      }

      if (!window.ethereum) {
        toast({
          title: 'MetaMask Not Found',
          description: 'Please install MetaMask to connect your wallet',
          variant: 'destructive'
        });
        return;
      }

      setLoading(true);

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length) {
        setAddress(accounts[0]);
        
        // Initialize ethers provider and signer
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum as any);
        setProvider(ethersProvider);
        
        const signer = ethersProvider.getSigner();
        setSigner(signer);
        
        // Initialize contract
        const blockFundContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          BlockFundABI,
          signer
        );
        
        setContract(blockFundContract);
        
        // Get chain ID
        const network = await ethersProvider.getNetwork();
        setChainId(network.chainId);
        
        // Check if connected to Holesky (chain ID 17000)
        if (network.chainId !== 17000) {
          alert('Please connect to Holesky test network');
          try {
            // Request network switch
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x4268' }], // 0x4268 is 17000 in hex
            });
          } catch (switchError: any) {
            // If the network isn't added to MetaMask
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x4268',
                    chainName: 'Holesky Testnet',
                    nativeCurrency: {
                      name: 'Holesky ETH',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: ['https://ethereum-holesky.publicnode.com'],
                    blockExplorerUrls: ['https://holesky.etherscan.io/'],
                  },
                ],
              });
            }
          }
        }
        
        // Get account balance
        const ethBalance = await ethersProvider.getBalance(accounts[0]);
        setBalance(ethers.utils.formatEther(ethBalance));
        
        setIsConnected(true);
        
        // Check if user is verified
        await checkIfUserIsVerified();
      }
    } catch (error) {
      console.error('Error connecting to MetaMask', error);
      toast({
        title: 'Wallet Connection Failed',
        description: 'An error occurred while connecting your wallet',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if wallet is connected on load
  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) {
        setLoading(false);
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      }) as string[];

      if (accounts.length) {
        setAddress(accounts[0]);
        
        // Initialize ethers provider and signer
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum as any);
        setProvider(ethersProvider);
        
        const signer = ethersProvider.getSigner();
        setSigner(signer);
        
        // Initialize contract
        const blockFundContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          BlockFundABI,
          signer
        );
        
        setContract(blockFundContract);
        
        // Get account balance
        const ethBalance = await ethersProvider.getBalance(accounts[0]);
        setBalance(ethers.utils.formatEther(ethBalance));
        
        // Get chain ID
        const network = await ethersProvider.getNetwork();
        setChainId(network.chainId);
        
        setIsConnected(true);
        
        // Check if user is verified
        await checkIfUserIsVerified();
      }
    } catch (error) {
      console.error('Error checking wallet connection', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is a verified creator
  const checkIfUserIsVerified = async () => {
    try {
      if (!contract || !address) return;
      
      const isVerified = await contract.isVerifiedCreator(address);
      setIsVerifiedCreator(isVerified);
    } catch (error) {
      console.error('Error checking verification status', error);
    }
  };

  // Set up event listeners
  useEffect(() => {
    if (window.ethereum) {
      // Handle account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          checkIfWalletIsConnected();
        } else {
          // Disconnected
          setAddress(null);
          setIsConnected(false);
          setIsVerifiedCreator(false);
        }
      });

      // Handle chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    // Check if wallet is connected on mount
    checkIfWalletIsConnected();

    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);

  return (
    <Web3Context.Provider
      value={{
        address,
        contract,
        provider,
        signer,
        connectWallet,
        isConnected,
        isVerifiedCreator,
        loading,
        balance,
        chainId,
        checkIfWalletIsConnected,
        checkIfUserIsVerified,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
