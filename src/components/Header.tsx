
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWeb3 } from '@/context/Web3Context';
import { truncateAddress } from '@/utils/contractUtils';

const Header = () => {
  const { connectWallet, isConnected, address, balance, isVerifiedCreator } = useWeb3();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="container flex items-center justify-between h-16 mx-auto px-4">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-md flex items-center justify-center">
            <span className="text-white font-bold">BF</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            BlockFund
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-gray-700 hover:text-indigo-600 font-medium">
            Campaigns
          </Link>
          {isConnected && isVerifiedCreator && (
            <Link to="/create-campaign" className="text-gray-700 hover:text-indigo-600 font-medium">
              Create Campaign
            </Link>
          )}
          {isConnected && (
            <Link to="/profile" className="text-gray-700 hover:text-indigo-600 font-medium">
              Profile
            </Link>
          )}
          <Link to="/about" className="text-gray-700 hover:text-indigo-600 font-medium">
            About
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          {isConnected ? (
            <div className="flex items-center space-x-3">
              <span className="hidden md:block text-sm font-medium text-gray-600">
                {parseFloat(balance).toFixed(4)} ETH
              </span>
              <Button variant="outline" size="sm" className="hidden sm:flex">
                {truncateAddress(address || '')}
              </Button>
              {isVerifiedCreator && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Verified
                </span>
              )}
            </div>
          ) : (
            <Button onClick={connectWallet} variant="default" className="bg-indigo-600 hover:bg-indigo-700">
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
